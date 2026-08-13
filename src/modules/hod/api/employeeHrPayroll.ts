import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodHrPayrollRequestRow {
  id: number;
  category: string;
  subject: string;
  description: string | null;
  attachment_url: string | null;
  status: "submitted" | "under_review" | "resolved";
  hr_assigned_name: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

/** GET /hod/employee/hr-payroll/requests */
export function useHodHrPayrollRequests() {
  return useQuery({
    queryKey: ["hod", "employee", "hr-payroll", "requests"],
    queryFn: () => apiClient.get<HodHrPayrollRequestRow[]>("/hod/employee/hr-payroll/requests"),
  });
}

export interface CreateHrPayrollRequestInput {
  category: string;
  subject: string;
  description?: string;
}

/** POST /hod/employee/hr-payroll/requests */
export function useCreateHodHrPayrollRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHrPayrollRequestInput) =>
      apiClient.post("/hod/employee/hr-payroll/requests", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hod", "employee", "hr-payroll"] });
    },
  });
}
