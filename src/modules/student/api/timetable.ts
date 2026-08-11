import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface TimetableSlot {
  period_number: number;
  start_time: string;
  end_time: string;
  subject: { id: number; name: string; subject_code: string; course_type: string | null };
  faculty: { id: number; name: string };
}

export interface TimetableClassInfo {
  section: string | null;
  department_name: string | null;
  department_code: string | null;
}

export interface DayTimetable {
  day_of_week: number;
  class: TimetableClassInfo;
  slots: TimetableSlot[];
}

/** GET /me/timetable?day=N — day_of_week is 1 (Monday) through 6 (Saturday); no classes on Sunday. */
export function useMyTimetableForDay(day: number | null) {
  return useQuery({
    queryKey: ["me", "timetable", day],
    queryFn: () => apiClient.get<DayTimetable>("/me/timetable", { day: day ?? undefined }),
    enabled: day !== null,
  });
}

export interface WeekTimetable {
  class: TimetableClassInfo;
  days: Omit<DayTimetable, "class">[];
}

/** GET /me/timetable (no day param) — every day_of_week the class has slots for, Monday through Saturday. */
export function useMyFullWeekTimetable() {
  return useQuery({
    queryKey: ["me", "timetable", "week"],
    queryFn: () => apiClient.get<WeekTimetable>("/me/timetable"),
  });
}
