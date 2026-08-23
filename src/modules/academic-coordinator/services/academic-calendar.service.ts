import { apiClient } from "@/lib/api/client";
import type {
  AcademicCalendarPeriod,
  CalendarEventItem,
  CreateAcademicCalendarPeriodInput,
  CreateCalendarEventInput,
  UpdateAcademicCalendarPeriodInput,
  UpdateCalendarEventInput,
} from "../types";

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
  return { id: c.id, batchId: c.batch_id, semester: c.semester, startDate: c.start_date, endDate: c.end_date };
}

// start_time/end_time round-trip as full ISO datetimes pinned to an
// arbitrary reference date — only the HH:MM time-of-day part is real.
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

  async createPeriod(input: CreateAcademicCalendarPeriodInput): Promise<AcademicCalendarPeriod> {
    const c = await apiClient.post<BackendAcademicCalendar>("/academic-calendar", input);
    return toPeriod(c);
  },

  async updatePeriod(id: number, input: UpdateAcademicCalendarPeriodInput): Promise<AcademicCalendarPeriod> {
    const c = await apiClient.patch<BackendAcademicCalendar>(`/academic-calendar/${id}`, input);
    return toPeriod(c);
  },

  async deletePeriod(id: number): Promise<void> {
    await apiClient.delete(`/academic-calendar/${id}`);
  },

  async listEvents(academicCalendarId?: number): Promise<CalendarEventItem[]> {
    const rows = await apiClient.get<BackendCalendarEvent[]>("/academic-calendar-events", { academic_calendar_id: academicCalendarId });
    return rows.map(toEvent);
  },

  async createEvent(input: CreateCalendarEventInput): Promise<CalendarEventItem> {
    const e = await apiClient.post<BackendCalendarEvent>("/academic-calendar-events", input);
    return toEvent(e);
  },

  async updateEvent(id: number, input: UpdateCalendarEventInput): Promise<CalendarEventItem> {
    const e = await apiClient.patch<BackendCalendarEvent>(`/academic-calendar-events/${id}`, input);
    return toEvent(e);
  },

  async deleteEvent(id: number): Promise<void> {
    await apiClient.delete(`/academic-calendar-events/${id}`);
  },
};
