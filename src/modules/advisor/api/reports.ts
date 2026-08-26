import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/faculty/reports/reports.{controller,service}.ts
// Real weekly attendance, computed from attendance_records for every
// student in every class this faculty is mapped to teach — replaces what
// was previously a literal dev-comment shown as UI text on the Reports
// page ("No weekly attendance-trend endpoint exists yet…").

export interface WeeklyAttendancePoint {
  week_start: string; // "YYYY-MM-DD", Monday of that ISO week
  present_percent: number;
  marked_count: number;
}

/** GET /me/reports/weekly-attendance */
export function useWeeklyAttendanceTrend() {
  return useQuery({
    queryKey: ["me", "reports", "weekly-attendance"],
    queryFn: () => apiClient.get<{ weeks: WeeklyAttendancePoint[] }>("/me/reports/weekly-attendance"),
  });
}
