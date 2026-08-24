import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/confidential-access-log/ — new, coe-only. New
// confidential_access_events table (query.md) — strong room entry, file
// access, print run, seal break, exception, each with a real witness and
// verification method.

export type ConfidentialEventType = "strong_room_entry" | "file_access" | "print_run" | "seal_break" | "exception";

export interface ConfidentialEvent {
  id: number;
  event_type: ConfidentialEventType;
  object_description: string;
  witness_description: string | null;
  verification_method: string;
  occurred_at: string;
  question_paper_id: number | null;
  users_confidential_access_events_person_user_idTousers: { id: number; email: string };
  users_confidential_access_events_witness_user_idTousers: { id: number; email: string } | null;
}

export interface ConfidentialEventStats {
  events_logged: number;
  strong_room_entries: number;
  sealed_papers: number;
  exceptions_raised: number;
}

export function useConfidentialEvents(filters: { event_type?: ConfidentialEventType | null; search?: string }) {
  return useQuery({
    queryKey: ["coe", "confidential-events", filters.event_type ?? null, filters.search ?? ""],
    queryFn: () => apiClient.get<ConfidentialEvent[]>("/confidential-access-log", { event_type: filters.event_type ?? undefined, search: filters.search || undefined }),
  });
}

export function useConfidentialEventStats() {
  return useQuery({
    queryKey: ["coe", "confidential-event-stats"],
    queryFn: () => apiClient.get<ConfidentialEventStats>("/confidential-access-log/stats"),
  });
}

export function useCreateConfidentialEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { event_type: ConfidentialEventType; object_description: string; witness_description?: string; verification_method: string }) =>
      apiClient.post("/confidential-access-log", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "confidential-events"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "confidential-event-stats"] });
    },
  });
}
