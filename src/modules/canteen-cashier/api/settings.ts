import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CashierSettings {
  gst_percentage: number;
  parcel_charge: number;
}

/** GET /canteen-cashier/settings — read-only; only Canteen Admin can change these. */
export function useCashierSettings() {
  return useQuery({
    queryKey: ["canteen-cashier", "settings"],
    queryFn: () => apiClient.get<CashierSettings>("/canteen-cashier/settings"),
    staleTime: 60_000,
  });
}
