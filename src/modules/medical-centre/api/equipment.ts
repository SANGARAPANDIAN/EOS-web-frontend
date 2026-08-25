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

/** Stored values, as opposed to the `Condition` display labels above. */
export type ConditionValue = "working" | "under_service";

export const CONDITION_LABEL: Record<ConditionValue, Condition> = {
  working: "Working",
  under_service: "Under service",
};

/** Display label -> stored value, for prefilling the edit form from a list row. */
export function conditionValueOf(label: Condition): ConditionValue {
  return label === "Working" ? "working" : "under_service";
}

export interface EquipmentInput {
  name: string;
  quantity?: number;
  location?: string;
  condition?: ConditionValue;
}

/** POST /me/medical-centre-equipment */
export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EquipmentInput) => apiClient.post<{ id: number }>("/me/medical-centre-equipment", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-equipment"] }),
  });
}

/** PATCH /me/medical-centre-equipment/:id */
export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<EquipmentInput> & { id: number }) =>
      apiClient.patch(`/me/medical-centre-equipment/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-equipment"] }),
  });
}

/** DELETE /me/medical-centre-equipment/:id */
export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/medical-centre-equipment/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-equipment"] }),
  });
}
