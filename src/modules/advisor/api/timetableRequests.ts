import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// ---- Per-day timetable take-over/swap requests ----------------------------
// Backend: TimetablePeriodRequestsService / MeTimetableRequestsController
// (EOSbackend1/src/modules/faculty/timetable/). Date-scoped only — an
// accepted request changes one specific calendar date's effective schedule,
// never the recurring master timetable HoD builds (timetable_slots itself is
// never written to by any of this). Shapes below mirror toResponse() exactly.

export interface TimetableRequestPeriod {
  slot_id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject: { id: number; name: string; code: string };
}

export interface TimetableRequestSecondaryPeriod {
  slot_id: number;
  period_number: number | null;
  start_time: string | null;
  end_time: string | null;
  class_id: number | null;
  class_section: string | null;
  class_department_code: string | null;
  class_department_name: string | null;
  class_semester: number | null;
  subject: { id: number; name: string; code: string } | null;
}

export interface TimetablePeriodRequest {
  id: number;
  request_type: "takeover" | "swap";
  request_date: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  class: { id: number; section: string; department_code: string; department_name: string; semester: number | null };
  from_faculty: { id: number; name: string };
  to_faculty: { id: number; name: string };
  primary_period: TimetableRequestPeriod;
  secondary_period: TimetableRequestSecondaryPeriod | null;
  covering_subject: { id: number; name: string; code: string } | null;
  created_at: string;
  decided_at: string | null;
}

/** GET /me/timetable-requests — both directions, most recent first. */
export function useTimetableRequests() {
  return useQuery({
    queryKey: ["me", "timetable-requests"],
    queryFn: () => apiClient.get<{ sent: TimetablePeriodRequest[]; received: TimetablePeriodRequest[] }>("/me/timetable-requests"),
  });
}

/** Drives the Timetable nav item's badge — how many incoming requests are still awaiting this faculty's decision. */
export function usePendingTimetableRequestsCount() {
  const q = useTimetableRequests();
  return { ...q, data: q.data?.received.filter((r) => r.status === "pending").length };
}

export interface ColleaguePeriod {
  slot_id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject: { id: number; name: string; code: string };
  class: { id: number; section: string; department_code: string; department_name: string; semester: number | null };
}

export interface Colleague {
  id: number;
  name: string;
  designation: string;
  profile_url: string | null;
  /** This colleague's own periods on the requested date — empty means free all day. */
  periods: ColleaguePeriod[];
}

/** GET /me/timetable-requests/colleagues?date=... — same-department colleagues (excluding self), each with their periods on that date, for the take-over/swap picker. */
export function useTimetableRequestColleagues(date: string | null) {
  return useQuery({
    queryKey: ["me", "timetable-requests", "colleagues", date],
    queryFn: () => apiClient.get<Colleague[]>("/me/timetable-requests/colleagues", { date: date ?? undefined }),
    enabled: date !== null,
  });
}

function invalidateAfterMutation(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["me", "timetable-requests"] });
  queryClient.invalidateQueries({ queryKey: ["me", "classes", "today"] });
}

/** POST /me/timetable-requests/takeover */
export function useCreateTakeoverRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { primary_slot_id: number; to_faculty_id: number; request_date: string }) =>
      apiClient.post<TimetablePeriodRequest>("/me/timetable-requests/takeover", input),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

/** POST /me/timetable-requests/swap — to_faculty_id is always derived server-side from secondary_slot_id's real owner. */
export function useCreateSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { primary_slot_id: number; secondary_slot_id: number; request_date: string }) =>
      apiClient.post<TimetablePeriodRequest>("/me/timetable-requests/swap", input),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

/** PATCH /me/timetable-requests/:id/respond — the covering/receiving faculty only. */
export function useRespondToTimetableRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, covering_subject_id }: { id: number; decision: "accepted" | "rejected"; covering_subject_id?: number }) =>
      apiClient.patch<TimetablePeriodRequest>(`/me/timetable-requests/${id}/respond`, { decision, covering_subject_id }),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

/** DELETE /me/timetable-requests/:id — the requester withdrawing their own still-pending request. */
export function useCancelTimetableRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/timetable-requests/${id}`),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}
