import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Discipline {
  id: number;
  name: string;
  head_coach: { id: number; name: string } | null;
  is_active: boolean;
  athlete_count: number;
  team_count: number;
}

export interface CreateDisciplineInput {
  name: string;
  head_coach_faculty_id?: number;
  is_active?: boolean;
}

export function useDisciplines(params?: { q?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ["sports-admin", "disciplines", params],
    queryFn: () => apiClient.get<Discipline[]>("/sports-admin/disciplines", params),
  });
}

export function useCreateDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDisciplineInput) => apiClient.post<Discipline>("/sports-admin/disciplines", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "disciplines"] }),
  });
}

export function useUpdateDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateDisciplineInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/disciplines/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "disciplines"] }),
  });
}

export function useDeleteDiscipline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/disciplines/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "disciplines"] }),
  });
}
