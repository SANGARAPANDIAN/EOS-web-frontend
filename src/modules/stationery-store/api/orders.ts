import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { stationeryStoreKeys } from "./queryKeys";

export type StationeryOrderStatus = "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "collected" | "cancelled";
export type StationeryPaymentMethod = "wallet" | "razorpay";
export type StationeryPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface StationeryOrderItem {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface StationeryOrder {
  id: number;
  user_id: number;
  status: StationeryOrderStatus;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  payment_method: StationeryPaymentMethod;
  payment_status: StationeryPaymentStatus;
  pickup_token: string | null;
  cancel_reason: string | null;
  created_at: string;
  confirmed_at: string | null;
  ready_at: string | null;
  collected_at: string | null;
  cancelled_at: string | null;
  stationery_order_items: StationeryOrderItem[];
  users: { id: number; email: string };
  customer_name: string | null;
  register_no: string | null;
}

const BASE = "/stationery/admin/orders";

/** GET /stationery/admin/orders?status= */
export function useStationeryOrders(status?: string) {
  return useQuery({
    queryKey: stationeryStoreKeys.orders.list(status ?? "all"),
    queryFn: () => apiClient.get<StationeryOrder[]>(BASE, status ? { status } : undefined),
    refetchInterval: 30_000,
  });
}

/** GET /stationery/admin/orders/:id */
export function useStationeryOrder(id: number | null) {
  return useQuery({
    queryKey: stationeryStoreKeys.orders.detail(id ?? 0),
    queryFn: () => apiClient.get<StationeryOrder>(`${BASE}/${id}`),
    enabled: id !== null,
  });
}

export interface UpdateOrderStatusInput {
  id: number;
  status: StationeryOrderStatus;
  cancel_reason?: string;
}

/** PATCH /stationery/admin/orders/:id/status */
export function useUpdateStationeryOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, cancel_reason }: UpdateOrderStatusInput) =>
      apiClient.patch<StationeryOrder>(`${BASE}/${id}/status`, { status, cancel_reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.orders.all() });
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.orders.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.products.all() });
    },
  });
}
