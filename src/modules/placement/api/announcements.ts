import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";

// `roles` is intentionally excluded here — CreateAnnouncementDto has no
// role_ids field, so an officer picking "roles" audience through this
// composer would create a post nobody's role-mapping ever points at.
export type AnnouncementAudience = "students" | "teachers" | "parents";

export type AnnouncementStatus = "draft" | "published";

export const ANNOUNCEMENT_CATEGORIES = ["academic", "department", "emergency", "event", "general"] as const;

export interface AnnouncementListItem {
  id: number;
  postedByUserId: number;
  title: string;
  content: string;
  targetAudience: AnnouncementAudience | "roles";
  status: AnnouncementStatus;
  /** Real once query.md #2 runs (`announcements` gets the column) — null until then. */
  category: string | null;
  createdAt: string;
  fileUrl: string | null;
  fileName: string | null;
  classIds: number[];
  classLabels: string[];
  roleLabels: string[];
  postedBy: { name: string; role: string; designation: string | null; department: string | null };
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  targetAudience: AnnouncementAudience;
  classIds: number[];
  status?: AnnouncementStatus;
  category?: string;
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

interface BackendAnnouncement {
  id: number;
  posted_by_user_id: number;
  title: string;
  content: string;
  target_audience: string;
  status: string;
  category: string | null;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  class_ids?: number[];
  class_labels?: string[];
  role_labels?: string[];
  posted_by?: { name: string; role: string; designation: string | null; department: string | null };
}

function toAnnouncement(a: BackendAnnouncement): AnnouncementListItem {
  return {
    id: a.id,
    postedByUserId: a.posted_by_user_id,
    title: a.title,
    content: a.content,
    targetAudience: a.target_audience as AnnouncementListItem["targetAudience"],
    status: a.status as AnnouncementListItem["status"],
    category: a.category,
    createdAt: a.created_at,
    fileUrl: a.file_url,
    fileName: a.file_name,
    classIds: a.class_ids ?? [],
    classLabels: a.class_labels ?? [],
    roleLabels: a.role_labels ?? [],
    postedBy: a.posted_by ?? { name: "—", role: "—", designation: null, department: null },
  };
}

function toBackendInput(input: CreateAnnouncementInput | UpdateAnnouncementInput) {
  return {
    title: input.title,
    content: input.content,
    target_audience: input.targetAudience,
    class_ids: input.classIds,
    status: input.status,
    category: input.category,
  };
}

export function useAnnouncements() {
  return useQuery({
    queryKey: placementKeys.announcements(),
    queryFn: async () => {
      const rows = await apiClient.get<BackendAnnouncement[]>("/announcements");
      return rows.map(toAnnouncement);
    },
  });
}

function useInvalidateAnnouncements() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: placementKeys.announcements() });
}

export function useCreateAnnouncement() {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: async (input: CreateAnnouncementInput) =>
      toAnnouncement(await apiClient.post<BackendAnnouncement>("/announcements", toBackendInput(input))),
    onSuccess: invalidate,
  });
}

export function useUpdateAnnouncement() {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateAnnouncementInput }) =>
      toAnnouncement(await apiClient.patch<BackendAnnouncement>(`/announcements/${id}`, toBackendInput(input))),
    onSuccess: invalidate,
  });
}

export function useDeleteAnnouncement() {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number }>(`/announcements/${id}`),
    onSuccess: invalidate,
  });
}
