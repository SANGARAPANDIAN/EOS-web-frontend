import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AnnouncementCategory = "trials" | "facility" | "intramural" | "general";

export interface SportsAnnouncement {
  id: number;
  title: string;
  sub: string;
  category: AnnouncementCategory;
  posted_at: string;
  posted_by: { id: number; email: string };
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  category?: AnnouncementCategory;
}

export function useSportsAnnouncements(params?: { category?: AnnouncementCategory; q?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "announcements", params],
    queryFn: () => apiClient.get<SportsAnnouncement[]>("/sports-admin/announcements", params),
  });
}

export function useCreateSportsAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post<SportsAnnouncement>("/sports-admin/announcements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "announcements"] }),
  });
}

export function useDeleteSportsAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "announcements"] }),
  });
}
