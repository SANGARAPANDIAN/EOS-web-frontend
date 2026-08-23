import { apiClient } from "@/lib/api/client";
import type { AcademicCalendarPeriod, CalendarEventItem } from "../types";

interface BackendAcademicCalendar {
  id: number;
  batch_id: number;
  semester: number;
  start_date: string;
  end_date: string;
}

interface BackendCalendarEvent {
  id: number;
  academic_calendar_id: number;
  event_date: string;
  description: string | null;
  event_type: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
}

function toPeriod(c: BackendAcademicCalendar): AcademicCalendarPeriod {
  return {
    id: c.id,
    batchId: c.batch_id,
    semester: c.semester,
    startDate: c.start_date,
    endDate: c.end_date,
  };
}

// start_time/end_time come back as full ISO datetimes pinned to an
// arbitrary reference date (1970-01-01) — only the HH:MM time-of-day part
// is real, so it's sliced out here rather than parsed as a calendar date.
function toTimeLabel(iso: string | null): string | null {
  if (!iso) return null;
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match ? match[1] : null;
}

function toEvent(e: BackendCalendarEvent): CalendarEventItem {
  return {
    id: e.id,
    academicCalendarId: e.academic_calendar_id,
    eventDate: e.event_date,
    title: e.title,
    description: e.description,
    eventType: e.event_type as CalendarEventItem["eventType"],
    startTime: toTimeLabel(e.start_time),
    endTime: toTimeLabel(e.end_time),
  };
}

export const academicCalendarService = {
  async listPeriods(): Promise<AcademicCalendarPeriod[]> {
    const rows = await apiClient.get<BackendAcademicCalendar[]>("/academic-calendar");
    return rows.map(toPeriod);
  },

  async listEvents(academicCalendarId?: number): Promise<CalendarEventItem[]> {
    const rows = await apiClient.get<BackendCalendarEvent[]>("/academic-calendar-events", {
      academic_calendar_id: academicCalendarId,
    });
    return rows.map(toEvent);
  },
};
