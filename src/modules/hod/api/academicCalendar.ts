import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodCalendarEvent {
  id: number;
  event_date: string;
  title: string;
  description: string | null;
  event_type: string;
}

export interface HodCalendarMonth {
  year: number;
  month: number;
  events: HodCalendarEvent[];
}

/** GET /hod/academic-calendar?year=2026&month=8 (month is 1-12) */
export function useHodAcademicCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: ["hod", "academic-calendar", year, month],
    queryFn: () =>
      apiClient.get<HodCalendarMonth>("/hod/academic-calendar", { year, month }),
  });
}
