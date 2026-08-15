import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Bed {
  id: string;
  bedId: number;
  wing: "Ladies" | "Gents";
  occupied: boolean;
  name?: string;
  deptRoll?: string;
  reason?: string;
  since?: string;
  admitted?: string;
  by?: string;
  vitals?: string;
  meds?: string;
  guardian?: string;
  plan?: string;
  review?: string;
}

/** GET /me/medical-centre-sickroom */
export function useSickRoomBeds() {
  return useQuery({
    queryKey: ["me", "medical-centre-sickroom"],
    queryFn: () => apiClient.get<Bed[]>("/me/medical-centre-sickroom"),
    refetchInterval: 30_000,
  });
}

export interface AdmitBedInput {
  bedId: number;
  visit_id?: number;
  reason?: string;
  vitals?: string;
  medication_given?: string;
  guardian_contacted?: boolean;
  plan?: string;
  review_in_minutes?: number;
}

/** POST /me/medical-centre-sickroom/:bedId/admit */
export function useAdmitBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bedId, ...body }: AdmitBedInput) => apiClient.post<{ stayId: number }>(`/me/medical-centre-sickroom/${bedId}/admit`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-sickroom"] });
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-opd-queue"] });
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-dashboard"] });
    },
  });
}

/** POST /me/medical-centre-sickroom/:bedId/discharge */
export function useDischargeBed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bedId: number) => apiClient.post<{ stayId: number }>(`/me/medical-centre-sickroom/${bedId}/discharge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-sickroom"] }),
  });
}
