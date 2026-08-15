import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Achievement {
  id: number;
  title: string;
  sub: string;
  meta: string;
  badge: string;
  level: string | null;
  event_name: string;
  result: string;
  achievement_date: string;
  venue: string | null;
  certificate_url: string | null;
  team_id: number | null;
  athlete_student_id: number | null;
}

export interface CreateAchievementInput {
  event_name: string;
  result: string;
  achievement_date: string;
  level?: string;
  venue?: string;
  certificate_url?: string;
  team_id?: number;
  athlete_student_id?: number;
}

export function useAchievements(params?: { level?: string; q?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "achievements", params],
    queryFn: () => apiClient.get<Achievement[]>("/sports-admin/achievements", params),
  });
}

export function useCreateAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAchievementInput) => apiClient.post<Achievement>("/sports-admin/achievements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "achievements"] }),
  });
}

export function useUpdateAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateAchievementInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/achievements/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "achievements"] }),
  });
}

export function useDeleteAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/achievements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "achievements"] }),
  });
}
