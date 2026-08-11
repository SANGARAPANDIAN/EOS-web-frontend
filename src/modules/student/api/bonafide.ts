import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface BonafideReason {
  id: number;
  reason_text: string;
}

/** GET /bonafide-reasons — public reference list. */
export function useBonafideReasons() {
  return useQuery({
    queryKey: ["bonafide-reasons"],
    queryFn: () => apiClient.get<BonafideReason[]>("/bonafide-reasons"),
  });
}

export type BonafideStatus = "pending" | "faculty_approved" | "issued" | "rejected";

export interface BonafideRequestRow {
  id: number;
  reason_id: number;
  reason_text: string;
  status: BonafideStatus;
  requested_at: string;
  issued_at: string | null;
  file_url: string | null;
}

/** GET /me/bonafide-requests */
export function useMyBonafideRequests() {
  return useQuery({
    queryKey: ["me", "bonafide-requests"],
    queryFn: () =>
      apiClient.get<{ data: BonafideRequestRow[]; page: number; page_size: number; total: number }>(
        "/me/bonafide-requests",
      ),
  });
}

/** POST /me/bonafide-requests */
export function useCreateBonafideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason_id: number) => apiClient.post("/me/bonafide-requests", { reason_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "bonafide-requests"] }),
  });
}
