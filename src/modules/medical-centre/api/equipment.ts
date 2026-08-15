import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type Condition = "Working" | "Under service";

export interface Equipment {
  id: number;
  name: string;
  qty: number;
  place: string;
  condition: Condition;
}

/** GET /me/medical-centre-equipment */
export function useEquipment() {
  return useQuery({
    queryKey: ["me", "medical-centre-equipment"],
    queryFn: () => apiClient.get<Equipment[]>("/me/medical-centre-equipment"),
  });
}

/** POST /me/medical-centre-equipment/:id/toggle-condition */
export function useToggleEquipmentCondition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<{ id: number; condition: Condition }>(`/me/medical-centre-equipment/${id}/toggle-condition`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-equipment"] }),
  });
}
