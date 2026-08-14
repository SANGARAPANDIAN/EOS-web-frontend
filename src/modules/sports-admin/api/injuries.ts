import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Ref } from "./types";

export type IncidentType = "injury" | "facility";
export type InjuryStatus = "open" | "closed";

export interface Injury {
  id: number;
  incident_type: IncidentType;
  student: Ref | null;
  facility: Ref | null;
  incident: string;
  incident_date: string;
  status: InjuryStatus;
  care_notes: string | null;
  return_to_play_date: string | null;
}

export interface CreateInjuryInput {
  incident_type: IncidentType;
  student_id?: number;
  facility_id?: number;
  discipline_id?: number;
  incident: string;
  incident_date: string;
  care_notes?: string;
  status?: InjuryStatus;
  return_to_play_date?: string;
  medical_visit_id?: number;
}

export function useInjuries(params?: { status?: InjuryStatus; incident_type?: IncidentType }) {
  return useQuery({
    queryKey: ["sports-admin", "injuries", params],
    queryFn: () => apiClient.get<Injury[]>("/sports-admin/injuries", params),
  });
}

export function useCreateInjury() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInjuryInput) => apiClient.post<Injury>("/sports-admin/injuries", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "injuries"] }),
  });
}

export function useUpdateInjury() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateInjuryInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/injuries/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "injuries"] }),
  });
}

export function useDeleteInjury() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/injuries/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "injuries"] }),
  });
}
