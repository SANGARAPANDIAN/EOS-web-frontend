import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApiPaginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface HrRequestFacultyRef {
  id: number;
  prefix?: string | null;
  first_name: string;
  last_name: string;
  designation: string;
  profile_url?: string | null;
  department: { id: number; name: string };
}

export interface HrUnifiedRequest {
  id: string;
  kind: "leave" | "od";
  source_id: number;
  faculty: HrRequestFacultyRef;
  from_date: string;
  to_date: string;
  detail: string | null;
  /** Only ever set for kind "leave" — OD has no sub-type. */
  leave_type: { id: number; name: string } | null;
  hod_approval_status: ApprovalStatus;
  hr_approval_status: ApprovalStatus;
  overall_status: ApprovalStatus;
  created_at: string;
}

export interface HrRequestsListParams {
  [key: string]: string | number | undefined;
  department_id?: number;
  faculty_id?: number;
  kind?: "leave" | "od";
  status?: ApprovalStatus;
  page?: number;
  limit?: number;
}

export interface CreateHrVacationEntryInput {
  faculty_id: number;
  kind: "leave" | "od";
  from_date: string;
  to_date: string;
  reason?: string;
  /** Only meaningful when kind is "leave" — FK into leave_types. */
  leave_type_id?: number;
}

/** GET /hr/requests — unified leave + OD inbox, paginated and filterable. */
export function useHrRequests(params: HrRequestsListParams = {}) {
  return useQuery({
    queryKey: hrKeys.requests.list(params),
    queryFn: () => apiClient.get<ApiPaginated<HrUnifiedRequest>>("/hr/requests", params),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateHrRequests() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "requests"] });
    queryClient.invalidateQueries({ queryKey: hrKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: hrKeys.departments.all() });
    // A leave/OD decision, creation, or deletion changes whether that faculty
    // counts as on_duty_or_leave vs. absent today — the attendance overview
    // cross-references approved leave/OD, so it needs to refresh too.
    queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "faculty", "attendance-overview"] });
  };
}

/**
 * HR only ever sets hr_approval_status here (HOD approval happens in the
 * HoD portal). The backend requires hod_approval_status to already be
 * 'approved' before this succeeds — disable the action until then rather
 * than relying solely on the resulting error.
 */
export function useHrRequestDecision() {
  const invalidate = useInvalidateHrRequests();
  return useMutation({
    mutationFn: ({
      kind,
      sourceId,
      decision,
    }: {
      kind: "leave" | "od";
      sourceId: number;
      decision: "approved" | "rejected";
    }) => {
      const path = kind === "leave" ? `/me/faculty-leaves/${sourceId}` : `/me/faculty-od-requests/${sourceId}`;
      return apiClient.patch<HrUnifiedRequest>(path, { hr_approval_status: decision });
    },
    onSuccess: invalidate,
  });
}

/** HR recording a leave/OD entry directly (single day or a date range), e.g. from the Vacation Management calendar. */
export function useCreateHrVacationEntry() {
  const invalidate = useInvalidateHrRequests();
  return useMutation({
    mutationFn: (input: CreateHrVacationEntryInput) => apiClient.post<HrUnifiedRequest>("/hr/requests", input),
    onSuccess: invalidate,
  });
}

export function useDeleteHrVacationEntry() {
  const invalidate = useInvalidateHrRequests();
  return useMutation({
    mutationFn: ({ kind, sourceId }: { kind: "leave" | "od"; sourceId: number }) =>
      apiClient.delete<{ id: number; kind: string; deleted: boolean }>(`/hr/requests/${kind}/${sourceId}`),
    onSuccess: invalidate,
  });
}
