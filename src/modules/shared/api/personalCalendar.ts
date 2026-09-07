import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

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
 * GET /me/personal-calendar-entries — private notes, scoped to the logged-in
 * caller's own user_id. No other role or user ever sees these rows — unlike
 * the institution academic calendar (calendar_events), which every viewer in
 * scope reads the same copy of. Role-generic by construction: the backend
 * (src/modules/personal-calendar) scopes every query to the caller's JWT
 * user_id, never a client-supplied one — Principal, Student, HoD and Faculty
 * (Advisor uses the same faculty role/login) all share this exact module.
 */
export function usePersonalCalendarEntries() {
  return useQuery({
    queryKey: ["me", "personal-calendar-entries"],
    queryFn: () => apiClient.get<PersonalCalendarEntry[]>("/me/personal-calendar-entries"),
  });
}

export interface AddPersonalCalendarEntryInput {
  entry_date: string;
  title: string;
}

/** POST /me/personal-calendar-entries — category is omitted here and defaults to "personal" server-side. */
export function useAddPersonalCalendarEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddPersonalCalendarEntryInput) => apiClient.post<PersonalCalendarEntry>("/me/personal-calendar-entries", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "personal-calendar-entries"] });
    },
  });
}

/** DELETE /me/personal-calendar-entries/:id — only the owner (this caller) may delete their own entry. */
export function useDeletePersonalCalendarEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number; deleted: boolean }>(`/me/personal-calendar-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "personal-calendar-entries"] });
    },
  });
}
