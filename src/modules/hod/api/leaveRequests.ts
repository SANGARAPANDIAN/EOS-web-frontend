import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type LeaveAudience = "student" | "faculty";
export type LeaveTab = "pending" | "approved" | "rejected" | "all";

export interface HodLeaveRow {
  id: number;
  kind: LeaveAudience;
  name: string;
  subtitle: string;
  from_date: string;
  to_date: string;
  days: number;
  applied_at: string;
  type_label: string | null;
  detail_text: string | null;
  status: string;
  can_act: boolean;
}

export interface HodLeaveList {
  department: { id: number; name: string; code: string };
  audience: LeaveAudience;
  counts: { pending: number; approved: number; rejected: number; all: number };
  rows: HodLeaveRow[];
}

/** GET /hod/leave-requests?audience=&tab= */
export function useHodLeaveRequests(audience: LeaveAudience, tab: LeaveTab) {
  return useQuery({
    queryKey: ["hod", "leave-requests", audience, tab],
    queryFn: () => apiClient.get<HodLeaveList>("/hod/leave-requests", { audience, tab }),
  });
}

/** PATCH /hod/leave-requests/:kind/:id */
export function useDecideHodLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      id,
      decision,
    }: {
      kind: LeaveAudience;
      id: number;
      decision: "approved" | "rejected";
    }) => apiClient.patch(`/hod/leave-requests/${kind}/${id}`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "leave-requests"] }),
  });
}
