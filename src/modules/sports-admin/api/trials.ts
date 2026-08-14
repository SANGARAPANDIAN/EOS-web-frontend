import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AchievementItem, Ref } from "./types";

export type TrialStatus = "pending" | "selected" | "hold";

export interface TrialListItem {
  id: number;
  student: Ref;
  dept_code: string | null;
  year_sem: string | null;
  discipline: Ref;
  target_team: Ref | null;
  round_label: string | null;
  trial_at: string;
  status: TrialStatus;
}

export interface TrialScore {
  id?: number;
  criterion: string;
  score: string;
  sort_order?: number;
}

export interface TrialDetail {
  id: number;
  student: {
    id: number;
    name: string;
    reg_no: string | null;
    dept: { id: number; name: string; code: string } | null;
    year: number | null;
    sem: number | null;
    section: string | null;
    mobile: string | null;
    email: string | null;
    dob: string | null;
    gender: string | null;
  };
  discipline: Ref;
  target_team: Ref | null;
  round_label: string | null;
  trial_at: string;
  facility: Ref | null;
  panel: string | null;
  status: TrialStatus;
  recommendation: string | null;
  scores: TrialScore[];
  achievements: AchievementItem[];
}

export interface CreateTrialInput {
  student_id: number;
  discipline_id: number;
  target_team_id?: number;
  round_label?: string;
  trial_at: string;
  facility_id?: number;
  panel?: string;
  scores?: TrialScore[];
}

export function useTrials(params?: { discipline_id?: number; status?: TrialStatus; q?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "trials", params],
    queryFn: () => apiClient.get<TrialListItem[]>("/sports-admin/trials", params),
  });
}

export function useTrialDetail(id: number) {
  return useQuery({
    queryKey: ["sports-admin", "trials", id],
    queryFn: () => apiClient.get<TrialDetail>(`/sports-admin/trials/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTrialInput) => apiClient.post<TrialListItem>("/sports-admin/trials", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "trials"] }),
  });
}

export function useUpdateTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateTrialInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/trials/${id}`, input),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "trials"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "trials", v.id] });
    },
  });
}

export function useDeleteTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/trials/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "trials"] }),
  });
}

export function useSelectTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recommendation }: { id: number; recommendation?: string }) =>
      apiClient.post(`/sports-admin/trials/${id}/select`, { recommendation }),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "trials"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "trials", v.id] });
    },
  });
}

export function useHoldTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/sports-admin/trials/${id}/hold`),
    onSuccess: (_d, id) => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "trials"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "trials", id] });
    },
  });
}
