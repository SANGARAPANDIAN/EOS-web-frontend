import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";

export type DepartmentAppraisalRollupStatus = "not_started" | "in_progress" | "complete";

export interface HrDepartmentRollup {
  id: number;
  name: string;
  code: string;
  total_faculty: number;
  on_leave_today: number;
  on_od_today: number;
  pending_requests: number;
  appraisal_status: DepartmentAppraisalRollupStatus;
}

export interface HrDashboardSummary {
  pending_requests_count: number;
  todays_leave_count: number;
  todays_od_count: number;
  pending_appraisals_count: number;
  payroll: {
    month: number;
    year: number;
    total_active_faculty: number;
    processed_count: number;
    completion_percent: number;
  };
  department_overview: HrDepartmentRollup[];
}

/** GET /hr/dashboard — HR Payroll only. Aggregates faculty, leave/OD, appraisal and payroll-run counts. */
export function useHrDashboard() {
  return useQuery({
    queryKey: hrKeys.dashboard(),
    queryFn: () => apiClient.get<HrDashboardSummary>("/hr/dashboard"),
  });
}
