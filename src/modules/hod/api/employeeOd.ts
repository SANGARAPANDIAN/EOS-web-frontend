import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodOdHistoryRow {
  id: number;
  from_date: string;
  to_date: string;
  place: string | null;
  purpose: string | null;
  organization_visited: string | null;
  od_type: string | null;
  periods_affected: string | null;
  class_adjustment: string | null;
  hod_approval_status: "pending" | "approved" | "rejected";
  hr_approval_status: "pending" | "approved" | "rejected";
  overall_status: "pending" | "approved" | "rejected";
  created_at: string;
}

/** GET /hod/employee/od/history?status= */
export function useHodOdHistory(status?: "pending" | "approved" | "rejected") {
  return useQuery({
    queryKey: ["hod", "employee", "od", "history", status],
    queryFn: () => apiClient.get<HodOdHistoryRow[]>("/hod/employee/od/history", { status }),
  });
}

export interface ApplyOdInput {
  from_date: string;
  to_date: string;
  place?: string;
  purpose?: string;
  organization_visited?: string;
  od_type?: string;
  periods_affected?: string;
  class_adjustment?: string;
}

/** POST /hod/employee/od */
export function useApplyHodOd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyOdInput) => apiClient.post("/hod/employee/od", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hod", "employee", "od"] });
    },
  });
}
