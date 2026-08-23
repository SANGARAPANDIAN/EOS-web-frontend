import { useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsService } from "../services/announcements.service";
import { placementKeys } from "../query-keys";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "../types";

function useInvalidateAnnouncements() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: placementKeys.announcements() });
}

export function useCreateAnnouncement() {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => announcementsService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAnnouncement() {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAnnouncementInput }) =>
      announcementsService.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAnnouncement() {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: (id: number) => announcementsService.remove(id),
    onSuccess: invalidate,
  });
}
