import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/exam-registrations/ — new, coe-only. New exam_registrations
// table (query.md), real student-level registration/approval/fee workflow.

export type ExamRegistrationStatus = "pending" | "approved" | "rejected";
export type ExamRegistrationFeeStatus = "paid" | "unpaid" | "partial";

export interface ExamRegistration {
  id: number;
  exam_id: number;
  student_id: number;
  fee_status: ExamRegistrationFeeStatus;
  status: ExamRegistrationStatus;
  approved_by_user_id: number | null;
  approved_at: string | null;
  registered_at: string;
  /** Column added via query.md ALTER — undefined/null until that migration is applied. */
  reason?: string | null;
  students: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    class_id: number | null;
    soa_applications: { first_name: string; last_name: string | null } | null;
    classes: { current_semester: number | null; departments: { id: number; code: string; name: string } } | null;
  };
  exams: { id: number; academic_year: string; semester: number; exam_category: string };
  /** Real derived counts computed by the backend — not stored columns. */
  courses_count: number;
  arrears_count: number;
}

export interface ExamRegistrationStats {
  registered: number;
  eligible: number;
  pending_registrations: number;
  rejected: number;
  fee_not_paid: number;
  fee_outstanding_amount: number | null;
  registration_window_closes_in_days: number | null;
}

export interface ExamRegistrationFilters {
  exam_id?: number | null;
  department_id?: number | null;
  status?: ExamRegistrationStatus | null;
  fee_status?: ExamRegistrationFeeStatus | null;
  search?: string;
}

export function useExamRegistrations(filters: ExamRegistrationFilters) {
  return useQuery({
    queryKey: [
      "coe",
      "exam-registrations",
      filters.exam_id ?? null,
      filters.department_id ?? null,
      filters.status ?? null,
      filters.fee_status ?? null,
      filters.search ?? "",
    ],
    queryFn: () =>
      apiClient.get<ExamRegistration[]>("/exam-registrations", {
        exam_id: filters.exam_id ?? undefined,
        department_id: filters.department_id ?? undefined,
        status: filters.status ?? undefined,
        fee_status: filters.fee_status ?? undefined,
        search: filters.search || undefined,
      }),
  });
}

export function useExamRegistrationStats(examId?: number | null) {
  return useQuery({
    queryKey: ["coe", "exam-registration-stats", examId ?? null],
    queryFn: () => apiClient.get<ExamRegistrationStats>("/exam-registrations/stats", { exam_id: examId ?? undefined }),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["coe", "exam-registrations"] });
  queryClient.invalidateQueries({ queryKey: ["coe", "exam-registration-stats"] });
}

export function useCreateExamRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exam_id: number; student_id: number; fee_status?: ExamRegistrationFeeStatus; reason?: string }) =>
      apiClient.post<ExamRegistration>("/exam-registrations", input),
    onSuccess: () => invalidate(queryClient),
  });
}

/** status "pending" reopens a previously rejected registration. */
export function useReviewExamRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" | "pending" }) =>
      apiClient.patch<ExamRegistration>(`/exam-registrations/${id}/review`, { status }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateFeeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fee_status }: { id: number; fee_status: ExamRegistrationFeeStatus }) =>
      apiClient.patch<ExamRegistration>(`/exam-registrations/${id}/fee-status`, { fee_status }),
    onSuccess: () => invalidate(queryClient),
  });
}
