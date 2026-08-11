import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ClearanceType = "fee_due" | "no_due" | "library_due";
export type ClearanceEffectiveStatus = "pending" | "approved" | "rejected" | "expired";

export interface ClearanceRequest {
  id: number;
  clearance_type: ClearanceType;
  reason: string | null;
  letter_file_url: string | null;
  requested_at: string;
  status: string;
  effective_status: ClearanceEffectiveStatus;
  reviewed_at: string | null;
  valid_until: string | null;
  student: { id: number; student_id_no: string; name: string; department: { id: number; name: string; code: string } };
  exam: { id: number; type: string; academic_year: string; semester: number };
}

/** GET /hall-ticket-clearance/my */
export function useMyClearanceRequests() {
  return useQuery({
    queryKey: ["hall-ticket-clearance", "my"],
    queryFn: () =>
      apiClient.get<{ data: ClearanceRequest[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        "/hall-ticket-clearance/my",
      ),
  });
}

/** POST /hall-ticket-clearance — exam_id must belong to the caller's own batch (enforced server-side). */
export function useCreateClearanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exam_id: number; clearance_type: ClearanceType; reason?: string }) =>
      apiClient.post("/hall-ticket-clearance", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hall-ticket-clearance", "my"] }),
  });
}

export interface ExamRow {
  id: number;
  academic_year: string;
  semester: number;
  title: string | null;
  status: string;
}

/** GET /exams — unfiltered/unguarded lookup; used only to populate the clearance-request exam picker. */
export function useExamsList() {
  return useQuery({
    queryKey: ["exams", "all"],
    queryFn: () => apiClient.get<ExamRow[]>("/exams"),
    staleTime: 5 * 60_000,
  });
}
