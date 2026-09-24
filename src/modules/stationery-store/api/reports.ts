import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { stationeryStoreKeys } from "./queryKeys";

export interface ReportMetrics {
  total_sales: number;
  total_orders: number;
  completed: number;
  cancelled: number;
}

export interface TopProduct {
  name: string;
  units: number;
}

export interface CategorySale {
  category: string;
  amount: number;
}

export interface StationeryReports {
  metrics: ReportMetrics;
  top_products: TopProduct[];
  category_sales: CategorySale[];
}

/** GET /stationery/admin/reports - all-time totals, always (the page's own on-screen metrics never change with a date range). */
export function useStationeryReports() {
  return useQuery({
    queryKey: stationeryStoreKeys.reports(),
    queryFn: () => apiClient.get<StationeryReports>("/stationery/admin/reports"),
  });
}

/**
 * GET /stationery/admin/reports?from=&to= - a plain one-off fetch (not a
 * query hook) for the Reports page's date-range CSV export only. The
 * on-screen metrics above stay all-time regardless; this is called fresh
 * each time "Export CSV" is clicked with a range selected.
 */
export function fetchStationeryReportsForRange(from: string, to: string): Promise<StationeryReports> {
  return apiClient.get<StationeryReports>("/stationery/admin/reports", { from, to });
}
