import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/announcements/announcements/announcements.{controller,service}.ts
// — the same real backend module every other portal's Announcements page
// uses (see src/modules/secretary/api/announcements.ts for the closest
// precedent). ROLES.STATIONARY was added to its create/update/delete/
// attachment @Roles() guards; resolveUserContext falls back to its generic
// `default:` case for this role (institution-wide, no department linkage —
// same posture as Billing/Finance), which is enough for a vendor account
// that only ever posts and manages its own notices.
//
// KNOWN GAP vs the design's 4-option audience picker (All users/Students/
// Staff/Selected departments): one `announcements` row can only carry one
// target_audience, so "All users" and "Selected departments" each publish
// two real rows (students + teachers) — see requestsForAudience() below.
// This mirrors the exact gap already documented in secretary's own
// announcements.ts, not an invented workaround.

export type AnnouncementCategory = "academic" | "department" | "emergency" | "event" | "general";

export interface AnnouncementRow {
  id: number;
  posted_by_user_id: number;
  title: string;
  content: string;
  target_audience: "teachers" | "students" | null;
  status: "draft" | "published";
  department_id: number | null;
  category: AnnouncementCategory | null;
  created_at: string;
  class_ids: number[];
  posted_by?: { name: string; role: string; designation: string | null };
}

/** GET /announcements — this vendor account only ever sees its own posts (no department/class scope of its own). */
export function useStationaryAnnouncements() {
  return useQuery({
    queryKey: ["stationary", "announcements"],
    queryFn: () => apiClient.get<AnnouncementRow[]>("/announcements"),
  });
}

/** GET /announcements/lookup/all-classes — every class in the institution, for the "Students"/"All users" audiences. */
export function useAllClassIds() {
  return useQuery({
    queryKey: ["stationary", "announcements", "lookup", "all-classes"],
    queryFn: () => apiClient.get<number[]>("/announcements/lookup/all-classes"),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
}

export interface BatchOption {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

/** GET /batches — used to resolve the "current" batch for the department class lookup below. */
export function useBatchesLookup() {
  return useQuery({
    queryKey: ["stationary", "announcements", "lookup", "batches"],
    queryFn: () => apiClient.get<BatchOption[]>("/batches"),
  });
}

export interface ClassOption {
  id: number;
  batch_id: number;
  department_id: number;
}

/** GET /announcements/lookup/classes?batch_id=&department_id= — for the "Selected departments" audience. */
export function useDepartmentClassesLookup(batchId: number | undefined, departmentId: number | undefined) {
  return useQuery({
    queryKey: ["stationary", "announcements", "lookup", "classes", batchId, departmentId],
    queryFn: () => apiClient.get<ClassOption[]>(`/announcements/lookup/classes?batch_id=${batchId}&department_id=${departmentId}`),
    enabled: batchId !== undefined && departmentId !== undefined,
  });
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  status?: "draft" | "published";
  target_audience?: "teachers" | "students";
  class_ids?: number[];
  department_id?: number;
  category?: AnnouncementCategory;
}

/** POST /announcements */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post("/announcements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "announcements"] }),
  });
}

/** PATCH /announcements/:id — enforces NOT_OWNER server-side. */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateAnnouncementInput> }) =>
      apiClient.patch(`/announcements/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "announcements"] }),
  });
}

/** DELETE /announcements/:id — enforces NOT_OWNER server-side. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "announcements"] }),
  });
}
