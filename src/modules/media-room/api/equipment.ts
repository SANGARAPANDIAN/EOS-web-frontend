import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type EquipmentCategory = "camera" | "lens" | "support" | "audio" | "lighting" | "aerial";
export type EquipmentCondition = "good" | "fair" | "needs_repair";
export type EquipmentStatus = "available" | "checked_out" | "in_service" | "retired";

export interface Equipment {
  id: number;
  asset_tag: string | null;
  name: string;
  category: EquipmentCategory;
  serial_no: string | null;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  checked_out_to: string | null;
  purchased_on: string | null;
  invoice_value: string | null;
  warranty_till: string | null;
  notes: string | null;
  created_at: string;
}

export interface EquipmentMovement {
  id: number;
  equipment_id: number;
  moved_at: string;
  note: string;
}

export interface EquipmentDetail extends Equipment {
  movements: EquipmentMovement[];
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /me/media-equipment — ready:false until the media_equipment table exists. */
export function useEquipment() {
  return useQuery({
    queryKey: ["media-room", "equipment"],
    queryFn: () => apiClient.get<ReadyResponse<Equipment>>("/me/media-equipment"),
  });
}

/** GET /me/media-equipment/:id — includes movement history. */
export function useEquipmentDetail(id: number | null) {
  return useQuery({
    queryKey: ["media-room", "equipment", id],
    queryFn: () => apiClient.get<EquipmentDetail>(`/me/media-equipment/${id}`),
    enabled: id != null,
  });
}

export interface CreateEquipmentInput {
  asset_tag?: string;
  name: string;
  category: EquipmentCategory;
  serial_no?: string;
  purchased_on?: string;
  invoice_value?: number;
  warranty_till?: string;
  notes?: string;
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEquipmentInput) => apiClient.post<Equipment>("/me/media-equipment", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "equipment"] }),
  });
}

export interface UpdateEquipmentInput {
  id: number;
  asset_tag?: string;
  name?: string;
  category?: EquipmentCategory;
  serial_no?: string;
  condition?: EquipmentCondition;
  status?: EquipmentStatus;
  checked_out_to?: string;
  purchased_on?: string;
  invoice_value?: number;
  warranty_till?: string;
  notes?: string;
  movement_note?: string;
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateEquipmentInput) => apiClient.patch<Equipment>(`/me/media-equipment/${id}`, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["media-room", "equipment"] });
      queryClient.invalidateQueries({ queryKey: ["media-room", "equipment", id] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/media-equipment/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "equipment"] }),
  });
}
