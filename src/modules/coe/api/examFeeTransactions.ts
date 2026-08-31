import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/exam-fee-transactions/ — coe-only. A general fee-transaction
// ledger (not scoped to one exam). reference_no/reconciled_at are new columns
// (see schema.prisma) — undefined/null until that migration is applied, same
// as certificate_requests.copies / convocation_registrations.convocation_batch.

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
  reference_no?: string | null;
  reconciled_at?: string | null;
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
  collected: number;
  collected_pct_of_demand: number | null;
  outstanding: number;
  outstanding_students: number;
  revaluation_fees: number;
  revaluation_applications: number;
  refunds_processed: number;
  refunds_cases: number;
  to_reconcile_count: number;
}

export interface ExamFeeFilters {
  [key: string]: string | undefined;
  fee_head?: ExamFeeHead;
  mode?: ExamFeeMode;
  status?: ExamFeeTxnStatus;
  search?: string;
}

export function useExamFeeTransactions(filters: ExamFeeFilters) {
  return useQuery({
    queryKey: ["coe", "exam-fee-transactions", filters],
    queryFn: () => apiClient.get<ExamFeeTransaction[]>("/exam-fee-transactions", filters),
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
  reference_no?: string;
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

/** POST /exam-fee-transactions/:id/reconcile — 400s if not paid or already reconciled. */
export function useReconcileExamFeeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<ExamFeeTransaction>(`/exam-fee-transactions/${id}/reconcile`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "exam-fee-transactions"] }),
  });
}

/** POST /exam-fee-transactions/:id/remind — 400s if not pending/unpaid. */
export function useRemindExamFeeTransaction() {
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/exam-fee-transactions/${id}/remind`),
  });
}
