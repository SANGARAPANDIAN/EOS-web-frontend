import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type StaffStatus = "Active" | "On Leave";

export interface StaffMember {
  sid: string;
  id: number;
  name: string;
  desig: string;
  qual: string;
  spec: string;
  exp: string;
  prevInst: string;
  prevRole: string;
  prevDur: string;
  reg: string;
  email: string;
  joined: string;
  days: string;
  timing: string;
  emergency: string;
  status: StaffStatus;
  phone: string;
  duty: boolean;
}

/** GET /me/medical-centre-team */
export function useTeam() {
  return useQuery({
    queryKey: ["me", "medical-centre-team"],
    queryFn: () => apiClient.get<StaffMember[]>("/me/medical-centre-team"),
  });
}

/** GET /me/medical-centre-team/:id */
export function useStaffMember(id: number | null) {
  return useQuery({
    queryKey: ["me", "medical-centre-team", id],
    queryFn: () => apiClient.get<StaffMember>(`/me/medical-centre-team/${id}`),
    enabled: id != null,
  });
}

/** POST /me/medical-centre-team/:id/duty */
export function useSetStaffDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, duty }: { id: number; duty: boolean }) => apiClient.post(`/me/medical-centre-team/${id}/duty`, { duty }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-team"] }),
  });
}

/** POST /me/medical-centre-team/:id/status */
export function useSetStaffStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "on_leave" }) => apiClient.post(`/me/medical-centre-team/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-team"] }),
  });
}
