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

/**
 * Maps each real period_number to its 1-based position among the slots
 * given, sorted by period_number. The raw period_number can have gaps for a
 * given day (e.g. a lunch period reserved between periods 3 and 5 has no
 * class of its own, so a day's real slots are numbered 1,2,3,5,6,7) — shown
 * as-is, "P5" would visibly skip "P4" right after "P3" for no reason a
 * student can see. The real period_number is still what's used for keys,
 * sorting, and matching slots across forenoon/afternoon or across days;
 * only the number shown to the student is renumbered to be gapless.
 */
export function displayPeriodNumbers(slots: { period_number: number }[]): Map<number, number> {
  const sorted = [...slots].sort((a, b) => a.period_number - b.period_number);
  const map = new Map<number, number>();
  sorted.forEach((s, i) => map.set(s.period_number, i + 1));
  return map;
}
