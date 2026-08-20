import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type FeeConcessionStatus = "pending" | "approved" | "rejected";

export interface FeeConcessionRequest {
  id: number;
  reason: string;
  requested_amount: number | null;
  status: FeeConcessionStatus;
  reviewed_at: string | null;
  created_at: string;
  fee_demand: {
    id: number;
    fee_structure_name: string;
    academic_year: string;
    semester: number | null;
    total_amount: number;
  };
}

export interface CreateFeeConcessionInput {
  fee_demand_mapping_id: number;
  reason: string;
  requested_amount?: number;
}

/** GET /fee-concession-requests/my — the caller's own requests, for looking up "is demand X approved". */
export function useMyFeeConcessionRequests() {
  return useQuery({
    queryKey: ["me", "fee-concession-requests"],
    queryFn: () =>
      apiClient.get<{ data: FeeConcessionRequest[] }>("/fee-concession-requests/my"),
  });
}

/** POST /fee-concession-requests */
export function useCreateFeeConcessionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeeConcessionInput) =>
      apiClient.post<FeeConcessionRequest>("/fee-concession-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "fee-concession-requests"] }),
  });
}
