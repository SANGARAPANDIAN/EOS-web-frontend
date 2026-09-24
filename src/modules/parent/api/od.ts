import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { OdRequestRow } from "@/modules/student/api/od";

export type { OdRequestRow, OdOverallStatus } from "@/modules/student/api/od";

/**
 * GET /me/children/:id/od-requests — read-only status list (approved/pending/
 * rejected counts). No team roster or create/join/leave actions — see
 * ParentsService.getChildOdRequests's own doc comment for why.
 */
export function useChildOdRequests(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "od-requests"],
    queryFn: () =>
      apiClient.get<{ data: OdRequestRow[]; page: number; page_size: number; total: number }>(
        `/me/children/${childId}/od-requests`,
      ),
    enabled: childId !== null,
  });
}
