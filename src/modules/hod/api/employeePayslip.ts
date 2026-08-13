import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodPayslipHistoryRow {
  id: number;
  month: string;
  status: "pending" | "processed" | "rejected";
  file_url: string | null;
  requested_at: string;
  purpose: string | null;
}

/** GET /hod/employee/payslip/history */
export function useHodPayslipHistory() {
  return useQuery({
    queryKey: ["hod", "employee", "payslip", "history"],
    queryFn: () => apiClient.get<HodPayslipHistoryRow[]>("/hod/employee/payslip/history"),
  });
}

export interface ApplyPayslipInput {
  month: string;
  purpose?: string;
}

/** POST /hod/employee/payslip */
export function useApplyHodPayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyPayslipInput) => apiClient.post("/hod/employee/payslip", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hod", "employee", "payslip"] });
    },
  });
}
