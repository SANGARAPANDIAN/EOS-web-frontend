import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/revaluation-windows/revaluation-windows.controller.ts —
// new module, coe-only. revaluation_windows.exam_id is @unique, so this is
// modeled as one row per exam: GET/PATCH by examId, POST to create it the
// first time.

export type RevaluationApplicationType = "photocopy_and_reval" | "photocopy_only" | "reval_only";

export interface RevaluationWindow {
  id: number;
  exam_id: number;
  application_type: RevaluationApplicationType;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
  fee_per_paper: number;
  photocopy_fee_per_paper: number;
  max_papers_per_student: number | null;
  created_by_user_id: number | null;
  created_at: string;
}

export function useRevaluationWindow(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "revaluation-windows", examId],
    queryFn: () => apiClient.get<RevaluationWindow>(`/revaluation-windows/${examId}`),
    enabled: examId != null,
    retry: false,
  });
}

export interface RevaluationWindowInput {
  application_type?: RevaluationApplicationType;
  is_open?: boolean;
  opens_at?: string;
  closes_at?: string;
  fee_per_paper: number;
  photocopy_fee_per_paper: number;
  max_papers_per_student?: number;
}

export function useCreateRevaluationWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RevaluationWindowInput & { exam_id: number }) =>
      apiClient.post<RevaluationWindow>("/revaluation-windows", input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({ queryKey: ["coe", "revaluation-windows", input.exam_id] }),
  });
}

export function useUpdateRevaluationWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, ...input }: RevaluationWindowInput & { examId: number }) =>
      apiClient.patch<RevaluationWindow>(`/revaluation-windows/${examId}`, input),
    onSuccess: (_, { examId }) => queryClient.invalidateQueries({ queryKey: ["coe", "revaluation-windows", examId] }),
  });
}
