import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodAttendanceDay {
  date: string;
  day: string;
  punch_in: string | null;
  punch_out: string | null;
  status: string;
  duration: string | null;
  note: string | null;
}

export interface HodAttendanceMonth {
  month: string;
  label: string;
  days: HodAttendanceDay[];
  full_days: number;
  half_days: number;
  absent: number;
  on_leave: number;
  on_duty: number;
  on_vacation: number;
  attendance_percentage: number;
}

export interface HodMyAttendance {
  faculty: { id: number; name: string; designation: string };
  overall: {
    full_days: number;
    half_days: number;
    absent: number;
    on_leave: number;
    on_duty: number;
    on_vacation: number;
    attendance_percentage: number;
  };
  months: HodAttendanceMonth[];
  recent_punches: HodAttendanceDay[];
}

/** GET /hod/employee/attendance?academic_year= */
export function useHodMyAttendance(academicYear?: string) {
  return useQuery({
    queryKey: ["hod", "employee", "attendance", academicYear],
    queryFn: () =>
      apiClient.get<HodMyAttendance>("/hod/employee/attendance", {
        academic_year: academicYear,
      }),
  });
}
