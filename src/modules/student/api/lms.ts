import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface LmsSubject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  credits: number | null;
  hours: number | null;
  faculty_name: string | null;
}

/** GET /me/lms/subjects */
export function useMyLmsSubjects() {
  return useQuery({
    queryKey: ["me", "lms", "subjects"],
    queryFn: () => apiClient.get<LmsSubject[]>("/me/lms/subjects"),
  });
}

export interface LmsFolder {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  faculty_name: string;
  resource_count: number;
}

/** GET /me/lms/subjects/:subjectId/folders */
export function useLmsFolders(subjectId: number) {
  return useQuery({
    queryKey: ["me", "lms", "subjects", subjectId, "folders"],
    queryFn: () => apiClient.get<LmsFolder[]>(`/me/lms/subjects/${subjectId}/folders`),
  });
}

export interface LmsResource {
  id: number;
  title: string;
  description: string | null;
  resource_type: "file" | "link";
  file_url: string | null;
  link_url: string | null;
  created_at: string;
}

/** GET /me/lms/folders/:folderId/resources — only fetched once a folder is expanded. */
export function useFolderResources(folderId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["me", "lms", "folders", folderId, "resources"],
    queryFn: () => apiClient.get<LmsResource[]>(`/me/lms/folders/${folderId}/resources`),
    enabled,
  });
}

export interface LmsTask {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  max_marks: number | null;
  task_type: "assignment" | "quiz";
  attachment_url: string | null;
  is_submitted: boolean;
  submission_file_url: string | null;
  submitted_at: string | null;
  marks_obtained: number | null;
}

/** GET /me/lms/subjects/:subjectId/tasks */
export function useLmsTasks(subjectId: number) {
  return useQuery({
    queryKey: ["me", "lms", "subjects", subjectId, "tasks"],
    queryFn: () => apiClient.get<LmsTask[]>(`/me/lms/subjects/${subjectId}/tasks`),
  });
}

/** POST /me/lms/tasks/:taskId/submit — multipart field name must be "file". */
export function useSubmitLmsTask(subjectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: number; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return apiClient.postForm<{ submission_file_url: string }>(`/me/lms/tasks/${taskId}/submit`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "lms", "subjects", subjectId, "tasks"] });
    },
  });
}

export interface LessonPlanSession {
  id: number;
  session_date: string;
  unit_title: string;
  topic: string;
  is_covered: boolean;
}

/** GET /me/lms/subjects/:subjectId/lesson-plan */
export function useLmsLessonPlan(subjectId: number) {
  return useQuery({
    queryKey: ["me", "lms", "subjects", subjectId, "lesson-plan"],
    queryFn: () => apiClient.get<{ sessions: LessonPlanSession[] }>(`/me/lms/subjects/${subjectId}/lesson-plan`),
  });
}

export interface PendingLmsTask extends LmsTask {
  subject_id: number;
  subject_name: string;
  subject_code: string;
}

/**
 * There's no single "all my pending assignments" endpoint — /me/lms/subjects/:id/tasks
 * is per-subject. This fetches tasks for every enrolled subject in parallel
 * (subject counts are small, ~6-8) and flattens the not-yet-submitted ones,
 * sorted by due date, for the dashboard's "Needs attention"/"Upcoming" widgets.
 */
export function usePendingLmsTasks() {
  const subjects = useMyLmsSubjects();
  const subjectList = useMemo(() => subjects.data ?? [], [subjects.data]);

  const results = useQueries({
    queries: subjectList.map((s) => ({
      queryKey: ["me", "lms", "subjects", s.subject_id, "tasks"],
      queryFn: () => apiClient.get<LmsTask[]>(`/me/lms/subjects/${s.subject_id}/tasks`),
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
