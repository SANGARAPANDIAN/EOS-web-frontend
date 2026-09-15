import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/pass-board/ — new, coe-only. New pass_board_sheets/
// pass_board_course_grace/pass_board_signoffs tables (query.md).

export interface PassBoardCourse {
  exam_subject_mapping_id: number;
  subject: { id: number; name: string; subject_code: string };
  department: { id: number; code: string; name: string } | null;
  appeared: number;
  pass_pct_before: number;
  pass_pct_after: number;
  moved: number;
  grace_marks: number;
  board_note: string | null;
}

export interface PassBoardSignoff {
  id: number;
  member_name: string;
  member_role: string;
  status: "awaiting" | "signed";
  signed_at: string | null;
}

export interface PassBoardDetail {
  sheet: { id: number; exam_id: number; phase: string; status: "draft" | "frozen"; meeting_at: string | null };
  exam_type_name: string | null;
  exam_title: string | null;
  grace_ceiling: number;
  courses: PassBoardCourse[];
  signoffs: PassBoardSignoff[];
  overall_appeared: number;
  overall_pass_pct_before: number;
  departments_represented: string[];
  courses_graced_count: number;
}

export function usePassBoardSheet(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "pass-board", examId],
    queryFn: () => apiClient.get<PassBoardDetail>("/pass-board", { exam_id: examId ?? undefined }),
    enabled: examId != null,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, examId: number) {
  queryClient.invalidateQueries({ queryKey: ["coe", "pass-board", examId] });
}

export function useSetGrace(examId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { exam_subject_mapping_id: number; grace_marks: number; board_note?: string }) =>
      apiClient.post(`/pass-board/grace?exam_id=${examId}`, body),
    onSuccess: () => examId && invalidate(queryClient, examId),
  });
}

export function useResetModeration(examId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/pass-board/reset?exam_id=${examId}`),
    onSuccess: () => examId && invalidate(queryClient, examId),
  });
}

export function useAddSignoff(examId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { member_name: string; member_role: string }) => apiClient.post(`/pass-board/signoffs?exam_id=${examId}`, body),
    onSuccess: () => examId && invalidate(queryClient, examId),
  });
}

export function useSignOff(examId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/pass-board/signoffs/${id}/sign`),
    onSuccess: () => examId && invalidate(queryClient, examId),
  });
}

export function useFreezeSheet(examId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/pass-board/freeze?exam_id=${examId}`),
    onSuccess: () => examId && invalidate(queryClient, examId),
  });
}
