import { useQuery } from "@tanstack/react-query";
import { academicCalendarService } from "../services/academic-calendar.service";
import { coordinatorKeys } from "../query-keys";

export function useAcademicCalendarPeriods() {
  return useQuery({
    queryKey: coordinatorKeys.academicCalendar.periods(),
    queryFn: academicCalendarService.listPeriods,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCalendarEvents(academicCalendarId?: number) {
  return useQuery({
    queryKey: coordinatorKeys.academicCalendar.events(academicCalendarId),
    queryFn: () => academicCalendarService.listEvents(academicCalendarId),
  });
}
