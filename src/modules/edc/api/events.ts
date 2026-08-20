import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Real backend connection — GET/POST/PATCH/DELETE /me/edc-events
// (EdcEventsController, added this session on a real `edc_events` table —
// confirmed via a live DB audit that no generic events/workshop table
// existed anywhere before). participants_count is coordinator-entered, not
// derived — no RSVP/registration mechanism exists to compute it from.

export const EDC_EVENT_TYPES = ["Workshop", "Hackathon", "Pitch Day", "Investor Connect", "Founder Meet", "Guest Lecture"] as const;
export const EDC_EVENT_STATUSES = ["Upcoming", "Registrations Open", "Planned", "Completed", "Cancelled"] as const;
export type EdcEventType = (typeof EDC_EVENT_TYPES)[number];
export type EdcEventStatus = (typeof EDC_EVENT_STATUSES)[number];

export interface EdcEventRow {
  id: number;
  title: string;
  event_type: EdcEventType;
  event_date: string;
  venue: string | null;
  participants_count: number | null;
  status: EdcEventStatus;
  created_at: string;
}

export function useEdcEvents() {
  return useQuery({
    queryKey: ["edc", "events"],
    queryFn: () => apiClient.get<EdcEventRow[]>("/me/edc-events"),
  });
}

export interface CreateEdcEventInput {
  title: string;
  event_type: EdcEventType;
  event_date: string;
  venue?: string;
  participants_count?: number;
  status?: EdcEventStatus;
}

export function useCreateEdcEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEdcEventInput) => apiClient.post<EdcEventRow>("/me/edc-events", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "events"] }),
  });
}

export function useUpdateEdcEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateEdcEventInput> }) =>
      apiClient.patch<EdcEventRow>(`/me/edc-events/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "events"] }),
  });
}

export function useDeleteEdcEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/edc-events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "events"] }),
  });
}
