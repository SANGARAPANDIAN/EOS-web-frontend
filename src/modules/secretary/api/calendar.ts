import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/academic-structure/
// {academic-calendar,academic-calendar-events}/*.{controller,service}.ts —
// real modules; GET routes on both have no @Roles() at all (any
// authenticated user), write routes on academic-calendar-events just
// needed ROLES.SECRETARY added (now done).
//
// KNOWN GAP (not faked): the real `event_type` enum only has 2 values
// (`holiday`, `event`) — the design's 6-category picker (Instruction/
// Assessment/Holiday/Placement/Institution/Event) has no matching enum;
// adding more values needs a real ALTER TYPE migration. The composer is
// restricted to the 2 real values instead of pretending the other 4 work.
// There is also no `published` boolean on calendar_events — dropped.

export interface AcademicCalendar {
  id: number;
  batch_id: number;
  semester: number;
  start_date: string;
  end_date: string;
  created_by_user_id: number;
}

/** GET /academic-calendar — bare array, any authenticated role. */
export function useAcademicCalendars() {
  return useQuery({
    queryKey: ["secretary", "academic-calendars"],
    queryFn: () => apiClient.get<AcademicCalendar[]>("/academic-calendar"),
  });
}

export type CalendarEventType = "holiday" | "event";

export interface CalendarEventRow {
  id: number;
  academic_calendar_id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_type: CalendarEventType;
  start_time: string;
  end_time: string;
  created_by_user_id: number;
}

/** GET /academic-calendar-events?academic_calendar_id= — bare array. */
export function useCalendarEvents(academicCalendarId: number | undefined) {
  return useQuery({
    queryKey: ["secretary", "calendar-events", academicCalendarId],
    queryFn: () => apiClient.get<CalendarEventRow[]>(`/academic-calendar-events?academic_calendar_id=${academicCalendarId}`),
    enabled: academicCalendarId !== undefined,
  });
}

export interface CreateCalendarEventInput {
  academic_calendar_id: number;
  title: string;
  description?: string;
  event_date: string;
  event_type: CalendarEventType;
  start_time: string;
  end_time: string;
}

/** POST /academic-calendar-events */
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => apiClient.post("/academic-calendar-events", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "calendar-events"] }),
  });
}

/** DELETE /academic-calendar-events/:id */
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/academic-calendar-events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "calendar-events"] }),
  });
}
