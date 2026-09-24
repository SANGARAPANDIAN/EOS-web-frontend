import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ChildMedicalAppointment {
  id: number;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  status: string;
  reason: string | null;
  decision_note: string | null;
  created_at: string;
  visit_id: number | null;
}

/** GET /me/children/:id/medical-appointments — history only; booking on a child's behalf isn't offered from the parent portal. */
export function useChildMedicalAppointments(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "medical-appointments"],
    queryFn: () => apiClient.get<ChildMedicalAppointment[]>(`/me/children/${childId}/medical-appointments`),
    enabled: childId !== null,
  });
}
