import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useSubjectsLookup } from "@/modules/shared/api/subjects";
import { computeGpa } from "@/lib/config";
import type { MyExamResults } from "@/modules/student/api/examResults";

export type { MyExamResults, ExamResultGroup, ExamResultSubject } from "@/modules/student/api/examResults";

/** GET /me/children/:id/performance?semester=N — semester is required, 1 through 8. */
export function useChildPerformance(childId: number | null, semester: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "performance", semester],
    queryFn: () => apiClient.get<MyExamResults>(`/me/children/${childId}/performance`, { semester: semester ?? undefined }),
    enabled: childId !== null && semester !== null,
  });
}

/** Same client-side CGPA aggregation as the student's own useMyCgpa — see that hook's doc comment for why there's no backend CGPA endpoint to call instead. */
export function useChildCgpa(childId: number | null, uptoSemester: number | null) {
  const semesters = useMemo(
    () => (uptoSemester ? Array.from({ length: uptoSemester }, (_, i) => i + 1) : []),
    [uptoSemester],
  );
  const subjectsLookup = useSubjectsLookup();

  const results = useQueries({
    queries: semesters.map((sem) => ({
      queryKey: ["me", "children", childId, "performance", sem],
      queryFn: () => apiClient.get<MyExamResults>(`/me/children/${childId}/performance`, { semester: sem }),
      enabled: childId !== null,
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
