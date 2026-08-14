import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AttendanceMark, Ref } from "./types";

export type SessionStatus = "pending" | "confirmed" | "done" | "cancelled";

export interface SessionListItem {
  id: number;
  discipline: Ref;
  facility: Ref | null;
  coach: Ref | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  status: SessionStatus;
  athlete_count: number;
}

export interface SessionDetail extends SessionListItem {
  roster: { student_id: number; name: string; meta: string; status: AttendanceMark | null }[];
}

export interface CreateSessionInput {
  discipline_id: number;
  facility_id?: number;
  coach_faculty_id?: number;
  session_date: string;
  start_time?: string;
  end_time?: string;
}

export function useSessions(date?: string) {
  return useQuery({
    queryKey: ["sports-admin", "sessions", date],
    queryFn: () => apiClient.get<SessionListItem[]>("/sports-admin/sessions", { date }),
  });
}

export function useSessionDetail(id: number) {
  return useQuery({
    queryKey: ["sports-admin", "sessions", id],
    queryFn: () => apiClient.get<SessionDetail>(`/sports-admin/sessions/${id}`),
    enabled: Boolean(id),
  });
}

export interface AttendanceSummaryRow {
  discipline: Ref;
  sessions_this_week: number;
  athlete_count: number;
  attendance_pct: number;
}

export function useAttendanceSummary(disciplineId?: number) {
  return useQuery({
    queryKey: ["sports-admin", "sessions", "attendance-summary", disciplineId],
    queryFn: () =>
      apiClient.get<AttendanceSummaryRow[]>("/sports-admin/sessions/attendance-summary", {
        discipline_id: disciplineId,
      }),
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSessionInput) => apiClient.post<SessionListItem>("/sports-admin/sessions", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "sessions"] }),
  });
}

/** PATCH /sports-admin/sessions/:id — deliberately excludes discipline_id, same as the backend's UpdateSessionDto (moving a session to a different discipline is out of scope for this endpoint). */
export interface UpdateSessionInput {
  facility_id?: number;
  coach_faculty_id?: number;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  status?: SessionStatus;
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateSessionInput & { id: number }) =>
      apiClient.patch<SessionListItem>(`/sports-admin/sessions/${id}`, input),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "sessions", v.id] });
    },
  });
}

export function useMarkAttendance(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (marks: { student_id: number; status: AttendanceMark }[]) =>
      apiClient.put(`/sports-admin/sessions/${sessionId}/attendance`, { marks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "sessions", sessionId] });
    },
  });
}

export function useMarkSessionDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => apiClient.patch(`/sports-admin/sessions/${sessionId}`, { status: "done" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "dashboard"] });
    },
  });
}

export function useMarkAllPresent(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/sports-admin/sessions/${sessionId}/mark-all-present`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sports-admin", "sessions", sessionId] });
    },
  });
}
