import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { LmsSubject, LmsTask } from "@/modules/student/api/lms";

export type { LmsSubject, LmsTask } from "@/modules/student/api/lms";

/** GET /me/children/:id/lms/subjects */
export function useChildLmsSubjects(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "lms", "subjects"],
    queryFn: () => apiClient.get<LmsSubject[]>(`/me/children/${childId}/lms/subjects`),
    enabled: childId !== null,
  });
}

/** GET /me/children/:id/lms/subjects/:subjectId/tasks — read-only, no submit. */
export function useChildLmsTasks(childId: number | null, subjectId: number) {
  return useQuery({
    queryKey: ["me", "children", childId, "lms", "subjects", subjectId, "tasks"],
    queryFn: () => apiClient.get<LmsTask[]>(`/me/children/${childId}/lms/subjects/${subjectId}/tasks`),
    enabled: childId !== null,
  });
}

export interface PendingLmsTask extends LmsTask {
  subject_id: number;
  subject_name: string;
  subject_code: string;
}

/**
 * Same "every enrolled subject, flattened, not-yet-submitted" aggregation as
 * the student's own usePendingLmsTasks — used by the parent dashboard's
 * "Upcoming" widget, not exposed as its own page (subject counts are small,
 * ~6-8, so N parallel per-subject requests is the same acceptable pattern
 * the student dashboard already uses).
 */
export function useChildPendingLmsTasks(childId: number | null) {
  const subjects = useChildLmsSubjects(childId);
  const subjectList = useMemo(() => subjects.data ?? [], [subjects.data]);

  const results = useQueries({
    queries: subjectList.map((s) => ({
      queryKey: ["me", "children", childId, "lms", "subjects", s.subject_id, "tasks"],
      queryFn: () => apiClient.get<LmsTask[]>(`/me/children/${childId}/lms/subjects/${s.subject_id}/tasks`),
      enabled: childId !== null,
    })),
  });

  const isLoading = subjects.isLoading || results.some((r) => r.isLoading);

  const pending = useMemo(() => {
    const tasks: PendingLmsTask[] = [];
    results.forEach((r, i) => {
      const subject = subjectList[i];
      for (const task of r.data ?? []) {
        if (!task.is_submitted) {
          tasks.push({ ...task, subject_id: subject.subject_id, subject_name: subject.subject_name, subject_code: subject.subject_code });
        }
      }
    });
    return tasks.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  }, [results, subjectList]);

  return { pending, isLoading };
}
