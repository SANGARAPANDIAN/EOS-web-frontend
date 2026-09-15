import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { OdTab } from "./odRequests";

export interface SportsOdHodQueueRow {
  od_request_id: number;
  department_id: number;
  department_name: string | null;
  status: "pending" | "approved" | "rejected";
  event: string;
  od_type: string;
  from_date: string;
  to_date: string;
  venue: string | null;
  level: string | null;
  students_from_my_department: number;
}

export interface SportsOdHodQueue {
  counts: { pending: number; approved: number; rejected: number; all: number };
  rows: SportsOdHodQueueRow[];
}

/** GET /sports-admin/od-requests/hod-queue?status= — sports OD requests for this HoD's own department(s). */
export function useSportsOdHodQueue(status: OdTab) {
  return useQuery({
    queryKey: ["hod", "sports-od-hod-queue", status],
    queryFn: () => apiClient.get<SportsOdHodQueue>("/sports-admin/od-requests/hod-queue", { status }),
  });
}

/** POST /sports-admin/od-requests/:id/approve or /reject */
export function useDecideSportsOd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, remarks }: { id: number; decision: "approved" | "rejected"; remarks?: string }) =>
      apiClient.post(`/sports-admin/od-requests/${id}/${decision === "approved" ? "approve" : "reject"}`, { remarks }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "sports-od-hod-queue"] }),
  });
}
