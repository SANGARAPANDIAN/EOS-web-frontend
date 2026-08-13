import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/announcements/announcements/announcements.{controller,service}.ts
// Exact shapes confirmed by reading AnnouncementsService.toResponseShape and
// CreateAnnouncementDto directly (previous version of this file invented a
// `scope`/`body`/`class_name` shape that doesn't exist on the backend at
// all — that mismatch is what caused every announcement field to render
// blank/undefined and the "duplicate key" warning, since `class_id` was
// always undefined).

export interface AnnouncementRow {
  id: number;
  posted_by_user_id: number;
  title: string;
  content: string;
  target_audience: "parents" | "teachers" | "students" | "roles" | null;
  status: "draft" | "published";
  department_id: number | null;
  created_at: string;
  class_ids: number[];
  role_ids: number[];
  file_url: string | null;
  posted_by?: { name: string; role: string; designation: string | null };
}

/** GET /announcements — bare array, not paginated. */
export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiClient.get<AnnouncementRow[]>("/announcements"),
  });
}

// Real shape confirmed via curl: GET /announcements/lookup/assigned-classes
// returns [{id, label}] — NOT {class_id, class_name, section}.
export interface AssignedClassOption {
  id: number;
  label: string;
}

/** GET /announcements/lookup/assigned-classes */
export function useAssignedClassesLookup() {
  return useQuery({
    queryKey: ["announcements", "lookup", "assigned-classes"],
    queryFn: () => apiClient.get<AssignedClassOption[]>("/announcements/lookup/assigned-classes"),
  });
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  status?: "draft" | "published";
  target_audience?: "parents" | "teachers" | "students" | "roles";
  class_ids?: number[];
  department_id?: number;
  role_ids?: number[];
}

/** POST /announcements */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post("/announcements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

/** PATCH /announcements/:id — real backend route, was never wired on the
 * frontend at all (only create existed). Enforces NOT_OWNER server-side, so
 * this will 403 if the signed-in faculty didn't author the announcement. */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAnnouncementInput }) =>
      apiClient.patch(`/announcements/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

/** DELETE /announcements/:id */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
