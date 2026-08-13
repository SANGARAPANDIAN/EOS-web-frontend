import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type OdAudience = "student" | "faculty";
export type OdTab = "pending" | "approved" | "rejected" | "all";

export interface HodOdRow {
  id: number;
  kind: OdAudience;
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

export interface HodOdList {
  department: { id: number; name: string; code: string };
  audience: OdAudience;
  counts: { pending: number; approved: number; rejected: number; all: number };
  rows: HodOdRow[];
}

/** GET /hod/od-requests?audience=&tab= */
export function useHodOdRequests(audience: OdAudience, tab: OdTab) {
  return useQuery({
    queryKey: ["hod", "od-requests", audience, tab],
    queryFn: () => apiClient.get<HodOdList>("/hod/od-requests", { audience, tab }),
  });
}

/** PATCH /hod/od-requests/:kind/:id */
export function useDecideHodOdRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      id,
      decision,
    }: {
      kind: OdAudience;
      id: number;
      decision: "approved" | "rejected";
    }) => apiClient.patch(`/hod/od-requests/${kind}/${id}`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "od-requests"] }),
  });
}
