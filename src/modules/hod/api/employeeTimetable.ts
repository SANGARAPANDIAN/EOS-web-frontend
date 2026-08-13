import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodTimetablePeriod {
  id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  minutes: number;
  subject_name: string;
  subject_code: string;
  class_label: string;
  venue_name: string | null;
  type: "class" | "lab";
}

export interface HodTimetableStats {
  classes: number;
  labs: number;
  free_hours: number | null;
  total_hours: number;
}

export interface HodTimetableDay {
  faculty: { name: string; department_code: string; office_room: string | null };
  date: string;
  day_label: string;
  week_dates: { date: string; day_label: string; day_number: number; is_selected: boolean }[];
  stats: HodTimetableStats;
  periods: HodTimetablePeriod[];
}

/** GET /hod/employee/timetable?date= */
export function useHodEmployeeTimetableDay(date?: string) {
  return useQuery({
    queryKey: ["hod", "employee", "timetable", "day", date],
    queryFn: () => apiClient.get<HodTimetableDay>("/hod/employee/timetable", { date }),
  });
}

export interface HodTimetableColumn {
  period_number: number;
  start_time: string;
  end_time: string;
}

/** An unscheduled cell: "break" means no one in the department has a class
 * at that exact day+period (a structurally reserved slot); "free" means the
 * department is in session then, this faculty just has nothing scheduled. */
export interface HodTimetableEmptyCell {
  type: "free" | "break";
}

export type HodTimetableWeekCell = HodTimetablePeriod | HodTimetableEmptyCell;

export interface HodTimetableWeekRow {
  date: string;
  day_label: string;
  stats: HodTimetableStats;
  cells: HodTimetableWeekCell[];
}

export interface HodTimetableWeek {
  faculty: { name: string; department_code: string; office_room: string | null };
  columns: HodTimetableColumn[];
  rows: HodTimetableWeekRow[];
}

/** GET /hod/employee/timetable/week?date= */
export function useHodEmployeeTimetableWeek(date?: string) {
  return useQuery({
    queryKey: ["hod", "employee", "timetable", "week", date],
    queryFn: () => apiClient.get<HodTimetableWeek>("/hod/employee/timetable/week", { date }),
  });
}
