import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface UpcomingCamp {
  id: number;
  title: string;
  detail: string;
  date: string;
  state: "Running" | "Scheduled" | "Planning";
  done: number;
  target: number;
}

export interface PastCamp {
  id: number;
  title: string;
  date: string;
  detail: string;
  done: number;
  target: number;
  outcome: string;
}

export interface CampsData {
  upcoming: UpcomingCamp[];
  past: PastCamp[];
}

/** GET /me/medical-centre-camps */
export function useCamps() {
  return useQuery({
    queryKey: ["me", "medical-centre-camps"],
    queryFn: () => apiClient.get<CampsData>("/me/medical-centre-camps"),
  });
}

/** POST /me/medical-centre-camps/:id/register-batch */
export function useRegisterBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/me/medical-centre-camps/${id}/register-batch`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-camps"] }),
  });
}
