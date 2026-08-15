import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Ref } from "./types";

export type EquipmentStatus = "available" | "in_service" | "retired";

export interface Equipment {
  id: number;
  name: string;
  category: string | null;
  total_quantity: number;
  status: EquipmentStatus;
  facility: Ref | null;
  issued_count: number;
  available_count: number;
  reorder_level: number | null;
}

export interface CreateEquipmentInput {
  name: string;
  category?: string;
  total_quantity?: number;
  facility_id?: number;
  reorder_level?: number;
  status?: EquipmentStatus;
}

export interface EquipmentIssue {
  id: number;
  equipment_id: number;
  issued_to_type: "student" | "faculty";
  issued_to: { id: number | null; name: string };
  issued_date: string;
  due_date: string | null;
  returned_date: string | null;
  status: "borrowed" | "returned" | "overdue" | "lost" | "damaged";
  remarks: string | null;
}

export interface IssueEquipmentInput {
  issued_to_type: "student" | "faculty";
  student_id?: number;
  faculty_id?: number;
  due_date?: string;
}

export function useEquipmentList(params?: { status?: EquipmentStatus; category?: string; q?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "equipment", params],
    queryFn: () => apiClient.get<Equipment[]>("/sports-admin/equipment", params),
  });
}

export function useEquipmentIssues(equipmentId: number, status?: string) {
  return useQuery({
    queryKey: ["sports-admin", "equipment", equipmentId, "issues", status],
    queryFn: () => apiClient.get<EquipmentIssue[]>(`/sports-admin/equipment/${equipmentId}/issues`, { status }),
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEquipmentInput) => apiClient.post<Equipment>("/sports-admin/equipment", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "equipment"] }),
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateEquipmentInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/equipment/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "equipment"] }),
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/equipment/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "equipment"] }),
  });
}

export function useIssueEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: IssueEquipmentInput & { id: number }) =>
      apiClient.post(`/sports-admin/equipment/${id}/issue`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "equipment"] }),
  });
}

export function useReturnEquipmentIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issueId: number) => apiClient.post(`/sports-admin/equipment/issues/${issueId}/return`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "equipment"] }),
  });
}
