import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CalendarEvent {
  id: number;
  academic_calendar_id: number;
  event_date: string;
  title: string;
  description: string | null;
  event_type: "holiday" | "event";
  start_time: string | null;
  end_time: string | null;
  created_by_user_id: number | null;
}

/** GET /me/principal/calendar/events?year=&month= — real events for that real calendar month, across every academic_calendars row. */
export function useCalendarEvents(year: number, month: number) {
  return useQuery({
    queryKey: ["me", "principal", "calendar", "events", year, month],
    queryFn: () => apiClient.get<CalendarEvent[]>("/me/principal/calendar/events", { year, month }),
  });
}

export interface AddCalendarEventInput {
  event_date: string;
  title: string;
  description?: string;
  event_type: "holiday" | "event";
}

/**
 * POST /me/principal/calendar/events — real create, but can genuinely fail
 * with NO_ACADEMIC_CALENDAR_FOR_DATE if no academic_calendars row covers
 * the chosen date yet (a real, live gap in this database, not a bug). Not
 * currently used by the composer — see usePersonalCalendarEntries below —
 * kept for a future "official institution-wide event" flow if ever needed.
 */
export function useAddCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCalendarEventInput) => apiClient.post<CalendarEvent>("/me/principal/calendar/events", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "principal", "calendar", "events"] });
    },
  });
}

export interface PersonalCalendarEntry {
  id: number;
  user_id: number;
  entry_date: string;
  title: string;
  category: "personal" | "reminder" | "meeting" | "task" | "deadline" | "follow_up" | "note";
  details: string | null;
  created_at: string;
}

/**
 * GET /me/principal/calendar/personal-entries?year=&month= — private
 * to-dos/reminders/meetings, scoped to the logged-in Principal's own
 * user_id. No other role or user ever sees these rows — unlike
 * calendar_events (institution-wide, everyone reads the same data).
 */
export function usePersonalCalendarEntries(year: number, month: number) {
  return useQuery({
    queryKey: ["me", "principal", "calendar", "personal-entries", year, month],
    queryFn: () => apiClient.get<PersonalCalendarEntry[]>("/me/principal/calendar/personal-entries", { year, month }),
  });
}

export interface AddPersonalEntryInput {
  entry_date: string;
  title: string;
  details?: string;
  category: "personal" | "reminder" | "meeting" | "task" | "deadline" | "follow_up" | "note";
}

/**
 * POST /me/principal/calendar/personal-entries — unlike calendar_events,
 * this has no academic_calendar_id dependency at all, so it works for any
 * date immediately, including "today" — this is what "Add event" actually
 * creates.
 */
export function useAddPersonalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddPersonalEntryInput) => apiClient.post<PersonalCalendarEntry>("/me/principal/calendar/personal-entries", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "principal", "calendar", "personal-entries"] });
    },
  });
}

/** DELETE /me/principal/calendar/personal-entries/:id — only the owner (this Principal) may delete their own entry. */
export function useDeletePersonalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`/me/principal/calendar/personal-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "principal", "calendar", "personal-entries"] });
    },
  });
}
