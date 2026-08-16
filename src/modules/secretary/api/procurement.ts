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

export type ServiceRequestStatus = PurchaseRequestStatus;

export interface ServiceRequestRow {
  id: number;
  title: string;
  department: { id: number; name: string } | null;
  raised_by: { id: number; email: string } | null;
  service_description: string;
  quantity: string | null;
  location: string | null;
  needed_by: string | null;
  status: ServiceRequestStatus;
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

/** GET /me/service-requests — Secretary sees only requests they raised. */
export function useServiceRequests(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["secretary", "service-requests", status],
    // Real backend paginates (paginate() -> {data, meta}), not a bare array.
    queryFn: () => apiClient.get<{ data: ServiceRequestRow[] }>(`/me/service-requests${qs}`).then((r) => r.data),
  });
}

export interface CreateServiceRequestInput {
  department_id: number;
  title: string;
  service_description: string;
  quantity?: string;
  location?: string;
  needed_by?: string;
}

/** POST /me/service-requests */
export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceRequestInput) => apiClient.post("/me/service-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "service-requests"] }),
  });
}
