import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AchievementItem, Ref } from "./types";

export type DutyStatus = "on_duty" | "on_leave";

export interface CoachListItem {
  id: number;
  faculty_id: number;
  name: string;
  designation: string;
  discipline: Ref | null;
  phone: string | null;
  duty_status: DutyStatus;
}

export interface CoachDetail {
  id: number;
  faculty_id: number;
  name: string;
  designation: string;
  gender: string | null;
  date_of_birth: string | null;
  mobile: string | null;
  email: string | null;
  department: { id: number; name: string; code: string } | null;
  qualification: string | null;
  specialization: string | null;
  joined: string | null;
  coaching_experience_years: number | null;
  total_experience_years: number | null;
  discipline: Ref | null;
  duty_status: DutyStatus;
  status: string;
  certifications: string[];
  responsibilities: string[];
  teams: Ref[];
  achievements: AchievementItem[];
}

export interface CreateCoachProfileInput {
  faculty_id: number;
  discipline_id?: number;
  coaching_experience_years?: number;
  duty_status?: DutyStatus;
  certifications?: string[];
  responsibilities?: string[];
}

export function useCoaches(params?: { discipline_id?: number; duty_status?: DutyStatus; q?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "coaches", params],
    queryFn: () => apiClient.get<CoachListItem[]>("/sports-admin/coaches", params),
  });
}

export function useCoachDisciplineSummary() {
  return useQuery({
    queryKey: ["sports-admin", "coaches", "discipline-summary"],
    queryFn: () =>
      apiClient.get<{ total: number; on_duty: number; on_leave: number }>(
        "/sports-admin/coaches/discipline-summary",
      ),
  });
}

export function useCoachDetail(id: number) {
  return useQuery({
    queryKey: ["sports-admin", "coaches", id],
    queryFn: () => apiClient.get<CoachDetail>(`/sports-admin/coaches/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCoachProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCoachProfileInput) => apiClient.post<CoachListItem>("/sports-admin/coaches", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "coaches"] }),
  });
}

export function useUpdateCoachProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<Omit<CreateCoachProfileInput, "faculty_id">> & { id: number }) =>
      apiClient.patch(`/sports-admin/coaches/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "coaches"] }),
  });
}

export function useDeleteCoachProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/coaches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "coaches"] }),
  });
}
