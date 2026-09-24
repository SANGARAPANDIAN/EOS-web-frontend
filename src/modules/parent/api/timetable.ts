import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { DayTimetable, WeekTimetable } from "@/modules/student/api/timetable";

export type { DayTimetable, WeekTimetable, TimetableSlot, TimetableClassInfo } from "@/modules/student/api/timetable";
export { displayPeriodNumbers } from "@/modules/student/api/timetable";

/** GET /me/children/:id/timetable?day=N&date=YYYY-MM-DD — day_of_week is 1 (Monday) through 6 (Saturday). */
export function useChildTimetableForDay(childId: number | null, day: number | null, date?: string) {
  return useQuery({
    queryKey: ["me", "children", childId, "timetable", day, date],
    queryFn: () => apiClient.get<DayTimetable>(`/me/children/${childId}/timetable`, { day: day ?? undefined, date }),
    enabled: childId !== null && day !== null,
  });
}

/** GET /me/children/:id/timetable (no day param) — every day_of_week the class has slots for, Monday through Saturday. */
export function useChildFullWeekTimetable(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "timetable", "week"],
    queryFn: () => apiClient.get<WeekTimetable>(`/me/children/${childId}/timetable`),
    enabled: childId !== null,
  });
}
