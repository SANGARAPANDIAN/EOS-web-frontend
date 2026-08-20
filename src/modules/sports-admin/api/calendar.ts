import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CalendarEntry {
  date: string;
  title: string;
  tag: string;
  meta: string;
}

export interface CalendarResponse {
  year: number;
  month: number;
  entries: CalendarEntry[];
}

export function useSportsCalendar(year: number, month: number) {
  return useQuery({
    queryKey: ["sports-admin", "calendar", year, month],
    queryFn: () => apiClient.get<CalendarResponse>("/sports-admin/calendar", { year, month }),
  });
}

export interface CreateCalendarNoteInput {
  title: string;
  category: string;
  event_date: string;
}

export function useCreateCalendarNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarNoteInput) => apiClient.post("/sports-admin/calendar/notes", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "calendar"] }),
  });
}

export function useDeleteCalendarNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/calendar/notes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "calendar"] }),
  });
}
