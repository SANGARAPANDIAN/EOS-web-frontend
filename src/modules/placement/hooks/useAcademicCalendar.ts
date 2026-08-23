import { useQuery } from "@tanstack/react-query";
import { academicCalendarService } from "../services/academic-calendar.service";
import { placementKeys } from "../query-keys";

export function useAcademicCalendarPeriods() {
  return useQuery({
    queryKey: placementKeys.academicCalendarPeriods(),
    queryFn: academicCalendarService.listPeriods,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalendarEvents(academicCalendarId?: number) {
  return useQuery({
    queryKey: placementKeys.academicCalendarEvents(academicCalendarId),
    queryFn: () => academicCalendarService.listEvents(academicCalendarId),
  });
}
