import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";
import type { ApiPaginated } from "./requests";

export type PayslipRequestStatus = "pending" | "processed" | "rejected";

export interface PayslipRequest {
  id: number;
  /** "YYYY-MM" */
  month: string;
  status: PayslipRequestStatus;
  file_url: string | null;
  requested_at: string;
  purpose: string | null;
  // null for a request submitted by non-faculty staff through the
  // Secretary self-service branch (POST /payslip-requests keys those by
  // staff_user_id instead of faculty_id) — HR still sees every request
  // regardless of who filed it, so this has to render, not just type-check.
  faculty: {
    id: number;
    first_name: string;
    last_name: string;
    designation: string;
    profile_url?: string | null;
    department: { id: number; name: string };
  } | null;
  staff_user_id: number | null;
}

export interface PayslipRequestsListParams {
  [key: string]: string | number | undefined;
  faculty_id?: number;
  /** "YYYY-MM" */
  month?: string;
  status?: PayslipRequestStatus;
  page?: number;
  limit?: number;
}

export interface UpdatePayslipRequestInput {
  status: "processed" | "rejected";
  /** Required when status is "processed" — the link to the generated payslip. */
  file_url?: string;
}

/** GET /me/payslip-requests — HR Payroll sees every request; paginated, filterable. */
export function usePayslipRequests(params: PayslipRequestsListParams = {}) {
  return useQuery({
    queryKey: hrKeys.payslipRequests.list(params),
    queryFn: () => apiClient.get<ApiPaginated<PayslipRequest>>("/me/payslip-requests", params),
    placeholderData: keepPreviousData,
  });
}

/** PATCH /me/payslip-requests/:id — HR Payroll only. Marks 'processed' or 'rejected' directly, no upload flow. */
export function useUpdatePayslipRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePayslipRequestInput }) =>
      apiClient.patch<PayslipRequest>(`/me/payslip-requests/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "payslip-requests"] }),
  });
}
