/**
 * Shared academic-calendar types — one `academic_calendars` row is a
 * per-batch/semester period (start_date/end_date); `calendar_events` are the
 * actual dated entries inside one. Consolidated from what used to be near-
 * identical copies in academic-coordinator/types.ts and
 * modules/placement/api/academicCalendar.ts.
 */
export interface AcademicCalendarPeriod {
  id: number;
  batchId: number;
  semester: number;
  startDate: string;
  endDate: string;
}

/** Matches the real backend enum (CreateAcademicCalendarEventDto) — no richer category exists server-side. */
export type CalendarEventType = "holiday" | "event";

export interface CalendarEventItem {
  id: number;
  academicCalendarId: number;
  eventDate: string;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  startTime: string | null;
  endTime: string | null;
  /** Used to decide edit/delete affordance for "own events only" roles (Media Room, Placement) — server enforces this regardless. */
  createdByUserId: number | null;
}
