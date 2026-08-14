import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AchievementItem, Ref, SportsTeamStatus } from "./types";

export interface TeamListItem {
  id: number;
  name: string;
  discipline: Ref | null;
  coach: Ref | null;
  captain: Ref | null;
  size: number;
  status: SportsTeamStatus;
  category: string | null;
}

export interface TeamDetail {
  id: number;
  code: string;
  name: string;
  discipline: Ref | null;
  category: string | null;
  coach: { id: number; name: string; phone: string | null } | null;
  captain: Ref | null;
  vice_captain: Ref | null;
  manager_name: string | null;
  facility: Ref | null;
  practice_schedule: string | null;
  formed_date: string | null;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  status: SportsTeamStatus;
  roster: { student_id: number; name: string; jersey_no: string | null; squad_role: string | null; dept_year: string }[];
  results: AchievementItem[];
}

export interface CreateTeamInput {
  name: string;
  discipline_id?: number;
  coach_faculty_id?: number;
  category?: string;
  captain_student_id?: number;
  vice_captain_student_id?: number;
  manager_name?: string;
  facility_id?: number;
  practice_schedule?: string;
  formed_date?: string;
}

export function useTeams(params?: { discipline_id?: number; status?: SportsTeamStatus; q?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "teams", params],
    queryFn: () => apiClient.get<TeamListItem[]>("/sports-admin/teams", params),
  });
}

export function useTeamDetail(id: number) {
  return useQuery({
    queryKey: ["sports-admin", "teams", id],
    queryFn: () => apiClient.get<TeamDetail>(`/sports-admin/teams/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamInput) => apiClient.post<TeamListItem>("/sports-admin/teams", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams"] }),
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateTeamInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/teams/${id}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams", variables.id] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/teams/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams"] }),
  });
}

export function useConfirmTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/sports-admin/teams/${id}/confirm`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams", id] });
    },
  });
}

export interface AddRosterEntryInput {
  student_id: number;
  jersey_no?: string;
  squad_role?: string;
}

export function useAddRosterEntry(teamId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRosterEntryInput) => apiClient.post(`/sports-admin/teams/${teamId}/roster`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams", teamId] }),
  });
}

export function useUpdateRosterEntry(teamId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, ...input }: { studentId: number; jersey_no?: string; squad_role?: string }) =>
      apiClient.patch(`/sports-admin/teams/${teamId}/roster/${studentId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams", teamId] }),
  });
}

export function useRemoveRosterEntry(teamId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: number) => apiClient.delete(`/sports-admin/teams/${teamId}/roster/${studentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "teams", teamId] }),
  });
}
