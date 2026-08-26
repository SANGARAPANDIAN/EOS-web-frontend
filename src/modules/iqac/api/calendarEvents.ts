import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type CalendarEventType = "holiday" | "event" | "instruction" | "assessment" | "placement" | "institution";

export interface CalendarEvent {
  id: number;
  academic_calendar_id: number;
  event_date: string;
  description: string | null;
  event_type: CalendarEventType;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by_user_id: number | null;
}

/** GET /academic-calendar-events — open to any authenticated role. Read-only for IQAC: creating/editing calendar events is Academic Coordinator/Principal/Secretary's job. */
export function useAcademicCalendarEvents() {
  return useQuery({
    queryKey: ["academic-calendar-events"],
    queryFn: () => apiClient.get<CalendarEvent[]>("/academic-calendar-events"),
    staleTime: 5 * 60_000,
  });
}
