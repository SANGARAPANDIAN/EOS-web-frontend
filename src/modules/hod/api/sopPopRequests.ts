import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type SopPopKind = "sop" | "pop";
export type SopPopStatus = "awaiting_hod" | "sent_to_principal" | "rejected";

export interface HodSopPopRequestRow {
  id: number;
  kind: SopPopKind;
  display_id: string;
  title: string;
  description: string;
  raised_by: string;
  raised_by_role: string;
  amount: number | null;
  needed_by: string | null;
  next_stage: string;
  status: SopPopStatus;
  raised_at: string;
  hod_remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface HodSopPopRequests {
  counts: { sop: number; pop: number };
  sop: HodSopPopRequestRow[];
  pop: HodSopPopRequestRow[];
}

/** GET /hod/sop-pop-requests */
export function useHodSopPopRequests() {
  return useQuery({
    queryKey: ["hod", "sop-pop-requests"],
    queryFn: () => apiClient.get<HodSopPopRequests>("/hod/sop-pop-requests"),
  });
}

/** PATCH /hod/sop-pop-requests/:kind/:id */
export function useDecideHodSopPopRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      id,
      decision,
      remarks,
    }: {
      kind: SopPopKind;
      id: number;
      decision: "approved" | "rejected";
      remarks?: string;
    }) => apiClient.patch(`/hod/sop-pop-requests/${kind}/${id}`, { decision, remarks }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "sop-pop-requests"] }),
  });
}
