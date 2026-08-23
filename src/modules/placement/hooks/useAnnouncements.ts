import { useQuery } from "@tanstack/react-query";
import { announcementsService } from "../services/announcements.service";
import { placementKeys } from "../query-keys";

export function useAnnouncements() {
  return useQuery({
    queryKey: placementKeys.announcements(),
    queryFn: announcementsService.list,
  });
}
