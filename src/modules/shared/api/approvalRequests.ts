import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ApprovalEntityType = "department" | "course" | "batch" | "class" | "curriculum_mapping";
export type ApprovalAction = "create" | "add_mapping" | "remove_mapping";
export type ApprovalRequestStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequestItem {
  id: number;
  entity_type: ApprovalEntityType;
  action: ApprovalAction;
  department_id: number | null;
  payload: Record<string, unknown>;
  status: ApprovalRequestStatus;
  requested_by_user_id: number;
  requested_at: string;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_entity_id: number | null;
}

const QUERY_KEY = ["approval-requests"];

/** GET /approval-requests — Principal sees master-data requests, HOD sees their own department's curriculum-mapping requests. */
export function usePendingApprovalRequests() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiClient.get<ApprovalRequestItem[]>("/approval-requests"),
  });
}

export function useDecideApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: number; decision: "approve" | "reject"; reason?: string }) =>
      apiClient.post<ApprovalRequestItem>(`/approval-requests/${id}/${decision}`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export interface SubmitDepartmentInput {
  name: string;
  code: string;
}
export interface SubmitCourseInput {
  name: string;
  code: string;
  department_id: number;
  duration_years: number;
}
export interface SubmitBatchInput {
  name: string;
  start_year: number;
  end_year: number;
}
export interface SubmitClassInput {
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester?: number;
}
export interface SubmitMappingInput {
  department_id: number;
  semester: number;
  subject_id: number;
}

export const submitApprovalRequest = {
  department: (input: SubmitDepartmentInput) => apiClient.post<ApprovalRequestItem>("/approval-requests/departments", input),
  course: (input: SubmitCourseInput) => apiClient.post<ApprovalRequestItem>("/approval-requests/courses", input),
  batch: (input: SubmitBatchInput) => apiClient.post<ApprovalRequestItem>("/approval-requests/batches", input),
  schoolClass: (input: SubmitClassInput) => apiClient.post<ApprovalRequestItem>("/approval-requests/classes", input),
  addMapping: (input: SubmitMappingInput) => apiClient.post<ApprovalRequestItem>("/approval-requests/curriculum-mapping/add", input),
  removeMapping: (input: SubmitMappingInput) => apiClient.post<ApprovalRequestItem>("/approval-requests/curriculum-mapping/remove", input),
};
