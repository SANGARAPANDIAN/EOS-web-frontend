import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";
import type { ApiPaginated } from "./requests";
import type { AppraisalDivision } from "./appraisalCriteria";

export type AppraisalRequestStatus = "submitted" | "hod_reviewed" | "hr_scored" | "management_approved" | "rejected";

export interface AppraisalEntry {
  id: number;
  description: string | null;
  score: number | null;
  criteria: { id: number; name: string; max_score: number; division: AppraisalDivision };
}

export interface AppraisalRequest {
  id: number;
  academic_year: string;
  status: AppraisalRequestStatus;
  faculty: {
    id: number;
    prefix?: string | null;
    first_name: string;
    last_name: string;
    designation: string;
    profile_url?: string | null;
  };
  hod_reviewer: { id: number; email: string } | null;
  hod_reviewed_at: string | null;
  management_approver: { id: number; email: string } | null;
  management_approved_at: string | null;
  created_at: string;
  entries: AppraisalEntry[];
}

export interface AppraisalRequestsListParams {
  [key: string]: string | number | undefined;
  faculty_id?: number;
  academic_year?: string;
  status?: AppraisalRequestStatus;
  page?: number;
  limit?: number;
}

/** GET /me/appraisal_requests — HR Payroll sees every request; paginated, filterable. */
export function useAppraisalRequests(params: AppraisalRequestsListParams = {}) {
  return useQuery({
    queryKey: hrKeys.appraisalRequests.list(params),
    queryFn: () => apiClient.get<ApiPaginated<AppraisalRequest>>("/me/appraisal_requests", params),
    placeholderData: keepPreviousData,
  });
}

/** GET /me/appraisal_requests/:id */
export function useAppraisalRequest(id: number | null) {
  return useQuery({
    queryKey: hrKeys.appraisalRequests.detail(id ?? -1),
    queryFn: () => apiClient.get<AppraisalRequest>(`/me/appraisal_requests/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

function useInvalidateAppraisalRequests() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "appraisal-requests"] });
    queryClient.invalidateQueries({ queryKey: hrKeys.dashboard() });
  };
}

/** PATCH /me/appraisal_requests/:id, status "hr_scored" — HR-only transition, supplying each entry's score. */
export function useScoreAppraisalRequest() {
  const invalidate = useInvalidateAppraisalRequests();
  return useMutation({
    mutationFn: ({ id, entries }: { id: number; entries: { entry_id: number; score: number }[] }) =>
      apiClient.patch<AppraisalRequest>(`/me/appraisal_requests/${id}`, { status: "hr_scored", entries }),
    onSuccess: invalidate,
  });
}

/** PATCH /me/appraisal_requests/:id, status "management_approved". */
export function useApproveAppraisalRequest() {
  const invalidate = useInvalidateAppraisalRequests();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<AppraisalRequest>(`/me/appraisal_requests/${id}`, { status: "management_approved" }),
    onSuccess: invalidate,
  });
}

/** PATCH /me/appraisal_requests/:id, status "rejected". */
export function useRejectAppraisalRequest() {
  const invalidate = useInvalidateAppraisalRequests();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<AppraisalRequest>(`/me/appraisal_requests/${id}`, { status: "rejected" }),
    onSuccess: invalidate,
  });
}
