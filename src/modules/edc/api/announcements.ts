import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/announcements/announcements/{announcements.controller,announcements.service}.ts
// (shared with the Advisor module — same table, same service). This session
// added: the `edc_coordinator` role, three new target_audience_enum values
// (edc_founders/edc_inside_college/edc_all_entrepreneurs — plain broadcast
// labels with no class/department/role targeting behind them, since no
// "founders" recipient list exists anywhere in the schema), and a real
// `priority` column (free text, no fixed severity enum exists elsewhere to
// reuse). Visibility for edc_coordinator (see buildRoleVisibilityQuery) is
// "own-authored, or explicitly role-targeted at edc_coordinator" — there is
// no way yet for this to fan out to real founder/student recipients.

export type EdcAudience = "edc_founders" | "edc_inside_college" | "edc_all_entrepreneurs";

export const EDC_AUDIENCE_LABELS: Record<EdcAudience, string> = {
  edc_founders: "All founders",
  edc_inside_college: "Ventures inside college",
  edc_all_entrepreneurs: "Student entrepreneurs",
};

export interface EdcAnnouncementRow {
  id: number;
  title: string;
  content: string;
  target_audience: string;
  priority: string | null;
  status: "draft" | "published";
  created_at: string;
  posted_by?: { name: string; role: string; designation: string | null };
}

/** GET /announcements — bare array, not paginated. */
export function useEdcAnnouncements() {
  return useQuery({
    queryKey: ["edc", "announcements"],
    queryFn: () => apiClient.get<EdcAnnouncementRow[]>("/announcements"),
  });
}

export interface CreateEdcAnnouncementInput {
  title: string;
  content: string;
  target_audience: EdcAudience;
  priority?: string;
  status?: "draft" | "published";
}

/** POST /announcements */
export function useCreateEdcAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEdcAnnouncementInput) => apiClient.post("/announcements", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "announcements"] }),
  });
}

/** PATCH /announcements/:id — own post only (enforced server-side). Added
 * this session — `priority` wasn't even on the backend's UpdateAnnouncementDto
 * before (only Create had it), fixed there too. */
export function useUpdateEdcAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateEdcAnnouncementInput> }) =>
      apiClient.patch(`/announcements/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "announcements"] }),
  });
}

/** DELETE /announcements/:id — own post only (enforced server-side). */
export function useDeleteEdcAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "announcements"] }),
  });
}
