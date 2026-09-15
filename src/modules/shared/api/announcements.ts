import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AnnouncementCategory = "academic" | "department" | "emergency" | "event" | "general";

export interface Announcement {
  id: number;
  posted_by_user_id: number;
  title: string;
  content: string;
  target_audience: string;
  category: string | null;
  batch_id: number | null;
  department_id: number | null;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  /** Real column, added for EDC's composer — null for every role that has no priority concept. */
  priority: string | null;
  status: string;
  class_ids: number[];
  role_ids: number[];
  /** Only populated by GET /announcements and GET /announcements/:id (the student-facing reads). */
  posted_by?: { name: string; role: string; designation: string | null; department: string | null };
  /** Human-readable labels for class_ids/role_ids (e.g. "CSE-A", "hod") — resolved server-side. */
  class_labels?: string[];
  role_labels?: string[];
}

/** GET /announcements — visibility-filtered server-side by the caller's role/class/department. */
export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiClient.get<Announcement[]>("/announcements"),
  });
}

export interface AnnouncementRole {
  id: number;
  name: string;
  description: string | null;
}

/**
 * GET /announcements/lookup/roles — every backend role, for targeting a
 * specific role directly (e.g. HOD/HR/Placement). Gated server-side to a
 * handful of oversight-tier roles — pass `enabled: false` for any caller
 * whose audience options never need a role lookup, so this never fires (and
 * 403s) for a role that isn't on that allowlist.
 */
export function useAnnouncementRoles(enabled = true) {
  return useQuery({
    queryKey: ["announcements", "lookup", "roles"],
    queryFn: () => apiClient.get<AnnouncementRole[]>("/announcements/lookup/roles"),
    staleTime: 30 * 60_000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be well above staleTime — same reasoning, same reference-data tier.
    gcTime: 60 * 60_000,
    enabled,
  });
}

/**
 * GET /announcements/lookup/all-classes — every class in one flat list, for
 * an institution-wide "every student" broadcast. Same enabled-gating
 * reasoning as useAnnouncementRoles — only a handful of roles may call this.
 */
export function useAllAnnouncementClassIds(enabled = true) {
  return useQuery({
    queryKey: ["announcements", "lookup", "all-classes"],
    queryFn: () => apiClient.get<number[]>("/announcements/lookup/all-classes"),
    staleTime: 30 * 60_000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be well above staleTime — same reasoning, same reference-data tier.
    gcTime: 60 * 60_000,
    enabled,
  });
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  category?: AnnouncementCategory;
  target_audience: string;
  class_ids?: number[];
  role_ids?: number[];
  priority?: string;
  status?: "draft" | "published";
}

/** POST /announcements — real audience choice, shape varies by caller's role (see AudienceOption). */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      apiClient.post<Announcement>("/announcements", { status: "published", ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

/** PATCH /announcements/:id — own post only; the backend rejects updating someone else's with a real 403. */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateAnnouncementInput> }) =>
      apiClient.patch<Announcement>(`/announcements/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

/** DELETE /announcements/:id — own post only; the backend rejects deleting someone else's with a real 403. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
