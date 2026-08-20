import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/procurement/{purchase-requests,
// service-requests}/*.{controller,service}.ts — full CRUD already existed,
// purpose-built and ALREADY Secretary-scoped (own requests only — this is
// the one place Secretary is NOT institution-wide, matching the precedent
// set by the module itself: a Secretary account has no structural
// department link, so `department_id` is client-supplied on create).
//
// KNOWN BACKEND GAP (not fixed here, flagged to the user): a separate
// `PrincipalApprovalsService` can independently move a `hod_approved` row
// to `principal_approved`, but `financeReview()` only accepts a row that
// is still exactly `hod_approved` — so if Principal acts first on a
// request raised through this endpoint, Finance's own review will 422
// forever after. Pre-existing conflict between two approval chains,
// unrelated to this frontend wiring.
//
// FIELDS WITH NO BACKEND EQUIVALENT (not faked): `ref` (formatted request
// code), `trail` (free-text audit line), `amount` (POP), `category`/
// `priority` (SOP), a client-controlled numeric `stage`, and a "Draft"
// state (every request is created immediately as "Awaiting HoD approval" —
// there is no draft-then-submit two-step on this endpoint).

export type PurchaseRequestStatus = "pending_hod" | "pending_finance" | "approved" | "rejected_by_hod" | "rejected_by_finance" | "converted";

export interface PurchaseRequestRow {
  id: number;
  title: string;
  department: { id: number; name: string } | null;
  raised_by: { id: number; email: string } | null;
  purpose: string | null;
  quantity: number;
  needed_by: string | null;
  status: PurchaseRequestStatus;
  hod_reviewer: { id: number; email: string } | null;
  hod_reviewed_at: string | null;
  hod_remarks: string | null;
  finance_reviewer: { id: number; email: string } | null;
  finance_reviewed_at: string | null;
  finance_remarks: string | null;
  order_number: string | null;
  converted_at: string | null;
  created_at: string;
}

/** GET /me/purchase-requests — Secretary sees only requests they raised. */
export function usePurchaseRequests(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["secretary", "purchase-requests", status],
    // Real backend paginates (paginate() -> {data, meta}), not a bare array.
    queryFn: () => apiClient.get<{ data: PurchaseRequestRow[] }>(`/me/purchase-requests${qs}`).then((r) => r.data),
  });
}

export interface CreatePurchaseRequestInput {
  department_id: number;
  item_name: string;
  quantity: number;
  purpose?: string;
  needed_by?: string;
}

/** POST /me/purchase-requests */
export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseRequestInput) => apiClient.post("/me/purchase-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "purchase-requests"] }),
  });
}

// --- SOP (Service requests) — REWIRED to the real, now-reachable
// `secretary/service-requests` module (table: secretary_service_requests +
// secretary_service_request_items). This was previously a silent route
// collision: `procurement/service-requests` also registered
// `me/service-requests` and, being imported earlier in app.module.ts, won
// every single request — the real Secretary-owned draft/multi-item/
// submit/withdraw module was 100% unreachable despite being fully built.
// The Procurement module was moved to `me/service-indent-requests` (no
// other frontend page called it) so this real module is finally live.
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

/** GET /me/service-requests — Secretary sees only requests they raised. */
export function useServiceRequests(status?: ServiceRequestStatus) {
  const qs = status ? `status=${status}&limit=100` : "limit=100";
  return useQuery({
    queryKey: ["secretary", "service-requests", status],
    queryFn: () => apiClient.get<{ data: ServiceRequestRow[] }>(`/me/service-requests?${qs}`).then((r) => r.data),
  });
}

export interface ServiceRequestItemInput {
  service_name: string;
}
export interface CreateServiceRequestInput {
  title: string;
  justification?: string;
  items?: ServiceRequestItemInput[];
}

/** POST /me/service-requests — always created as 'draft'. */
export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceRequestInput) => apiClient.post("/me/service-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "service-requests"] }),
  });
}

/** PATCH /me/service-requests/:id — own request, only while 'draft'. */
export function useUpdateServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateServiceRequestInput> }) => apiClient.patch(`/me/service-requests/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "service-requests"] }),
  });
}

/** POST /me/service-requests/:id/submit — moves a draft to 'pending'. */
export function useSubmitServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/me/service-requests/${id}/submit`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "service-requests"] }),
  });
}

/** DELETE /me/service-requests/:id — own request, only while 'draft'. */
export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/service-requests/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "service-requests"] }),
  });
}
