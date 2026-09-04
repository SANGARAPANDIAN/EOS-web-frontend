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
 * student's own user_id. No other role or student ever sees these rows —
 * unlike the institution academic calendar (calendar_events), which every
 * student in the batch reads the same copy of. Same generic module Principal
 * already uses (src/modules/personal-calendar), just newly opened to Student.
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

/** DELETE /me/personal-calendar-entries/:id — only the owner (this student) may delete their own entry. */
export function useDeletePersonalCalendarEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number; deleted: boolean }>(`/me/personal-calendar-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "personal-calendar-entries"] });
    },
  });
}
