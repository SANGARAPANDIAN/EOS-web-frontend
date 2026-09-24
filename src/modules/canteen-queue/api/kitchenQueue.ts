import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface KitchenQueueItem {
  orderId: number;
  token: string | null;
  status: "placed";
  createdAt: string;
  items: { name: string; quantity: number; isParcel: boolean }[];
}

export interface KitchenQueuePayload {
  orders: KitchenQueueItem[];
  totalActive: number;
  generatedAt: string;
}

export const kitchenQueueKey = ["canteen-queue", "kitchen"] as const;

/**
 * GET /canteen-queue/kitchen — public, unauthenticated (this feeds a
 * wall-mounted kitchen display kiosk, not a logged-in role). The WebSocket
 * connection (useQueueSocket) is the primary channel; this slow poll is a
 * defense-in-depth resync, not the main data path.
 */
export function useKitchenQueue() {
  return useQuery({
    queryKey: kitchenQueueKey,
    queryFn: () => apiClient.get<KitchenQueuePayload>("/canteen-queue/kitchen"),
    refetchInterval: 30_000,
  });
}
