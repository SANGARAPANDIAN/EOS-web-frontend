import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";

const BASE = "/me/faculty";

export type HrFacultyAttendanceStatus = "full_day" | "half_day" | "absent" | "on_duty" | "on_leave" | "weekly_off" | "holiday";

/** on_leave counts against the percentage like an absence; on_duty/on_vacation are excused (excluded). */
export interface HrFacultyAttendanceStats {
  full_days: number;
  half_days: number;
  absent: number;
  on_leave: number;
  on_duty: number;
  on_vacation: number;
  attendance_percentage: number;
}

export interface HrFacultyAttendanceOverviewRow extends HrFacultyAttendanceStats {
  faculty_id: number;
  prefix?: string;
  first_name: string;
  last_name: string;
  profile_url?: string | null;
  department: { id: number; name: string; code?: string };
  today_status?: HrFacultyAttendanceStatus;
}

export interface HrFacultyAttendanceOverview {
  today: HrFacultyAttendanceStats;
  rows: HrFacultyAttendanceOverviewRow[];
}

export interface HrFacultyAttendanceOverviewParams {
  [key: string]: string | number | undefined;
  department_id?: number;
  academic_year?: string;
  search?: string;
}

export interface HrFacultyAttendanceDay {
  date: string;
  day: string;
  punch_in: string | null;
  punch_out: string | null;
  status: HrFacultyAttendanceStatus;
}

export interface HrFacultyAttendanceMonth extends HrFacultyAttendanceStats {
  month: string;
  label: string;
  days: HrFacultyAttendanceDay[];
}

export interface HrFacultyAttendanceSummary {
  faculty_id: number;
  overall: HrFacultyAttendanceStats;
  months: HrFacultyAttendanceMonth[];
}

export interface MarkHrFacultyAttendanceInput {
  status: HrFacultyAttendanceStatus;
  punch_in?: string;
  punch_out?: string;
}

/** GET /me/faculty/attendance/overview — every faculty member's today status + year-to-date %, optionally filtered. */
export function useHrFacultyAttendanceOverview(params: HrFacultyAttendanceOverviewParams = {}) {
  return useQuery({
    queryKey: hrKeys.faculty.attendanceOverview(params),
    queryFn: () => apiClient.get<HrFacultyAttendanceOverview>(`${BASE}/attendance/overview`, params),
    placeholderData: keepPreviousData,
  });
}

/** GET /me/faculty/:id/attendance — one faculty member's month-by-month attendance log. */
export function useHrFacultyAttendance(facultyId: number | null) {
  return useQuery({
    queryKey: hrKeys.faculty.attendance(facultyId ?? -1),
    queryFn: () => apiClient.get<HrFacultyAttendanceSummary>(`${BASE}/${facultyId}/attendance`),
    enabled: facultyId !== null && Number.isFinite(facultyId),
  });
}

/** PATCH /me/faculty/:id/attendance/:date — manual correction over the biometric-derived status for one day. */
export function useMarkHrFacultyAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date, input }: { id: number; date: string; input: MarkHrFacultyAttendanceInput }) =>
      apiClient.patch(`${BASE}/${id}/attendance/${date}`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.faculty.attendance(id) });
      queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "faculty", "attendance-overview"] });
    },
  });
}
