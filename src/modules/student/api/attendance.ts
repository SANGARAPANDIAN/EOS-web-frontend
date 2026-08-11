import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AttendanceSummary {
  overall: { total_days: number; present: number; absent: number; percentage: number };
  by_subject: {
    subject_id: number;
    subject_name: string;
    subject_code: string | null;
    total: number;
    present: number;
    percentage: number;
  }[];
  records: { attendance_date: string; subject_id: number | null; subject_code: string | null; status: string }[];
}

/** GET /me/attendance — requires a from/to range; from/to are ISO date strings (YYYY-MM-DD). */
export function useMyAttendance(from?: string, to?: string) {
  return useQuery({
    queryKey: ["me", "attendance", from, to],
    queryFn: () => apiClient.get<AttendanceSummary>("/me/attendance", { from, to }),
    enabled: Boolean(from && to),
  });
}
