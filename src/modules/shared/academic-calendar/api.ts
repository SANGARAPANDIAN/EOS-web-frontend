import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AcademicCalendarPeriod, CalendarEventItem } from "./types";

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
  created_by_user_id: number | null;
}

function toPeriod(c: BackendAcademicCalendar): AcademicCalendarPeriod {
  return { id: c.id, batchId: c.batch_id, semester: c.semester, startDate: c.start_date, endDate: c.end_date };
}

// start_time/end_time have round-tripped as full ISO datetimes pinned to an
// arbitrary reference date ("1970-01-01T09:00:00.000Z") from some backend
// paths and a plain "09:00" from others (AcademicCalendarEventsService.
// serializeEvent now formats it that way) — only the HH:MM time-of-day part
// is ever real, so this matches either shape rather than assuming one.
function toTimeLabel(value: string | null): string | null {
  if (!value) return null;
  const match = /(\d{2}:\d{2})/.exec(value);
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
    createdByUserId: e.created_by_user_id,
  };
}

const KEY = ["shared", "academic-calendar"] as const;

/** GET /academic-calendar — every published batch/semester period, read-only for every role that reaches this hook. */
export function useAcademicCalendarPeriods() {
  return useQuery({
    queryKey: [...KEY, "periods"],
    queryFn: async () => {
      const rows = await apiClient.get<BackendAcademicCalendar[]>("/academic-calendar");
      return rows.map(toPeriod);
    },
    staleTime: 5 * 60 * 1000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be well above staleTime — same reasoning, same reference-data tier.
    gcTime: 10 * 60 * 1000,
  });
}

/** GET /academic-calendar-events?academic_calendar_id= */
export function useCalendarEvents(academicCalendarId?: number) {
  return useQuery({
    queryKey: [...KEY, "events", academicCalendarId],
    queryFn: async () => {
      const rows = await apiClient.get<BackendCalendarEvent[]>("/academic-calendar-events", {
        academic_calendar_id: academicCalendarId,
      });
      return rows.map(toEvent);
    },
  });
}

export interface CreateCalendarEventInput {
  academic_calendar_id: number;
  title: string;
  event_date: string;
  event_type: "holiday" | "event";
  start_time: string;
  end_time: string;
  description?: string;
}

/**
 * POST /academic-calendar-events — role-gated server-side to
 * ACADEMIC_COORDINATOR/PRINCIPAL/SECRETARY/MEDIA_ROOM/PLACEMENT. The latter
 * two may only edit/delete events they created themselves; the rest have
 * unrestricted access to the shared institution calendar.
 */
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => apiClient.post<BackendCalendarEvent>("/academic-calendar-events", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...KEY, "events"] }),
  });
}

/** PATCH /academic-calendar-events/:id */
export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateCalendarEventInput> & { id: number }) =>
      apiClient.patch<BackendCalendarEvent>(`/academic-calendar-events/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...KEY, "events"] }),
  });
}

/** DELETE /academic-calendar-events/:id */
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/academic-calendar-events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...KEY, "events"] }),
  });
}
