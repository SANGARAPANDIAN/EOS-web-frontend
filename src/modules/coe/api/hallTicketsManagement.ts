import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/hall-tickets/ — extended (not replaced) with a real
// per-exam roster view (approved registrations joined against generated
// tickets) and mismatch reporting. Generation itself was already real.

export interface HallTicketRosterRow {
  student: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    soa_applications: { first_name: string; last_name: string | null } | null;
    classes: { current_semester: number | null; departments: { id: number; code: string; name: string } } | null;
  };
  fee_status: "paid" | "unpaid" | "partial";
  hall_ticket: {
    id: number;
    file_url: string;
    generated_at: string;
    downloaded_at: string | null;
    mismatch_reported: boolean;
    mismatch_note: string | null;
  } | null;
}

export function useHallTicketRoster(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "hall-ticket-roster", examId],
    queryFn: () => apiClient.get<HallTicketRosterRow[]>(`/exams/${examId}/hall-tickets`),
    enabled: examId != null,
  });
}

export function useGenerateHallTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, studentId }: { examId: number; studentId: number }) =>
      apiClient.post(`/exams/${examId}/hall-tickets/${studentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "hall-ticket-roster"] }),
  });
}

export function useMarkHallTicketDownloaded() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, studentId }: { examId: number; studentId: number }) =>
      apiClient.post(`/exams/${examId}/hall-tickets/${studentId}/download`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "hall-ticket-roster"] }),
  });
}

export function useReportMismatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, studentId, note }: { examId: number; studentId: number; note: string }) =>
      apiClient.post(`/exams/${examId}/hall-tickets/${studentId}/mismatch`, { note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "hall-ticket-roster"] }),
  });
}

export interface HallTicketScheduleRow {
  date: string;
  session: "FN" | "AN";
  subject_code: string;
  subject_name: string;
  hall: string | null;
  seat: string | null;
}

export function useHallTicketSchedule(examId: number | null, studentId: number | null) {
  return useQuery({
    queryKey: ["coe", "hall-ticket-schedule", examId, studentId],
    queryFn: () => apiClient.get<HallTicketScheduleRow[]>(`/exams/${examId}/hall-tickets/${studentId}/schedule`),
    enabled: examId != null && studentId != null,
  });
}

/** GET /hall-tickets/count — total tickets ever generated across every exam. Used only for the sidebar nav badge. */
export function useHallTicketsTotalCount() {
  return useQuery({
    queryKey: ["coe", "hall-tickets-count"],
    queryFn: () => apiClient.get<{ total: number }>("/hall-tickets/count"),
    staleTime: 60 * 1000,
  });
}
