"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// The SAME shared backend module every other portal uses
// (EOSbackend1/src/modules/announcements/announcements/*). The Finance role was
// added to its @Roles() guards and to resolveUserContext /
// buildRoleVisibilityQuery / departmentId resolution /
// assertRoleTargetingPermitted — treated institution-wide like Secretary and
// Billing, since no finance->department table exists anywhere in the schema.
//
// Only the react-query key namespace differs from the Billing copy, so the two
// portals' caches stay independent.

const KEY = ["finance", "announcements"] as const;

export interface AnnouncementRow {
  id: number;
  posted_by_user_id: number;
  title: string;
  content: string;
  target_audience:
    | "parents"
    | "teachers"
    | "students"
    | "roles"
    | "edc_founders"
    | "edc_inside_college"
    | "edc_all_entrepreneurs"
    | null;
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
    queryKey: KEY,
    queryFn: () => apiClient.get<AnnouncementRow[]>("/announcements"),
  });
}

export interface RoleOption {
  id: number;
  name: string;
  description: string | null;
}

/** GET /announcements/lookup/roles — for the "target specific roles" option. */
export function useRolesLookup() {
  return useQuery({
    queryKey: [...KEY, "lookup", "roles"],
    queryFn: () => apiClient.get<RoleOption[]>("/announcements/lookup/roles"),
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post("/announcements", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

/**
 * PATCH /announcements/:id — the backend enforces NOT_OWNER (403 if this
 * Finance account did not author the row), so edit/delete are only offered in
 * the UI for rows this user posted.
 */
export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAnnouncementInput }) =>
      apiClient.patch(`/announcements/${id}`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** DELETE /announcements/:id — also NOT_OWNER-guarded server-side. */
export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Real backend categories, labelled for the composer. */
export const CATEGORY_OPTIONS: Array<{ value: AnnouncementCategory; label: string }> = [
  { value: "general", label: "General" },
  { value: "emergency", label: "Urgent" },
  { value: "academic", label: "Academic" },
  { value: "department", label: "Department" },
  { value: "event", label: "Event" },
];

/** Real backend audiences. Finance posts institution-wide, so no class targeting. */
export const AUDIENCE_OPTIONS: Array<{ value: NonNullable<AnnouncementRow["target_audience"]>; label: string }> = [
  { value: "teachers", label: "All faculty" },
  { value: "students", label: "All students" },
  { value: "parents", label: "All parents" },
  { value: "roles", label: "Specific roles" },
];

export function categoryTone(category: string | null): "neutral" | "info" | "good" | "warn" | "bad" {
  if (category === "emergency") return "bad";
  if (category === "academic") return "info";
  if (category === "department") return "warn";
  if (category === "event") return "good";
  return "neutral";
}
