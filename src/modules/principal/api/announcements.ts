import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ClassRow {
  id: number;
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester: number | null;
}

/** GET /classes — open to any authenticated role (no @Roles guard on this handler). Used to build the announcement composer's class picker. */
export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: () => apiClient.get<ClassRow[]>("/classes"),
  });
}

// Departments moved to the app-wide shared lookup at @/modules/shared/api/departments.

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  target_audience: "students" | "teachers" | "parents";
  class_ids: number[];
  /** Omit for the column's own default (published). */
  status?: "draft" | "published";
  /** Saved once query.md #2 is run — silently dropped (not an error) until then. */
  category?: "academic" | "department" | "emergency" | "event" | "general";
}

export interface CreatedAnnouncement {
  id: number;
  status: string;
}

/**
 * POST /announcements. Only "students" / "teachers" / "parents" are offered
 * here (not the DTO's 4th option, "roles"): the backend's create() only
 * ever writes announcement_class_mapping rows, never announcement_role_
 * mapping — so a "roles"-targeted announcement would save but reach no
 * one. Not offering it is more honest than a button that silently does
 * nothing useful.
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => apiClient.post<CreatedAnnouncement>("/announcements", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

/** POST /announcements/:id/attachment — real Supabase Storage upload (announcement_attachments bucket, already configured). */
export function useUploadAnnouncementAttachment() {
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.postForm(`/announcements/${id}/attachment`, formData);
    },
  });
}
