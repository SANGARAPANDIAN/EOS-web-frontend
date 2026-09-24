import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { stationeryStoreKeys } from "./queryKeys";
import type { StationeryOrder } from "./orders";

export interface StationeryDashboardSummary {
  total_products: number;
  active_products: number;
  today_sales: number;
  today_orders: number;
  pending_orders: number;
}

export interface LowStockProduct {
  id: number;
  name: string;
  category: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

export interface SalesDay {
  date: string;
  amount: number;
}

export interface StationeryDashboard {
  summary: StationeryDashboardSummary;
  recent_orders: StationeryOrder[];
  low_stock_products: LowStockProduct[];
  sales_last_7_days: SalesDay[];
}

/** GET /stationery/admin/dashboard */
export function useStationeryDashboard() {
  return useQuery({
    queryKey: stationeryStoreKeys.dashboard(),
    queryFn: () => apiClient.get<StationeryDashboard>("/stationery/admin/dashboard"),
    refetchInterval: 30_000,
  });
}
