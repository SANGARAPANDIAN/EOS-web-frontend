import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HostelDashboardSummary {
  hostel: { id: number; name: string; code: string; wing: "boys" | "girls" } | null;
  total_residents: number;
  currently_present: number;
  on_leave: number;
  pending_approvals: number;
  beds_total: number;
  beds_occupied: number;
  beds_vacant: number;
  occupancy_pct: number;
  complaints_open: number;
}

/** GET /hostel/dashboard/summary — scoped to the warden's own hostel server-side. */
export function useHostelDashboardSummary() {
  return useQuery({
    queryKey: ["hostel", "dashboard", "summary"],
    queryFn: () => apiClient.get<HostelDashboardSummary>("/hostel/dashboard/summary"),
    refetchInterval: 60_000,
  });
}
