import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type DashboardTimeframe = "today" | "term" | "year";

export interface DashboardOverview {
  date: string;
  timeframe: DashboardTimeframe;
  pending_fixtures_count: number;
  kpis: {
    athletes: { value: number; strong: number; foot: string };
    coaches: { value: number; on_duty: number; foot: string };
    achievements: { value: number; strong: number; foot: string };
    equipment: { value: number; strong: number; foot: string };
  };
  flags: { title: string; sub: string; route: string }[];
  todays_sessions: {
    id: number;
    title: string;
    sub: string;
    start_time: string | null;
    status: string;
  }[];
  upcoming_fixtures: {
    id: number;
    title: string;
    sub: string;
    fixture_date: string;
    status: string;
  }[];
  facility_use: { id: number; name: string; usage_pct: number }[];
  recent_achievements: { id: number; title: string; sub: string; badge: string }[];
  announcements: { id: number; title: string; category: string; created_at: string }[];
}

/** GET /sports-admin/dashboard?timeframe= */
export function useSportsDashboard(timeframe: DashboardTimeframe = "today") {
  return useQuery({
    queryKey: ["sports-admin", "dashboard", timeframe],
    queryFn: () => apiClient.get<DashboardOverview>("/sports-admin/dashboard", { timeframe }),
  });
}
