import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useSubjectsLookup } from "@/modules/shared/api/subjects";
import { computeGpa } from "@/lib/config";

export interface ExamResultSubject {
  subject_id: number;
  code: string;
  name: string;
  max: number;
  scored: number;
  faculty: { id: number; first_name: string; last_name: string } | null;
}

export interface ExamResultGroup {
  exam_id: number;
  number: number;
  title: string;
  marks_obtained: number;
  marks_total: number;
  subjects: ExamResultSubject[];
}

export interface MyExamResults {
  semester: number;
  internals: ExamResultGroup[];
  semester_exam: ExamResultGroup | null;
}

/** GET /me/exam-results?semester=N — semester is required, 1 through 8. */
export function useMyExamResults(semester: number | null) {
  return useQuery({
    queryKey: ["me", "exam-results", semester],
    queryFn: () => apiClient.get<MyExamResults>("/me/exam-results", { semester: semester ?? undefined }),
    enabled: semester !== null,
  });
}

/**
 * CGPA has no backend endpoint anywhere (there's no grade/GPA computation
 * in the API at all — see Performance page). This aggregates every
 * semester's END-SEMESTER exam result (1..uptoSemester) client-side, using
 * the same Anna-University grading scale as the Performance page, credit-
 * weighted across the flattened subject list from every semester (not an
 * average of per-semester GPAs, which would wrongly equal-weight semesters
 * with different credit loads). Internals are intentionally excluded —
 * CGPA is conventionally computed from final results only.
 */
export function useMyCgpa(uptoSemester: number | null) {
  const semesters = useMemo(
    () => (uptoSemester ? Array.from({ length: uptoSemester }, (_, i) => i + 1) : []),
    [uptoSemester],
  );
  const subjectsLookup = useSubjectsLookup();

  const results = useQueries({
    queries: semesters.map((sem) => ({
      queryKey: ["me", "exam-results", sem],
      queryFn: () => apiClient.get<MyExamResults>("/me/exam-results", { semester: sem }),
    })),
  });

  const creditsById = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const s of subjectsLookup.data ?? []) map.set(s.id, s.credits);
    return map;
  }, [subjectsLookup.data]);

  const isLoading = results.some((r) => r.isLoading) || subjectsLookup.isLoading;

  const perSemesterGpa = useMemo(() => {
    return results
      .map((r) => r.data)
      .filter((d): d is MyExamResults => d != null && d.semester_exam != null)
      .map((d) => ({
        semester: d.semester,
        gpa: computeGpa(
          d.semester_exam!.subjects.map((s) => ({
            percentage: (s.scored / s.max) * 100,
            credits: creditsById.get(s.subject_id),
          })),
        ),
      }))
      .filter((s) => s.gpa !== null);
  }, [results, creditsById]);

  const cgpa = useMemo(() => {
    const allSubjects = results
      .map((r) => r.data)
      .filter((d): d is MyExamResults => d != null && d.semester_exam != null)
      .flatMap((d) =>
        d.semester_exam!.subjects.map((s) => ({
          percentage: (s.scored / s.max) * 100,
          credits: creditsById.get(s.subject_id),
        })),
      );
    return computeGpa(allSubjects);
  }, [results, creditsById]);

  const latest = perSemesterGpa.at(-1) ?? null;
  const previous = perSemesterGpa.length > 1 ? perSemesterGpa.at(-2) ?? null : null;

  return { cgpa, latest, previous, isLoading };
}
