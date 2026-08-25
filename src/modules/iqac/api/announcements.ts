import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AnnouncementCategory = "academic" | "department" | "emergency" | "event" | "general";

export type AnnouncementAudience = "students" | "teachers" | "roles";

export interface AnnouncementRole {
  id: number;
  name: string;
  description: string | null;
}

/** GET /announcements/lookup/roles — every backend role, for targeting HOD/HR/Placement directly. */
export function useAnnouncementRoles() {
  return useQuery({
    queryKey: ["announcements", "lookup", "roles"],
    queryFn: () => apiClient.get<AnnouncementRole[]>("/announcements/lookup/roles"),
    staleTime: 30 * 60_000,
  });
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: AnnouncementCategory | null;
  target_audience: string;
  status: "draft" | "published";
  created_at: string;
  posted_by?: { name: string; role: string; designation: string | null };
}

/** GET /announcements — IQAC sees every real announcement institution-wide (oversight tier, same as Admin/Principal/Secretary/Billing), not just its own posts. */
export function useAllAnnouncements() {
  return useQuery({
    queryKey: ["iqac", "announcements", "all"],
    queryFn: () => apiClient.get<Announcement[]>("/announcements"),
    refetchInterval: 60_000,
  });
}

/** GET /announcements/lookup/all-classes — every class in one flat list, for an institution-wide post. */
export function useAllClassIds() {
  return useQuery({
    queryKey: ["announcements", "lookup", "all-classes"],
    queryFn: () => apiClient.get<number[]>("/announcements/lookup/all-classes"),
    staleTime: 30 * 60_000,
  });
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  category?: AnnouncementCategory;
  target_audience: AnnouncementAudience;
  /** Required for 'students' (institution-wide = every class id). Omitted for 'teachers'/'roles'. */
  class_ids?: number[];
  /** Required for 'roles' — the specific backend role(s) to address (e.g. HOD, HR, Placement). */
  role_ids?: number[];
  status?: "draft" | "published";
}

/** POST /announcements — real audience choice (students/teachers/specific roles), same oversight-tier posting capability as Admin/Principal. */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      apiClient.post<Announcement>("/announcements", { status: "published", ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["iqac", "announcements", "all"] }),
  });
}

/** DELETE /announcements/:id — own post only; the backend rejects deleting someone else's with a real 403. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["iqac", "announcements", "all"] }),
  });
}
