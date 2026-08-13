import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodLeaveType {
  id: number;
  name: string;
  default_annual_quota: number;
}

/** GET /hod/employee/leave/types */
export function useHodLeaveTypes() {
  return useQuery({
    queryKey: ["hod", "employee", "leave", "types"],
    queryFn: () => apiClient.get<HodLeaveType[]>("/hod/employee/leave/types"),
  });
}

export interface HodLeaveBalance {
  leave_type_id: number;
  leave_type: string;
  allocated: number;
  used: number;
  remaining: number;
}

/** GET /hod/employee/leave/balances */
export function useHodLeaveBalances() {
  return useQuery({
    queryKey: ["hod", "employee", "leave", "balances"],
    queryFn: () => apiClient.get<HodLeaveBalance[]>("/hod/employee/leave/balances"),
  });
}

export interface HodLeaveHistoryRow {
  id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  leave_type: { id: number; name: string } | null;
  hod_approval_status: "pending" | "approved" | "rejected";
  hr_approval_status: "pending" | "approved" | "rejected";
  overall_status: "pending" | "approved" | "rejected";
  created_at: string;
}

/** GET /hod/employee/leave/history?status= */
export function useHodLeaveHistory(status?: "pending" | "approved" | "rejected") {
  return useQuery({
    queryKey: ["hod", "employee", "leave", "history", status],
    queryFn: () =>
      apiClient.get<HodLeaveHistoryRow[]>("/hod/employee/leave/history", { status }),
  });
}

export interface ApplyLeaveInput {
  from_date: string;
  to_date: string;
  reason?: string;
  leave_type_id?: number;
  alternate_arrangement?: string;
  is_station_leave?: boolean;
}

/** POST /hod/employee/leave */
export function useApplyHodLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyLeaveInput) => apiClient.post("/hod/employee/leave", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hod", "employee", "leave"] });
    },
  });
}
