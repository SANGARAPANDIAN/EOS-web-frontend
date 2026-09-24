import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface DateRangeQuery {
  [key: string]: string | undefined;
  from?: string;
  to?: string;
}

export interface CashierPerformanceRow {
  cashier: string;
  bills: number;
  cash: number;
  upi: number;
  total: number;
}

export interface SalesByCategoryRow {
  category: string;
  amount: number;
  quantity: number;
}

export interface RecentBillRow {
  id: number;
  date_time: string;
  cashier: string;
  amount: number;
  payment: string;
  items: string[];
}

export interface BillingDetailsReport {
  summary: { total_bills: number; cash_amount: number; upi_amount: number };
  cashier_performance: CashierPerformanceRow[];
  sales_by_category: SalesByCategoryRow[];
  recent_bills: RecentBillRow[];
}

export interface AnalyticsReport {
  total_sales: number;
  total_expenses: number;
  net_profit: number;
  daily_sales_summary: { date: string; sales: number }[];
}

/** GET /canteen-admin/reports/billing-details?from=&to= — defaults to today server-side when omitted. */
export function useBillingDetailsReport(range: DateRangeQuery) {
  return useQuery({
    queryKey: ["canteen-admin", "reports", "billing-details", range],
    queryFn: () => apiClient.get<BillingDetailsReport>("/canteen-admin/reports/billing-details", range),
  });
}

/** GET /canteen-admin/reports/analytics?from=&to= — defaults to today server-side when omitted. */
export function useAnalyticsReport(range: DateRangeQuery) {
  return useQuery({
    queryKey: ["canteen-admin", "reports", "analytics", range],
    queryFn: () => apiClient.get<AnalyticsReport>("/canteen-admin/reports/analytics", range),
  });
}
