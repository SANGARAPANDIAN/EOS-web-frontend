import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface TransportNotice {
  id: number;
  tag: string;
  title: string;
  created_at: string;
}

/** GET /me/transport-notices */
export function useTransportNotices() {
  return useQuery({
    queryKey: ["me", "transport-notices"],
    queryFn: () => apiClient.get<TransportNotice[]>("/me/transport-notices"),
  });
}

export interface CreateTransportNoticeInput {
  tag: string;
  title: string;
}

/** POST /me/transport-notices */
export function useCreateTransportNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransportNoticeInput) => apiClient.post<TransportNotice>("/me/transport-notices", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "transport-notices"] });
      queryClient.invalidateQueries({ queryKey: ["me", "transport-dashboard"] });
    },
  });
}
