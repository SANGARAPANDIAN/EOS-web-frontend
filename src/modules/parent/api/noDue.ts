import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ClearanceRequest } from "@/modules/student/api/hallTicketClearance";

export type { ClearanceRequest, ClearanceType, ClearanceEffectiveStatus } from "@/modules/student/api/hallTicketClearance";

/** GET /me/children/:id/clearance-requests — the "No-due" tab, read-only, no create. */
export function useChildClearanceRequests(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "clearance-requests"],
    queryFn: () =>
      apiClient.get<{ data: ClearanceRequest[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        `/me/children/${childId}/clearance-requests`,
      ),
    enabled: childId !== null,
  });
}
