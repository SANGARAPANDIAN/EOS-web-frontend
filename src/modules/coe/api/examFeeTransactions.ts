import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/exam-fee-transactions/ — new, coe-only. exam_fee_transactions
// table (query.md), a general fee-transaction ledger (not scoped to one exam).

export type ExamFeeHead = "exam_fee" | "arrear_fee" | "revaluation_fee" | "certificate_fee" | "late_fee";
export type ExamFeeMode = "online" | "challan" | "counter";
export type ExamFeeTxnStatus = "paid" | "pending" | "unpaid" | "refunded";

export interface ExamFeeTransaction {
  id: number;
  student_id: number;
  fee_head: ExamFeeHead;
  amount: number;
  mode: ExamFeeMode;
  status: ExamFeeTxnStatus;
  receipt_no: string | null;
  created_at: string;
  students: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    soa_applications: { first_name: string; last_name: string | null } | null;
    classes: { current_semester: number | null; departments: { id: number; code: string; name: string } } | null;
  };
}

export interface ExamFeeStats {
  raised: number;
  collected: number;
  collected_pct: number;
  pending_count: number;
  refunded_count: number;
}

export interface ExamFeeFilters {
  fee_head?: ExamFeeHead | null;
  status?: ExamFeeTxnStatus | null;
  search?: string;
}

export function useExamFeeTransactions(filters: ExamFeeFilters) {
  return useQuery({
    queryKey: ["coe", "exam-fee-transactions", filters],
    queryFn: () =>
      apiClient.get<ExamFeeTransaction[]>("/exam-fee-transactions", {
        fee_head: filters.fee_head ?? undefined,
        status: filters.status ?? undefined,
        search: filters.search || undefined,
      }),
  });
}

export function useExamFeeStats() {
  return useQuery({
    queryKey: ["coe", "exam-fee-transactions", "stats"],
    queryFn: () => apiClient.get<ExamFeeStats>("/exam-fee-transactions/stats"),
  });
}

export interface CreateExamFeeTransactionInput {
  student_id: number;
  fee_head: ExamFeeHead;
  amount: number;
  mode?: ExamFeeMode;
}

export function useCreateExamFeeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExamFeeTransactionInput) => apiClient.post<ExamFeeTransaction>("/exam-fee-transactions", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "exam-fee-transactions"] }),
  });
}

export function useUpdateExamFeeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ExamFeeTxnStatus }) =>
      apiClient.patch<ExamFeeTransaction>(`/exam-fee-transactions/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "exam-fee-transactions"] }),
  });
}
