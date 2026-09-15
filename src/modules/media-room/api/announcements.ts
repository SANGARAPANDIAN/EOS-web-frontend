import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AnnouncementCategory = "academic" | "department" | "emergency" | "event" | "general";
export const SOCIAL_POST_FORMATS = ["Post", "Photo carousel", "Video", "Announcement card"] as const;
export type SocialPostFormat = (typeof SOCIAL_POST_FORMATS)[number];

export interface SocialPostDetails {
  format: string | null;
  link_url: string | null;
  expires_at: string | null;
  is_pinned: boolean;
  allow_comments: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: AnnouncementCategory | null;
  target_audience: string;
  status: "draft" | "published";
  created_at: string;
  scheduled_at: string | null;
  file_url: string | null;
  file_name: string | null;
  class_ids: number[];
  posted_by?: { name: string; role: string; designation: string | null };
  comment_count?: number;
  unanswered_count?: number;
  social?: SocialPostDetails;
}

export interface AnnouncementComment {
  id: number;
  announcement_id: number;
  commented_by_user_id: number;
  comment_text: string;
  parent_comment_id: number | null;
  created_at: string;
  commenter_name: string | null;
}

/** GET /announcements/lookup/all-classes — every class in one flat list, for an institution-wide post. */
export function useAllClassIds() {
  return useQuery({
    queryKey: ["announcements", "lookup", "all-classes"],
    queryFn: () => apiClient.get<number[]>("/announcements/lookup/all-classes"),
    staleTime: 30 * 60_000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be well above staleTime — same reasoning, same reference-data tier.
    gcTime: 60 * 60_000,
  });
}

/** GET /announcements — Media Room only ever sees its own posts here (no class/department scope of its own). */
export function useMyAnnouncements() {
  return useQuery({
    queryKey: ["announcements", "mine"],
    queryFn: () => apiClient.get<Announcement[]>("/announcements"),
    refetchInterval: 60_000,
  });
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  category?: AnnouncementCategory;
  class_ids: number[];
  file_key?: string;
  file_name?: string;
  status?: "draft" | "published";
  scheduled_at?: string;
  format?: string;
  link_url?: string;
  expires_at?: string;
  is_pinned?: boolean;
  allow_comments?: boolean;
  first_comment?: string;
  /** Ordered carousel items. Array order becomes sequence_no server-side. */
  media?: {
    storage_key: string;
    media_type: "photo" | "video";
    width?: number;
    height?: number;
    duration_seconds?: number;
  }[];
}

/** POST /announcements — target_audience is always 'students' (the "College App" audience) for Media Room. */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      apiClient.post<Announcement>("/announcements", { target_audience: "students", status: "published", ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements", "mine"] }),
  });
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  status?: "draft" | "published";
  target_audience?: string;
  class_ids?: number[];
  is_pinned?: boolean;
  allow_comments?: boolean;
}

/** PATCH /announcements/:id */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateAnnouncementInput & { id: number }) =>
      apiClient.patch<Announcement>(`/announcements/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements", "mine"] }),
  });
}

/** DELETE /announcements/:id — own post only. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements", "mine"] }),
  });
}

/** GET /announcements/:id/comments */
export function useAnnouncementComments(announcementId: number | null) {
  return useQuery({
    queryKey: ["announcements", "comments", announcementId],
    queryFn: () => apiClient.get<AnnouncementComment[]>(`/announcements/${announcementId}/comments`),
    enabled: announcementId !== null,
  });
}

/** POST /announcements/:id/comments — comment_text, optionally replying via parent_comment_id. */
export function useAddComment(announcementId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { comment_text: string; parent_comment_id?: number }) =>
      apiClient.post<AnnouncementComment>(`/announcements/${announcementId}/comments`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", "comments", announcementId] });
      queryClient.invalidateQueries({ queryKey: ["announcements", "mine"] });
    },
  });
}

/** DELETE /announcements/:id/comments/:commentId */
export function useDeleteComment(announcementId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => apiClient.delete(`/announcements/${announcementId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", "comments", announcementId] });
      queryClient.invalidateQueries({ queryKey: ["announcements", "mine"] });
    },
  });
}
