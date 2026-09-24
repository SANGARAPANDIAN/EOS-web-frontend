import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { MyFees } from "@/modules/student/api/fees";

export type { MyFees, FeeDemand, FeeDemandItem, FeePayment } from "@/modules/student/api/fees";

/** GET /me/children/:id/fees — read-only: no payment initiation from the parent portal. */
export function useChildFees(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "fees"],
    queryFn: () => apiClient.get<MyFees>(`/me/children/${childId}/fees`),
    enabled: childId !== null,
  });
}
