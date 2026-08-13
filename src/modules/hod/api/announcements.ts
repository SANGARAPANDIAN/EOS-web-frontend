import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AnnouncementCategory = "academic" | "department" | "emergency" | "event" | "general";

export interface HodAnnouncement {
  id: number;
  title: string;
  content: string;
  target_audience: "parents" | "teachers" | "students" | "roles";
  status: "draft" | "published";
  category: AnnouncementCategory | null;
  scheduled_at: string | null;
  created_at: string;
  class_ids: number[];
  classes: { id: number; label: string }[];
  posted_by: { role: string; department_code: string | null } | null;
}

/** GET /announcements — real visibility scoping already applied server-side per role. */
export function useHodAnnouncements() {
  return useQuery({
    queryKey: ["hod", "announcements"],
    queryFn: () => apiClient.get<HodAnnouncement[]>("/announcements"),
  });
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  target_audience: "parents" | "teachers" | "students" | "roles";
  class_ids: number[];
  status?: "draft" | "published";
  category?: AnnouncementCategory;
  scheduled_at?: string;
}

/** POST /announcements */
export function useCreateHodAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post("/announcements", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hod", "announcements"] });
      // The dashboard's own "Announcements" widget reads its latest-3 list
      // from a separate query (GET /hod/dashboard) — without this it stays
      // stale (still showing the pre-creation list) until something else
      // happens to invalidate it.
      queryClient.invalidateQueries({ queryKey: ["hod", "dashboard"] });
    },
  });
}
