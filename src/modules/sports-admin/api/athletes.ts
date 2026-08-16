import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AchievementItem, Ref } from "./types";

export type AthleteStatus = "active" | "injured" | "rest";

export interface AthleteListItem {
  id: number;
  student_id: number;
  name: string;
  reg_no: string | null;
  dept_code: string | null;
  year_sem: string | null;
  discipline: Ref | null;
  status: AthleteStatus;
  attendance_pct: number;
  mobile: string | null;
  email: string | null;
}

export interface AthleteDetail {
  id: number;
  student_id: number;
  name: string;
  photo_url: string | null;
  reg_no: string | null;
  roll_no: string | null;
  dob: string | null;
  gender: string | null;
  department: { id: number; name: string; code: string } | null;
  course: { name: string; code: string } | null;
  year: string | null;
  section: string | null;
  mobile: string | null;
  email: string | null;
  discipline: Ref | null;
  status: AthleteStatus;
  registered_academic_year: string | null;
  attendance_pct: number;
  teams: { id: number; name: string; squad_role: string | null; jersey_no: string | null }[];
  achievements: AchievementItem[];
}

export interface CreateAthleteInput {
  student_id: number;
  primary_discipline_id?: number;
  status?: AthleteStatus;
  registered_academic_year?: string;
}

export function useAthletes(params?: { discipline_id?: number; status?: AthleteStatus; q?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "athletes", params],
    queryFn: () => apiClient.get<AthleteListItem[]>("/sports-admin/athletes", params),
  });
}

export function useAthleteDetail(id: number) {
  return useQuery({
    queryKey: ["sports-admin", "athletes", id],
    queryFn: () => apiClient.get<AthleteDetail>(`/sports-admin/athletes/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAthleteInput) => apiClient.post<AthleteListItem>("/sports-admin/athletes", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "athletes"] }),
  });
}

export function useUpdateAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<Omit<CreateAthleteInput, "student_id">> & { id: number }) =>
      apiClient.patch(`/sports-admin/athletes/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "athletes"] }),
  });
}

export function useDeleteAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/athletes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "athletes"] }),
  });
}
