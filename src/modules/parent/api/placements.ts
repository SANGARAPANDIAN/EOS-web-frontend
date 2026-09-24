import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { UpcomingDrive, DriveHistoryRow } from "@/modules/student/api/placements";

export type { UpcomingDrive, DriveHistoryRow } from "@/modules/student/api/placements";

/** GET /me/children/:id/upcoming-drives — drives the child is shortlisted/applied for. Read-only: no "apply" action from the parent portal. */
export function useChildUpcomingDrives(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "upcoming-drives"],
    queryFn: () => apiClient.get<UpcomingDrive[]>(`/me/children/${childId}/upcoming-drives`),
    enabled: childId !== null,
  });
}

/** GET /me/children/:id/placement-history */
export function useChildPlacementHistory(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "placement-history"],
    queryFn: () => apiClient.get<DriveHistoryRow[]>(`/me/children/${childId}/placement-history`),
    enabled: childId !== null,
  });
}
