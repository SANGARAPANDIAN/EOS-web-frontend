import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { BonafideRequestRow } from "@/modules/student/api/bonafide";

export type { BonafideRequestRow, BonafideStatus } from "@/modules/student/api/bonafide";

/** GET /me/children/:id/bonafide-requests — read-only, no create. */
export function useChildBonafideRequests(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "bonafide-requests"],
    queryFn: () =>
      apiClient.get<{ data: BonafideRequestRow[]; page: number; page_size: number; total: number }>(
        `/me/children/${childId}/bonafide-requests`,
      ),
    enabled: childId !== null,
  });
}
