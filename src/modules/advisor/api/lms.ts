import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/lms/lms.{controller,service}.ts, all under
// @Controller('me/lms'), faculty-facing methods gated @Roles(FACULTY, HOD).
// These endpoints exist for real and were previously unused — the Current
// Semester screen's Material/Task/Lesson-plan tabs used to render entirely
// fabricated sample content instead of calling them.

export interface LmsFolder {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  resource_count: number;
  classes: { class_id: number; label: string }[];
}

/** GET /me/lms/my-subjects/:subjectId/folders */
export function useFacultyFolders(subjectId: number | undefined) {
  return useQuery({
    queryKey: ["me", "lms", "folders", subjectId],
    queryFn: () => apiClient.get<LmsFolder[]>(`/me/lms/my-subjects/${subjectId}/folders`),
    enabled: Boolean(subjectId),
  });
}

/** POST /me/lms/folders */
export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { subject_id: number; title: string; description?: string; class_ids: number[] }) =>
      apiClient.post<{ id: number }>("/me/lms/folders", input),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ["me", "lms", "folders", vars.subject_id] }),
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

/** GET /me/lms/folders/:folderId/resources */
export function useFolderResources(folderId: number | undefined) {
  return useQuery({
    queryKey: ["me", "lms", "folders", folderId, "resources"],
    queryFn: () => apiClient.get<LmsResource[]>(`/me/lms/folders/${folderId}/resources`),
    enabled: Boolean(folderId),
  });
}

/** POST /me/lms/folders/:id/resources/file — multipart (title/description
 * as form fields alongside the file). */
export function useAddFileResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, title, description, file }: { folderId: number; title: string; description?: string; file: File }) => {
      const form = new FormData();
      form.append("title", title);
      if (description) form.append("description", description);
      form.append("file", file);
      return apiClient.postForm<{ id: number; file_url: string }>(`/me/lms/folders/${folderId}/resources/file`, form);
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ["me", "lms", "folders", vars.folderId, "resources"] }),
  });
}

/** POST /me/lms/folders/:id/resources/link */
export function useAddLinkResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, ...input }: { folderId: number; title: string; description?: string; link_url: string }) =>
      apiClient.post<{ id: number }>(`/me/lms/folders/${folderId}/resources/link`, input),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ["me", "lms", "folders", vars.folderId, "resources"] }),
  });
}

export interface LmsTask {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  max_marks: number | null;
  task_type: string;
  class_label: string;
  submitted_count: number;
}

/** GET /me/lms/my-subjects/:subjectId/tasks?class_id= */
export function useFacultyTasks(subjectId: number | undefined, classId?: number) {
  return useQuery({
    queryKey: ["me", "lms", "tasks", subjectId, classId],
    queryFn: () => apiClient.get<LmsTask[]>(`/me/lms/my-subjects/${subjectId}/tasks`, { class_id: classId }),
    enabled: Boolean(subjectId),
  });
}

/** POST /me/lms/tasks */
export function useCreateLmsTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { subject_id: number; class_ids: number[]; title: string; description?: string; due_date?: string; max_marks?: number; task_type: string }) =>
      apiClient.post<{ id: number }[]>("/me/lms/tasks", input),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ["me", "lms", "tasks", vars.subject_id] }),
  });
}

export interface LmsTaskSubmission {
  student_id: number;
  student_id_no: string;
  name: string;
  status_id: number | null;
  is_submitted: boolean;
  submission_file_url: string | null;
  submitted_at: string | null;
  marks_obtained: number | null;
}

/** GET /me/lms/tasks/:id/submissions */
export function useTaskSubmissions(taskId: number | undefined) {
  return useQuery({
    queryKey: ["me", "lms", "tasks", taskId, "submissions"],
    queryFn: () => apiClient.get<LmsTaskSubmission[]>(`/me/lms/tasks/${taskId}/submissions`),
    enabled: Boolean(taskId),
  });
}

export interface LmsLessonSession {
  id: number;
  session_date: string;
  unit_title: string | null;
  topic: string;
  is_covered: boolean;
}

/** GET /me/lms/my-subjects/:subjectId/lesson-plan?class_id= */
export function useFacultyLessonPlan(subjectId: number | undefined, classId: number | undefined) {
  return useQuery({
    queryKey: ["me", "lms", "lesson-plan", subjectId, classId],
    queryFn: () => apiClient.get<{ sessions: LmsLessonSession[] }>(`/me/lms/my-subjects/${subjectId}/lesson-plan`, { class_id: classId }),
    enabled: Boolean(subjectId && classId),
  });
}

/** POST /me/lms/lesson-plan/sessions */
export function useCreateLessonSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { subject_id: number; class_id: number; session_date: string; unit_title?: string; topic: string }) =>
      apiClient.post<{ id: number }>("/me/lms/lesson-plan/sessions", input),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ["me", "lms", "lesson-plan", vars.subject_id, vars.class_id] }),
  });
}
