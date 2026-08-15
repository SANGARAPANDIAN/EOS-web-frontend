import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CalendarEvent {
  id: number | string;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
}

export interface InstitutionAcademicCalendar {
  semester: number | null;
  start_date: string | null;
  end_date: string | null;
  events: CalendarEvent[];
}

/** GET /me/higher-education-academic-calendar — institution-wide calendar merged with the cell's own events. */
export function useInstitutionAcademicCalendar() {
  return useQuery({
    queryKey: ["me", "higher-education-academic-calendar"],
    queryFn: () => apiClient.get<InstitutionAcademicCalendar>("/me/higher-education-academic-calendar"),
  });
}

export interface CreateCalendarEventInput {
  title: string;
  event_date: string;
  category?: string;
}

/** POST /me/higher-education-calendar-events */
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => apiClient.post<{ id: number }>("/me/higher-education-calendar-events", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-academic-calendar"] }),
  });
}
