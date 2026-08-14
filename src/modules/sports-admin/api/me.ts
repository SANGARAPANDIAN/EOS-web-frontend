import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface SportsAdminIdentity {
  name: string;
  designation: string | null;
  department: string | null;
  discipline: { id: number; name: string } | null;
  duty_status: "on_duty" | "on_leave" | null;
}

/** GET /sports-admin/me */
export function useSportsAdminIdentity() {
  return useQuery({
    queryKey: ["sports-admin", "me"],
    queryFn: () => apiClient.get<SportsAdminIdentity>("/sports-admin/me"),
  });
}

export interface SportsAdminNavCounts {
  athletes: number;
  teams: number;
  trials_pending: number;
  od_pending: number;
  disciplines: number;
  achievements: number;
}

/** GET /sports-admin/me/nav-counts — sidebar badge counts, real and live. */
export function useSportsAdminNavCounts() {
  return useQuery({
    queryKey: ["sports-admin", "me", "nav-counts"],
    queryFn: () => apiClient.get<SportsAdminNavCounts>("/sports-admin/me/nav-counts"),
    staleTime: 60_000,
  });
}
