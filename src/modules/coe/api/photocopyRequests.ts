import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Paginated } from "@/modules/coe/api/shared";

// src/modules/exams/photocopy-requests/photocopy-requests.controller.ts —
// new module, coe-only, paginated (max limit 100 like every other
// PaginationDto-based list here).

export type PhotocopyStatus = "requested" | "scanned" | "issued" | "rejected";

export interface PhotocopyRequest {
  id: number;
  student_id: number;
  exam_marks_id: number;
  fee_amount: number;
  status: PhotocopyStatus;
  applied_at: string;
  processed_by_user_id: number | null;
  processed_at: string | null;
  students: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    soa_applications: { first_name: string; last_name: string | null } | null;
  };
  exam_marks: {
    id: number;
    marks_obtained: number | null;
    max_marks: number;
    exam_subject_mapping: {
      id: number;
      exam_id: number;
      subjects: { id: number; name: string; subject_code: string };
      classes: { department_id: number; departments: { code: string; name: string } } | null;
    };
  };
}

export function usePhotocopyRequests(status?: PhotocopyStatus) {
  return useQuery({
    queryKey: ["coe", "photocopy-requests", status],
    queryFn: () => apiClient.get<Paginated<PhotocopyRequest>>("/photocopy-requests", { status, limit: 100 }),
  });
}

/** POST /photocopy-requests — counter entry; the whole controller is COE-only already, no student-side path exists to widen. */
export function useCreatePhotocopyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exam_marks_id: number; student_id: number; fee_amount: number }) => apiClient.post<PhotocopyRequest>("/photocopy-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "photocopy-requests"] }),
  });
}

export function useUpdatePhotocopyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: PhotocopyStatus }) =>
      apiClient.patch<PhotocopyRequest>(`/photocopy-requests/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "photocopy-requests"] }),
  });
}
