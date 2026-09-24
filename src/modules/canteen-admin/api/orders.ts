import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AdminOrderRow {
  id: number;
  order_source: "self" | "cashier";
  status: string;
  pickup_token: string | null;
  total_amount: number;
  is_emergency: boolean;
  placed_by: string;
  created_at: string;
  items: { name: string; quantity: number; is_parcel: boolean }[];
}

export interface AdminOrdersList {
  items: AdminOrderRow[];
  summary: {
    total_orders: number;
    self_ordered: number;
    cashier_orders: number;
    total_amount: number;
  };
}

export interface AdminOrdersQuery {
  [key: string]: string | undefined;
  source?: "self" | "cashier";
  from?: string;
  to?: string;
}

/** GET /canteen-admin/orders?source=&from=&to= — read-only oversight, every order regardless of source. */
export function useAdminOrders(query: AdminOrdersQuery) {
  return useQuery({
    queryKey: ["canteen-admin", "orders", query],
    queryFn: () => apiClient.get<AdminOrdersList>("/canteen-admin/orders", query),
  });
}
