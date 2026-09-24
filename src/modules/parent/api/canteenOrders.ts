import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ChildCanteenOrder {
  id: number;
  status: string;
  total_amount: number;
  pickup_token: string | null;
  created_at: string;
  items: { name: string; quantity: number; is_parcel: boolean; price: number }[];
}

/**
 * GET /me/children/:id/canteen-orders — recent orders only (today's, plus
 * anything still active from before midnight), not full lifetime history —
 * same scope as the student's own view. See ParentsService.getChildCanteenOrders.
 */
export function useChildCanteenOrders(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "canteen-orders"],
    queryFn: () => apiClient.get<ChildCanteenOrder[]>(`/me/children/${childId}/canteen-orders`),
    enabled: childId !== null,
  });
}
