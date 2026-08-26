import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/revaluation/revaluation.controller.ts — GET/PATCH/DELETE
// are coe only; POST (student applies) is student-only, so COE never creates
// these. approved/rejected are now real reachable states (the update()
// transition map previously hard-locked everything to "requested" only —
// see query.md) and evaluator_faculty_id is now settable via the same PATCH.

export type RevaluationStatus = "requested" | "under_review" | "revised" | "no_change" | "approved" | "rejected";
export type RevaluationRequestKind = "revaluation" | "retotaling";

export interface RevaluationRequest {
  id: number;
  exam_marks_id: number;
  student_id: number;
  status: RevaluationStatus;
  request_kind: RevaluationRequestKind;
  revised_marks: number | null;
  requested_at: string;
  resolved_at: string | null;
  subject_id: number | null;
  exam_id: number | null;
  remarks: string | null;
  evaluator_faculty_id: number | null;
  fee_amount: number | null;
  fee_paid: boolean | null;
  exam_marks: {
    id: number;
    marks_obtained: number | null;
    max_marks: number;
    exam_subject_mapping: {
      id: number;
      exams: { id: number; academic_year: string; semester: number };
      subjects: { id: number; name: string; subject_code: string };
    };
  };
  students: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    soa_applications: { first_name: string; last_name: string | null } | null;
  };
  faculty: { id: number; first_name: string; last_name: string } | null;
}

export function useRevaluationRequests() {
  return useQuery({
    queryKey: ["coe", "revaluation-requests"],
    queryFn: () => apiClient.get<RevaluationRequest[]>("/revaluation-requests"),
  });
}

export function useUpdateRevaluationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      status?: "under_review" | "revised" | "no_change" | "approved" | "rejected";
      revised_marks?: number;
      evaluator_faculty_id?: number;
    }) => apiClient.patch<RevaluationRequest>(`/revaluation-requests/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "revaluation-requests"] }),
  });
}
