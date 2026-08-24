import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { CalendarEventType } from "@/modules/iqac/api/calendarEvents";

export interface IqacCalendarEvent {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_type: CalendarEventType;
  start_time: string | null;
  end_time: string | null;
  batch_id: number;
  batch_label: string;
  semester: number;
}

export interface CalendarFilters {
  batches: { id: number; name: string }[];
}

/** GET /me/iqac/calendar/filters — real batch list. */
export function useCalendarFilters() {
  return useQuery({
    queryKey: ["iqac", "calendar", "filters"],
    queryFn: () => apiClient.get<CalendarFilters>("/me/iqac/calendar/filters"),
  });
}

/** GET /me/iqac/calendar/events?batch_id=&semester=&type= — real calendar_events, enriched with the real batch/semester each event belongs to. */
export function useIqacCalendarEvents(batchId?: number | null, semester?: number | null, type?: string) {
  return useQuery({
    queryKey: ["iqac", "calendar", "events", batchId, semester, type],
    queryFn: () =>
      apiClient.get<IqacCalendarEvent[]>("/me/iqac/calendar/events", {
        batch_id: batchId ?? undefined,
        semester: semester ?? undefined,
        type: type || undefined,
      }),
  });
}

export interface CalendarQuality {
  this_year: number;
  last_year: number;
  target: number | null;
  attainment: number | null;
}

/** GET /me/iqac/calendar/quality — This/Last year real event counts, target/attainment from iqac_metric_targets. */
export function useCalendarQuality() {
  return useQuery({
    queryKey: ["iqac", "calendar", "quality"],
    queryFn: () => apiClient.get<CalendarQuality>("/me/iqac/calendar/quality"),
  });
}
