import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AnnouncementCategory = "academic" | "department" | "emergency" | "event" | "general";

export interface HostelAnnouncement {
  id: number;
  title: string;
  content: string;
  category: AnnouncementCategory | null;
  target_audience: string;
  by: string;
  created_at: string;
}

/** GET /hostel/announcements — shared hostel notice board across both wardens. */
export function useHostelAnnouncements() {
  return useQuery({
    queryKey: ["hostel", "announcements"],
    queryFn: () => apiClient.get<HostelAnnouncement[]>("/hostel/announcements"),
  });
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  category?: AnnouncementCategory;
}

/** POST /hostel/announcements */
export function useCreateHostelAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post<HostelAnnouncement>("/hostel/announcements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel", "announcements"] }),
  });
}
