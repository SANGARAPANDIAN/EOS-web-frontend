import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type QueueStatus = "waiting" | "consult" | "done";

export interface QueueRow {
  id: number;
  token: string;
  name: string;
  dept: string;
  complaint: string;
  wait: string;
  status: QueueStatus;
}

/** GET /me/medical-centre-opd-queue — omit `date` for today's live queue, or pass a past YYYY-MM-DD for history. */
export function useOpdQueue(date?: string) {
  return useQuery({
    queryKey: ["me", "medical-centre-opd-queue", date ?? "today"],
    queryFn: () => apiClient.get<QueueRow[]>("/me/medical-centre-opd-queue", date ? { date } : undefined),
    refetchInterval: date ? undefined : 30_000,
  });
}

export interface CreateWalkinInput {
  visitor_type: "student" | "faculty";
  identifier: string;
  reason?: string;
  attended_by_staff_id?: number;
  to_queue?: boolean;
}

/** POST /me/medical-centre-opd-queue */
export function useAddWalkin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWalkinInput) => apiClient.post<{ id: number }>("/me/medical-centre-opd-queue", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-opd-queue"] });
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-dashboard"] });
    },
  });
}

/** POST /me/medical-centre-opd-queue/:id/advance */
export function useAdvanceQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<{ id: number; status: QueueStatus }>(`/me/medical-centre-opd-queue/${id}/advance`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-opd-queue"] }),
  });
}

export interface OpdPatientMatch {
  kind: "student" | "faculty";
  student_id: number | null;
  faculty_id: number | null;
  name: string;
  identifier: string | null;
  department: string | null;
}

/**
 * GET /me/medical-centre-opd-queue/search?q=&kind=
 *
 * One search covering students and staff — whoever walks up to the counter
 * could be either, so the operator does not pick a register first. Matched
 * case-insensitively across name, roll no, register no, student id and staff
 * code.
 */
export function useOpdPatientSearch(term: string, kind?: "student" | "faculty" | "all") {
  const q = term.trim();
  return useQuery({
    queryKey: ["me", "medical-centre-opd-queue", "search", q, kind ?? "all"],
    queryFn: () =>
      apiClient.get<OpdPatientMatch[]>("/me/medical-centre-opd-queue/search", {
        q,
        kind: kind && kind !== "all" ? kind : undefined,
      }),
    enabled: q.length >= 2,
    placeholderData: (prev) => prev,
  });
}
