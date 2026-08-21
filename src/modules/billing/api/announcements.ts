import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/announcements/announcements/
// announcements.{controller,service}.ts — the SAME real backend module the
// Secretary Portal uses (src/modules/secretary/api/announcements.ts) — the
// Billing role was added to its @Roles() guards and to resolveUserContext/
// buildRoleVisibilityQuery/departmentId-resolution/assertRoleTargetingPermitted
// (treated institution-wide, like Secretary/Admin/Principal, since no
// billing->department table exists anywhere in the schema).
//
// KNOWN GAP vs the design's own 4-tag/5-audience picker: the backend only
// supports `target_audience` in {parents, teachers, students, roles,
// edc_founders, edc_inside_college, edc_all_entrepreneurs} plus class_ids/
// department_id/role_ids targeting, and `category` in {academic,
// department, emergency, event, general} — there is no "URGENT"/"FEES"/
// "SCHOLARSHIP" category and no "Students with dues" audience on the real
// backend. The composer maps the design's labels to the closest real
// backend values (see the page's own AUDIENCE_OPTIONS/CATEGORY_OPTIONS) —
// a genuine semantic narrowing, not an invented workaround.

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
    queryKey: ["billing", "announcements"],
    queryFn: () => apiClient.get<AnnouncementRow[]>("/announcements"),
  });
}

export interface BatchOption {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

/** GET /batches — any authenticated user. */
export function useBatchesLookup() {
  return useQuery({
    queryKey: ["billing", "announcements", "lookup", "batches"],
    queryFn: () => apiClient.get<BatchOption[]>("/batches"),
  });
}

export interface DepartmentOption {
  id: number;
  name: string;
  code: string;
}

/** GET /announcements/lookup/departments?batch_id= — now allows Billing. */
export function useDepartmentsLookup(batchId: number | undefined) {
  return useQuery({
    queryKey: ["billing", "announcements", "lookup", "departments", batchId],
    queryFn: () => apiClient.get<DepartmentOption[]>(`/announcements/lookup/departments?batch_id=${batchId}`),
    enabled: batchId !== undefined,
  });
}

export interface ClassOption {
  id: number;
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester: number | null;
  classroom: string | null;
}

/** GET /announcements/lookup/classes?batch_id=&department_id= — now allows Billing. */
export function useClassesLookup(batchId: number | undefined, departmentId: number | undefined) {
  return useQuery({
    queryKey: ["billing", "announcements", "lookup", "classes", batchId, departmentId],
    queryFn: () => apiClient.get<ClassOption[]>(`/announcements/lookup/classes?batch_id=${batchId}&department_id=${departmentId}`),
    enabled: batchId !== undefined && departmentId !== undefined,
  });
}

/** GET /announcements/lookup/all-classes — Billing sees every class in one
 * flat list (institution-wide, no department scope), same real endpoint
 * the Higher Education Cell uses. */
export function useAllClassesLookup() {
  return useQuery({
    queryKey: ["billing", "announcements", "lookup", "all-classes"],
    queryFn: () => apiClient.get<number[]>("/announcements/lookup/all-classes"),
  });
}

export interface DepartmentClass {
  id: number;
  department_id: number;
  current_semester: number | null;
}

/** Real final-year class ids, computed by looping every real department's
 * real classes (current_semester >= 7 = final year of an 8-semester
 * programme) — used so "Final year students" genuinely targets only
 * final-year classes, not everyone. Requires department_id + batch_id per
 * department's own most-recent batch; simplified here to the single
 * "current" batch already resolved by the caller. */
export function useFinalYearClassIds(batchId: number | undefined, departmentIds: number[]) {
  return useQuery({
    queryKey: ["billing", "announcements", "final-year-classes", batchId, departmentIds],
    queryFn: async () => {
      const perDept = await Promise.all(
        departmentIds.map((deptId) => apiClient.get<DepartmentClass[]>(`/announcements/lookup/classes?batch_id=${batchId}&department_id=${deptId}`)),
      );
      return perDept.flat().filter((c) => (c.current_semester ?? 0) >= 7).map((c) => c.id);
    },
    enabled: batchId !== undefined && departmentIds.length > 0,
  });
}

export interface RoleOption {
  id: number;
  name: string;
  description: string | null;
}

/** GET /announcements/lookup/roles — Billing can now target by role (for
 * "All HoDs"), same real endpoint Admin/Principal use. */
export function useRolesLookup() {
  return useQuery({
    queryKey: ["billing", "announcements", "lookup", "roles"],
    queryFn: () => apiClient.get<RoleOption[]>("/announcements/lookup/roles"),
  });
}

// Shared real-category <-> design-tag mapping, used by both the
// Announcements page and the Dashboard's announcement preview card, so
// the two stay consistent (single source of truth instead of duplicating
// the mapping in two files).
export const REAL_TO_TAG: Record<string, string> = { emergency: "URGENT", department: "FEES", academic: "SCHOLARSHIP", general: "GENERAL" };
export function announcementTagColors(t: string): { bg: string; fg: string } {
  const c: Record<string, [string, string]> = { URGENT: ["#f1f5f9", "#0f2d6b"], FEES: ["#eef3ff", "#1d4ed8"], SCHOLARSHIP: ["#eef3ff", "#1d4ed8"], GENERAL: ["#f1f5f9", "#334155"] };
  const [bg, fg] = c[t] ?? ["#f1f5f9", "#334155"];
  return { bg, fg };
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "announcements"] }),
  });
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

/** PATCH /announcements/:id — enforces NOT_OWNER server-side (403 if this
 * billing account didn't author the row). */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAnnouncementInput }) =>
      apiClient.patch(`/announcements/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "announcements"] }),
  });
}

/** DELETE /announcements/:id — enforces NOT_OWNER server-side. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "announcements"] }),
  });
}
