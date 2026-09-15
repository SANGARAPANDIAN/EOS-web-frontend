import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/exam-timetable/exam-timetable-versions.* — real
// exam_timetable_versions rows (draft/ready_to_publish/published/superseded/
// withdrawn), previously created but never surfaced anywhere in the UI.

export type TimetableVersionStatus = "draft" | "ready_to_publish" | "published" | "superseded" | "withdrawn";

export interface TimetableVersion {
  id: number;
  exam_id: number;
  version_number: number;
  status: TimetableVersionStatus;
  created_at: string;
  published_at: string | null;
  withdrawn_at: string | null;
  cloned_from_version_id: number | null;
  paper_count: number;
  exam: {
    academic_year: string;
    semester: number;
    exam_category: string | null;
    exam_type_id: number;
    exam_type_name: string;
    department_codes: string[];
  };
}

export interface TimetableVersionScheduleRow {
  date: string;
  session: "FN" | "AN";
  subject_code: string;
  subject_name: string;
  department_code: string;
  hall: string | null;
}

export function useExamTimetableVersions(examId?: number | null) {
  return useQuery({
    queryKey: ["coe", "exam-timetable-versions", examId ?? null],
    queryFn: () => apiClient.get<TimetableVersion[]>("/exam-timetable-versions", { exam_id: examId ?? undefined }),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["coe", "exam-timetable-versions"] });
}

export function useMoveTimetableToDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examId: number) => apiClient.post<TimetableVersion>("/exam-timetable-versions/move-to-draft", { exam_id: examId }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function usePublishTimetableVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: number) => apiClient.post<TimetableVersion>(`/exam-timetable-versions/${versionId}/publish`),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useWithdrawTimetableVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: number) => apiClient.post<TimetableVersion>(`/exam-timetable-versions/${versionId}/withdraw`),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteTimetableVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: number) => apiClient.delete(`/exam-timetable-versions/${versionId}`),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useTimetableVersionSchedule(versionId: number | null) {
  return useQuery({
    queryKey: ["coe", "exam-timetable-version-schedule", versionId],
    queryFn: () => apiClient.get<TimetableVersionScheduleRow[]>(`/exam-timetable-versions/${versionId}/schedule`),
    enabled: versionId != null,
  });
}
