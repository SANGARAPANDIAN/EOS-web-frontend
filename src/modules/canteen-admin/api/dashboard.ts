import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CanteenSalesByMode {
  amount: number;
  orders: number;
}

export interface CanteenSalesByCategory {
  category: string;
  amount: number;
  orders: number;
}

export interface CanteenDashboard {
  today_total_sales: number;
  cash_sales: CanteenSalesByMode;
  upi_sales: CanteenSalesByMode;
  sales_by_category: CanteenSalesByCategory[];
}

/** GET /canteen-admin/dashboard — today's sales totals, cash/UPI split and sales-by-category, all scoped to the current calendar day server-side. */
export function useCanteenDashboard() {
  return useQuery({
    queryKey: ["canteen-admin", "dashboard"],
    queryFn: () => apiClient.get<CanteenDashboard>("/canteen-admin/dashboard"),
    refetchInterval: 60_000,
  });
}
