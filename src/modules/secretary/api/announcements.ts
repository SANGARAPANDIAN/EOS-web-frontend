import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/announcements/announcements/announcements.{controller,service}.ts
// Same real backend module the Advisor portal's announcements.ts already
// uses (see src/modules/advisor/api/announcements.ts) — the Secretary role
// was added to its @Roles() guards and to resolveUserContext/
// buildRoleVisibilityQuery (treated institution-wide, like Admin/Principal,
// since no secretary→department table exists anywhere in the schema).
//
// KNOWN GAP vs the design's own 6-option audience picker: the backend only
// supports `target_audience` in {parents, teachers, students, roles,
// edc_founders, edc_inside_college, edc_all_entrepreneurs} plus class_ids/
// department_id/role_ids targeting — there is no "everyone (all classes +
// faculty)" or "class representatives"/"lab in-charges" concept on the
// backend. The composer maps the design's labels to the closest real
// backend targeting (see AUDIENCE_TO_REQUEST in announcements/page.tsx) —
// this is a genuine semantic narrowing, not an invented workaround; do not
// "fix" it by inventing new enum values that don't exist server-side.
//
// KNOWN GAP: there is no `pinned` column anywhere in the schema — pin/unpin
// is kept as local, non-persisted UI state (see page.tsx) rather than
// invented as fake persisted data.

export interface AnnouncementRow {
  id: number;
  posted_by_user_id: number;
  title: string;
  content: string;
  target_audience: "parents" | "teachers" | "students" | "roles" | "edc_founders" | "edc_inside_college" | "edc_all_entrepreneurs" | null;
  status: "draft" | "published";
  department_id: number | null;
  created_at: string;
  class_ids: number[];
  role_ids: number[];
  file_url: string | null;
  category: "academic" | "department" | "emergency" | "event" | "general" | null;
  posted_by?: { name: string; role: string; designation: string | null };
}

/** GET /announcements — bare array, not paginated. */
export function useAnnouncements() {
  return useQuery({
    queryKey: ["secretary", "announcements"],
    queryFn: () => apiClient.get<AnnouncementRow[]>("/announcements"),
  });
}

export interface BatchOption {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

/** GET /batches — any authenticated user. Used to resolve the "current"
 * batch (highest end_year) for the department/class lookups below, which
 * both require a real batch_id. */
export function useBatchesLookup() {
  return useQuery({
    queryKey: ["secretary", "announcements", "lookup", "batches"],
    queryFn: () => apiClient.get<BatchOption[]>("/batches"),
  });
}

export interface DepartmentOption {
  id: number;
  name: string;
  code: string;
}

/** GET /announcements/lookup/departments?batch_id= — Admin/Principal/Secretary. */
export function useDepartmentsLookup(batchId: number | undefined) {
  return useQuery({
    queryKey: ["secretary", "announcements", "lookup", "departments", batchId],
    queryFn: () => apiClient.get<DepartmentOption[]>(`/announcements/lookup/departments?batch_id=${batchId}`),
    enabled: batchId !== undefined,
  });
}

// Raw `classes` row shape (this endpoint returns `prisma.classes.findMany()`
// directly, unlike `lookup/assigned-classes` which maps to {id,label} — do
// not assume the two lookup endpoints share a response shape).
export interface ClassOption {
  id: number;
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester: number | null;
  classroom: string | null;
}

/** GET /announcements/lookup/classes?batch_id=&department_id= — Admin/Principal/HOD/Secretary. */
export function useClassesLookup(batchId: number | undefined, departmentId: number | undefined) {
  return useQuery({
    queryKey: ["secretary", "announcements", "lookup", "classes", batchId, departmentId],
    queryFn: () => apiClient.get<ClassOption[]>(`/announcements/lookup/classes?batch_id=${batchId}&department_id=${departmentId}`),
    enabled: batchId !== undefined && departmentId !== undefined,
  });
}

export type AnnouncementCategory = "academic" | "department" | "emergency" | "event" | "general";

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  status?: "draft" | "published";
  target_audience?: AnnouncementRow["target_audience"];
  class_ids?: number[];
  department_id?: number;
  role_ids?: number[];
  category?: AnnouncementCategory;
}

/** POST /announcements */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post("/announcements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "announcements"] }),
  });
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

/** PATCH /announcements/:id — enforces NOT_OWNER server-side (403 if this
 * secretary account didn't author the row). */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAnnouncementInput }) =>
      apiClient.patch(`/announcements/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "announcements"] }),
  });
}

/** DELETE /announcements/:id — enforces NOT_OWNER server-side. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "announcements"] }),
  });
}
