import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/academic-structure/{academic-calendar,academic-calendar-events}/*
// READ-ONLY from EDC's side — GET routes are open to any authenticated
// role. Write access (create/update/delete) is Academic Coordinator/
// Principal only; EDC_COORDINATOR's write access to this shared,
// institution-wide table was deliberately removed — those events are
// visible to every role, so EDC adding to them would leak EDC-only
// content everywhere. EDC's OWN events live in the separate `edc_events`
// table (see api/events.ts) and are merged into the Calendar page's view
// client-side, never written here.

export interface AcademicCalendarRow {
  id: number;
  batch_id: number;
  semester: number;
  start_date: string;
  end_date: string;
}

export interface CalendarEventRow {
  id: number;
  academic_calendar_id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_type: "holiday" | "event";
  start_time: string;
  end_time: string;
  created_by_user_id: number | null;
}

/** GET /academic-calendar — unfiltered, every calendar institution-wide. */
export function useAcademicCalendars() {
  return useQuery({
    queryKey: ["edc", "academic-calendar"],
    queryFn: () => apiClient.get<AcademicCalendarRow[]>("/academic-calendar"),
  });
}

/** GET /academic-calendar-events — unfiltered, every event institution-wide. */
export function useCalendarEvents() {
  return useQuery({
    queryKey: ["edc", "academic-calendar-events"],
    queryFn: () => apiClient.get<CalendarEventRow[]>("/academic-calendar-events"),
  });
}
