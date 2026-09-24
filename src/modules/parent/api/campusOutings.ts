import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { CampusOuting } from "@/modules/student/api/campusOutings";

export type { CampusOuting, CampusOutingStatus } from "@/modules/student/api/campusOutings";

/**
 * GET /me/children/:id/campus-outings — the "In / out request" tab, read-only,
 * no create. Not gated by hosteller status — this gate pass is open to
 * every student regardless of residency.
 */
export function useChildCampusOutings(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "campus-outings"],
    queryFn: () =>
      apiClient.get<{ data: CampusOuting[]; page: number; page_size: number; total: number }>(
        `/me/children/${childId}/campus-outings`,
      ),
    enabled: childId !== null,
  });
}
