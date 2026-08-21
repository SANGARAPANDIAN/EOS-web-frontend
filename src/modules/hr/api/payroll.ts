import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";
import type { ApiPaginated } from "./requests";

export interface HrPayrollRecord {
  id: number;
  /** "YYYY-MM" */
  month: string;
  year: number;
  month_number: number;
  gross_amount: number;
  net_amount: number;
  paid_at: string | null;
  faculty: { id: number; first_name: string; last_name: string; designation: string; profile_url?: string | null } | null;
  processed_by: { id: number; email: string } | null;
}

export interface HrPayrollListParams {
  [key: string]: string | number | undefined;
  faculty_id?: number;
  /** "YYYY-MM" */
  month?: string;
  page?: number;
  limit?: number;
}

/**
 * salary_payments only ever stores gross_amount/net_amount — these breakdown
 * fields are computation input only (gross = basic + hra + da, net = gross -
 * deductions); the backend derives and persists just the two aggregates.
 */
export interface CreateHrPayrollInput {
  faculty_id: number;
  /** "YYYY-MM" */
  month: string;
  basic_salary: number;
  hra: number;
  da: number;
  pf_deduction?: number;
  other_deductions?: number;
  paid_on?: string;
}

/** GET /me/hr-payroll — HR Payroll sees every record; paginated, filterable by faculty/month. */
export function useHrPayroll(params: HrPayrollListParams = {}) {
  return useQuery({
    queryKey: hrKeys.payroll.list(params),
    queryFn: () => apiClient.get<ApiPaginated<HrPayrollRecord>>("/me/hr-payroll", params),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateHrPayroll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "payroll"] });
    queryClient.invalidateQueries({ queryKey: hrKeys.dashboard() });
  };
}

/** POST /me/hr-payroll — records one faculty member's payroll run for a month. */
export function useCreateHrPayroll() {
  const invalidate = useInvalidateHrPayroll();
  return useMutation({
    mutationFn: (input: CreateHrPayrollInput) => apiClient.post<HrPayrollRecord>("/me/hr-payroll", input),
    onSuccess: invalidate,
  });
}

/** PATCH /me/hr-payroll/:id — marks a payroll record as paid on a given date. */
export function useMarkHrPayrollPaid() {
  const invalidate = useInvalidateHrPayroll();
  return useMutation({
    mutationFn: ({ id, paidOn }: { id: number; paidOn: string }) =>
      apiClient.patch<HrPayrollRecord>(`/me/hr-payroll/${id}`, { paid_on: paidOn }),
    onSuccess: invalidate,
  });
}
