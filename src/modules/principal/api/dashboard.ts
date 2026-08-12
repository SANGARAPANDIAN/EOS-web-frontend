import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type DashboardPeriod = "today" | "term" | "year";

export interface PrincipalDashboardTodaySummary {
  date: string;
  students: {
    total_active: number;
    present_today: number;
    absent_today: number;
    on_duty_today: number;
    attendance_percentage_today: number | null;
  };
  faculty: {
    total_active: number;
    reported_today: number;
    on_leave_today: number;
    attendance_marked_today: boolean;
  };
  non_teaching_staff: {
    total_active: number;
  };
  departments: {
    total: number;
  };
}

export interface PrincipalDashboardPeriodSummary {
  period: "term" | "year";
  period_label: string;
  students: { total_active: number; new_admissions: number };
  faculty: { total_active: number; new_hires: number };
  non_teaching_staff: { total_active: number };
  departments: { total: number };
  attendance: {
    percentage: number | null;
    students_below_threshold: number;
    best_month: string | null;
  };
}

export type PrincipalDashboardSummary = PrincipalDashboardTodaySummary | PrincipalDashboardPeriodSummary;

/** Narrows a PrincipalDashboardSummary to the term/year shape. */
export function isPeriodSummary(s: PrincipalDashboardSummary): s is PrincipalDashboardPeriodSummary {
  return "period" in s;
}

/** Narrows a PrincipalDashboardSummary to the today shape (explicit positive guard, not a negation of isPeriodSummary). */
export function isTodaySummary(s: PrincipalDashboardSummary): s is PrincipalDashboardTodaySummary {
  return "date" in s;
}

/** GET /me/principal/dashboard/summary[?period=term|year] — institution-wide, real-data-only KPIs. */
export function usePrincipalDashboardSummary(period: DashboardPeriod = "today") {
  return useQuery({
    queryKey: ["me", "principal", "dashboard", "summary", period],
    queryFn: () =>
      apiClient.get<PrincipalDashboardSummary>(
        "/me/principal/dashboard/summary",
        period === "today" ? undefined : { period },
      ),
  });
}

export interface PrincipalPlacementSummary {
  registered: number;
  companies_visited: number;
  offers_released: number;
  highest_package_lpa: number | null;
  average_package_lpa: number | null;
  drives_this_week: number;
}

export interface PrincipalAttentionFlag {
  type: "attendance" | "fees" | "workload" | "course_completion";
  title: string;
  description: string;
}

export interface PrincipalCampusInfrastructure {
  classrooms: { tracked: boolean; classrooms_count: number; labs_count: number };
  library: { book_transactions_today: number };
  transport: { routes_running: number; routes_total: number };
  hostel: { occupancy_percentage: number | null; residents: number; capacity: number };
  service_requests: { pending: number };
}

export interface PrincipalDashboardInsights {
  placement: PrincipalPlacementSummary;
  attention_flags: PrincipalAttentionFlag[];
  campus: PrincipalCampusInfrastructure;
}

/**
 * GET /me/principal/dashboard/insights — placement summary + real,
 * threshold-triggered attention flags. Kept as a separate (slower) request
 * from `summary` so the top KPI row can render first.
 */
export function usePrincipalDashboardInsights() {
  return useQuery({
    queryKey: ["me", "principal", "dashboard", "insights"],
    queryFn: () => apiClient.get<PrincipalDashboardInsights>("/me/principal/dashboard/insights"),
  });
}
