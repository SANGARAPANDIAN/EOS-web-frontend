import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type OnlineOrderStatus = "placed" | "accepted" | "preparing" | "ready" | "collected" | "cancelled";

export interface OnlineOrder {
  id: number;
  pickup_token: string | null;
  status: OnlineOrderStatus;
  total_amount: number;
  orderer: string;
  created_at: string;
  items: { name: string; quantity: number }[];
}

const onlineOrderKeys = {
  list: (status?: string) => ["canteen-cashier", "online-orders", status ?? "active"] as const,
};

/** GET /canteen-cashier/online-orders?status= — omit status for every non-cancelled order. */
export function useOnlineOrders(status?: string) {
  return useQuery({
    queryKey: onlineOrderKeys.list(status),
    queryFn: () => apiClient.get<OnlineOrder[]>("/canteen-cashier/online-orders", { status }),
    refetchInterval: 10_000,
  });
}

function useInvalidateOnlineOrders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["canteen-cashier", "online-orders"] });
}

/** PATCH /canteen-cashier/online-orders/:id/status — the one real cashier transition: Paid → Ready. */
export function useAdvanceOrderStatus() {
  const invalidate = useInvalidateOnlineOrders();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ready" }) =>
      apiClient.patch<{ success: boolean; status: string }>(`/canteen-cashier/online-orders/${id}/status`, { status }),
    onSuccess: invalidate,
  });
}

/** POST /canteen-cashier/online-orders/:id/generate-bill — only once 'ready'; records the real bill and marks the order collected. */
export function useGenerateBillForOrder() {
  const invalidate = useInvalidateOnlineOrders();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<{ bill_id: number; order_id: number }>(`/canteen-cashier/online-orders/${id}/generate-bill`),
    onSuccess: invalidate,
  });
}
