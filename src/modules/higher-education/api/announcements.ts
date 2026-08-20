import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AnnouncementCategory = "emergency" | "department" | "academic" | "event" | "general";

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  category?: AnnouncementCategory;
}

/**
 * POST /announcements — always target_audience: 'students', every class
 * (fetched fresh from /announcements/lookup/all-classes on submit). The
 * cell has no department/batch scope of its own, so its announcements are
 * always students-wide — there's no audience picker to show.
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      const classIds = await apiClient.get<number[]>("/announcements/lookup/all-classes");
      return apiClient.post("/announcements", { ...input, target_audience: "students", class_ids: classIds });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

/** DELETE /announcements/:id — only the poster (or Admin) may delete; enforced server-side. */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
