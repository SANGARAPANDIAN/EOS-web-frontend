import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CounterQueueItem {
  orderId: number;
  token: string | null;
  readySince: string;
}

export interface CounterQueuePayload {
  orders: CounterQueueItem[];
  generatedAt: string;
}

export const counterQueueKey = ["canteen-queue", "counter"] as const;

/**
 * GET /canteen-queue/counter — public, unauthenticated (this feeds a
 * wall-mounted counter display kiosk, not a logged-in role). Deliberately
 * carries no item/dish detail — token + status only, by design. The
 * WebSocket connection (useQueueSocket) is the primary channel; this slow
 * poll is a defense-in-depth resync, not the main data path.
 */
export function useCounterQueue() {
  return useQuery({
    queryKey: counterQueueKey,
    queryFn: () => apiClient.get<CounterQueuePayload>("/canteen-queue/counter"),
    refetchInterval: 30_000,
  });
}
