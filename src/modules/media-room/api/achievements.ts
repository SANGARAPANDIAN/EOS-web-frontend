import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AchievementMediaType = "photo" | "video";

export interface AchievementMedia {
  id: number;
  media_type: AchievementMediaType;
  media_url: string;
  thumbnail_url: string | null;
  sequence_no: number;
}

export interface Achievement {
  id: number;
  department_id: number;
  posted_by_user_id: number;
  title: string;
  description: string | null;
  achievement_date: string | null;
  created_at: string;
  departments: { id: number; name: string };
  achievement_media: AchievementMedia[];
  _count: { achievement_comments: number };
}

export interface AchievementComment {
  id: number;
  achievement_id: number;
  commented_by_user_id: number;
  comment_text: string;
  created_at: string;
  commenter: { name: string; department: string } | null;
}

export interface AchievementDetail extends Omit<Achievement, "_count"> {
  achievement_comments: AchievementComment[];
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /department-achievements?department_id=&limit=&page= */
export function useAchievements(departmentId?: number, limit = 50) {
  return useQuery({
    queryKey: ["department-achievements", departmentId ?? "all", limit],
    queryFn: () => apiClient.get<PaginatedResponse<Achievement>>("/department-achievements", { department_id: departmentId, limit }),
  });
}

/** GET /department-achievements/:id — includes comments. */
export function useAchievement(id: number | null) {
  return useQuery({
    queryKey: ["department-achievements", id],
    queryFn: () => apiClient.get<AchievementDetail>(`/department-achievements/${id}`),
    enabled: id != null,
  });
}

export interface CreateAchievementInput {
  department_id: number;
  title: string;
  description?: string;
  achievement_date?: string;
  media: { media_type: AchievementMediaType; media_url: string; thumbnail_url?: string }[];
}

/** POST /department-achievements — Media Room only. */
export function useCreateAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAchievementInput) => apiClient.post<Achievement>("/department-achievements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["department-achievements"] }),
  });
}

/** DELETE /department-achievements/:id — own post only. */
export function useDeleteAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/department-achievements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["department-achievements"] }),
  });
}

/** POST /department-achievements/:id/comments — any authenticated user. */
export function useAddAchievementComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment_text }: { id: number; comment_text: string }) =>
      apiClient.post<AchievementComment>(`/department-achievements/${id}/comments`, { comment_text }),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ["department-achievements", id] }),
  });
}

/** DELETE /department-achievements/:id/comments/:commentId — own comment only. */
export function useRemoveAchievementComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, commentId }: { id: number; commentId: number }) =>
      apiClient.delete(`/department-achievements/${id}/comments/${commentId}`),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ["department-achievements", id] }),
  });
}
