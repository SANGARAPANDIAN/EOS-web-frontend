import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/secretary/service-requests/
// service-requests.{controller,service}.ts — GET /me/service-requests
// already returns every request (not just the caller's own) when the
// caller is Admin, and PATCH /me/service-requests/:id/review is Admin-only.
// This was a genuine frontend gap, not a backend one: no Admin page ever
// called either endpoint, so Secretary's submitted SOP requests had nowhere
// to surface once submitted. Same "real backend, missing frontend wiring"
// shape as the hostel-leave routing fix earlier this project.

export type ServiceRequestStatus = "draft" | "pending" | "approved" | "rejected";

export interface ServiceRequestItem {
  id: number;
  service_name: string;
}
export interface ServiceRequestRow {
  id: number;
  title: string;
  justification: string | null;
  status: ServiceRequestStatus;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  items: ServiceRequestItem[];
  requested_by: { id: number; name: string };
  reviewed_by: { id: number; name: string } | null;
}

export interface ServiceRequestsListResponse {
  data: ServiceRequestRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListServiceRequestsParams {
  status?: ServiceRequestStatus | "all";
  page?: number;
  limit?: number;
}

/** GET /me/service-requests — Admin sees every request, across all secretaries. */
export function useAdminServiceRequests(params: ListServiceRequestsParams) {
  const { status, ...rest } = params;
  return useQuery({
    queryKey: ["admin", "service-requests", "list", params],
    queryFn: () =>
      apiClient.get<ServiceRequestsListResponse>("/me/service-requests", {
        ...rest,
        status: status && status !== "all" ? status : undefined,
      }),
    placeholderData: keepPreviousData,
  });
}

/** Unpaginated pending count for the sidebar badge and dashboard KPI — same pattern as every other module's badge fetch. */
export function usePendingServiceRequestCount() {
  return useQuery({
    queryKey: ["admin", "service-requests", "pending-count"],
    queryFn: () =>
      apiClient
        .get<ServiceRequestsListResponse>("/me/service-requests", { status: "pending", limit: 1 })
        .then((r) => r.meta.total),
  });
}

/** PATCH /me/service-requests/:id/review — Admin only, only while 'pending'. */
export function useReviewServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approved" | "rejected" }) =>
      apiClient.patch<ServiceRequestRow>(`/me/service-requests/${id}/review`, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "service-requests"] });
    },
  });
}
