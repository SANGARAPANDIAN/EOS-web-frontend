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

export interface MyGpaRow {
  semester: number;
  total_credits: number;
  sgpa: number;
  cumulative_credits: number;
  cgpa: number;
  is_provisional: boolean;
  computed_at: string;
}

/**
 * GET /me/gpa — this student's own stored per-semester SGPA/CGPA
 * (`student_semester_gpa`, kept current by `GpaRecomputeService` on every
 * result publish/revaluation — see EOSbackend1 docs/gpa_implementation_plan.md).
 * Real backend-computed values, not a client-side recomputation. Returns an
 * empty array (not an error) for a student who hasn't been backfilled yet —
 * `useMyCgpa` below falls back to client-side computation in that case.
 */
export function useMyGpa() {
  return useQuery({
    queryKey: ["me", "gpa"],
    queryFn: () => apiClient.get<MyGpaRow[]>("/me/gpa"),
  });
}

/**
 * Prefers the backend's own stored SGPA/CGPA (via useMyGpa) whenever the
 * CURRENT semester (uptoSemester) has a stored row — the common case once a
 * student's results have been backfilled or published/revalued under the
 * GpaRecomputeService pipeline. Falls back to the older client-side
 * computation (aggregating every semester's END-SEMESTER exam result,
 * credit-weighted, same grading scale as the Performance page) only for a
 * student who hasn't been backfilled yet and has no stored row for their
 * current semester — this keeps the page working exactly as before for
 * anyone the one-time backfill script hasn't reached yet.
 */
export function useMyCgpa(uptoSemester: number | null) {
  const storedGpa = useMyGpa();
  const storedBySemester = useMemo(() => {
    const map = new Map<number, MyGpaRow>();
    for (const row of storedGpa.data ?? []) map.set(row.semester, row);
    return map;
  }, [storedGpa.data]);

  // Only fetch the older, client-computed fallback for semesters the stored
  // table doesn't cover yet — once storedGpa has loaded and a semester has a
  // row, there's no need to also pull its raw exam-results just to recompute
  // a number the backend already computed correctly.
  const semesters = useMemo(() => {
    if (!uptoSemester || storedGpa.isLoading) return [];
    return Array.from({ length: uptoSemester }, (_, i) => i + 1).filter(
      (sem) => !storedBySemester.has(sem),
    );
  }, [uptoSemester, storedGpa.isLoading, storedBySemester]);
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

  const isLoading =
    storedGpa.isLoading ||
    results.some((r) => r.isLoading) ||
    (semesters.length > 0 && subjectsLookup.isLoading);

  const fallbackPerSemesterGpa = useMemo(() => {
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
      .filter((s): s is { semester: number; gpa: number } => s.gpa !== null);
  }, [results, creditsById]);

  const perSemesterGpa = useMemo(() => {
    if (!uptoSemester) return [];
    const bySemester = new Map<number, number>();
    for (const [sem, row] of storedBySemester) {
      if (sem <= uptoSemester) bySemester.set(sem, row.sgpa);
    }
    for (const s of fallbackPerSemesterGpa) {
      if (!bySemester.has(s.semester)) bySemester.set(s.semester, s.gpa);
    }
    return [...bySemester.entries()]
      .sort(([a], [b]) => a - b)
      .map(([semester, gpa]) => ({ semester, gpa }));
  }, [uptoSemester, storedBySemester, fallbackPerSemesterGpa]);

  const cgpa = useMemo(() => {
    // The stored row for the CURRENT semester already IS the running CGPA
    // through that point — trust it directly rather than re-deriving from a
    // mix of stored and client-computed semesters, which would risk
    // double-counting or drifting from GpaRecomputeService's own arithmetic.
    const currentStoredRow = uptoSemester != null ? storedBySemester.get(uptoSemester) : undefined;
    if (currentStoredRow) return currentStoredRow.cgpa;

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
  }, [uptoSemester, storedBySemester, results, creditsById]);

  const latest = perSemesterGpa.at(-1) ?? null;
  const previous = perSemesterGpa.length > 1 ? perSemesterGpa.at(-2) ?? null : null;

  return { cgpa, latest, previous, isLoading };
}
