"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Real EOSbackend1 endpoints, all under /finance (see
// EOSbackend1/src/modules/finance/*). Every route is guarded server-side with
// @Roles(ROLES.FINANCE, ...) — nothing here is sample data.

const KEY = ["finance"] as const;

/* ------------------------------------------------------------------ fund */

export interface FinanceFund {
  id: number;
  academic_year: string;
  total_amount: number;
  available_amount: number;
  committed_amount: number;
  utilisation_pct: number;
  is_locked: boolean;
  notes: string | null;
  updated_at: string;
}

export interface FinanceLedgerEntry {
  id: string;
  entry_type: string;
  source: string;
  amount: number;
  balance_after: number;
  narration: string;
  purchase_order_proposal_id: number | null;
  service_order_proposal_id: number | null;
  created_at: string;
  created_by: string | null;
}

/** GET /finance/fund/current — null until Finance sets a total amount. */
export function useCurrentFund() {
  return useQuery({
    queryKey: [...KEY, "fund", "current"],
    queryFn: () => apiClient.get<FinanceFund | null>("/finance/fund/current"),
  });
}

/** GET /finance/fund */
export function useFunds() {
  return useQuery({
    queryKey: [...KEY, "fund", "all"],
    queryFn: () => apiClient.get<FinanceFund[]>("/finance/fund"),
  });
}

/** GET /finance/fund/:id/ledger */
export function useFundLedger(fundId: number | null) {
  return useQuery({
    queryKey: [...KEY, "fund", fundId, "ledger"],
    queryFn: () => apiClient.get<FinanceLedgerEntry[]>(`/finance/fund/${fundId}/ledger?limit=200`),
    enabled: fundId !== null && fundId > 0,
  });
}

export interface UpsertFundInput {
  academic_year: string;
  total_amount: number;
  notes?: string;
  is_locked?: boolean;
  reason?: string;
}

export function useCreateFund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertFundInput) => apiClient.post<FinanceFund>("/finance/fund", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateFund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpsertFundInput }) =>
      apiClient.put<FinanceFund>(`/finance/fund/${id}`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/* -------------------------------------------------------------- proposals */

export type ProposalKind = "pop" | "sop";

export interface FinanceProposal {
  id: number;
  kind: ProposalKind;
  status: string;
  reference: string | null;
  title: string;
  description: string | null;
  quantity: string | null;
  estimated_amount: number | null;
  needed_by: string | null;
  department: string | null;
  requested_by: string | null;
  vendor: string | null;
  vendor_id: number | null;
  hod_remarks: string | null;
  finance_remarks: string | null;
  hod_reviewed_at: string | null;
  finance_reviewed_at: string | null;
  created_at: string;
  approved_amount: number | null;
  order_number: string | null;
  /** Faculty nominated at approval time (before delivery). */
  assigned_faculty_id: number | null;
  assigned_faculty_name: string | null;
  assigned_faculty_department: string | null;
  assignment_note: string | null;
}

/** GET /finance/proposals/:kind?status= */
export function useProposals(kind: ProposalKind, status?: string) {
  return useQuery({
    queryKey: [...KEY, "proposals", kind, status ?? "all"],
    queryFn: () =>
      apiClient.get<FinanceProposal[]>(
        `/finance/proposals/${kind}${status ? `?status=${status}` : ""}`,
      ),
  });
}

export interface DecideInput {
  decision: "approve" | "reject";
  amount?: number;
  remarks?: string;
  fund_id?: number;
  /** Optional faculty nomination captured during approval. */
  assigned_faculty_id?: number;
  assignment_note?: string;
}

/** POST /finance/proposals/:kind/:id/decision */
export function useDecideProposal(kind: ProposalKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: DecideInput }) =>
      apiClient.post<{ id: number; status: string; approved_amount: number | null }>(
        `/finance/proposals/${kind}/${id}/decision`,
        input,
      ),
    // A decision moves money, so the fund/dashboard must refetch too.
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/* --------------------------------------------------------------- tracking */

export type OrderKind = "purchase" | "service";

export const DELIVERY_STATUSES = [
  "ordered",
  "dispatched",
  "in_transit",
  "partially_delivered",
  "delivered",
  "cancelled",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** The ordered pipeline shown as the animated tracker (cancelled is off-path). */
export const TRACKING_STEPS: DeliveryStatus[] = [
  "ordered",
  "dispatched",
  "in_transit",
  "delivered",
];

export interface TrackingEvent {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface Allotment {
  id: number;
  faculty_id: number;
  faculty_name: string;
  faculty_designation: string | null;
  faculty_department: string | null;
  quantity: number;
  remarks: string | null;
  allotted_at: string;
  allotted_by: string | null;
}

export interface OrderTracking {
  /** 0 means "no tracking row yet" — the UI offers Start tracking. */
  id: number;
  order_kind: OrderKind;
  order_id: number;
  order_number: string;
  proposal_id: number;
  title: string;
  description: string | null;
  department: string | null;
  requested_by: string | null;
  vendor: string | null;
  approved_amount: number | null;
  delivery_status: DeliveryStatus;
  expected_delivery_date: string | null;
  delivered_at: string | null;
  quantity_ordered: number | null;
  quantity_delivered: number;
  quantity_allotted: number;
  tracking_reference: string | null;
  remarks: string | null;
  order_placed_at: string;
  events: TrackingEvent[];
  allotments: Allotment[];
  is_closed: boolean;
}

/** GET /finance/tracking/:kind */
export function useOrderTracking(kind: OrderKind) {
  return useQuery({
    queryKey: [...KEY, "tracking", kind],
    queryFn: () => apiClient.get<OrderTracking[]>(`/finance/tracking/${kind}`),
  });
}

export interface CreateTrackingInput {
  order_kind: OrderKind;
  order_id: number;
  quantity_ordered?: number;
  expected_delivery_date?: string;
  tracking_reference?: string;
  remarks?: string;
}

export function useStartTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTrackingInput) =>
      apiClient.post<{ id: number }>("/finance/tracking", input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface UpdateTrackingInput {
  delivery_status?: DeliveryStatus;
  quantity_delivered?: number;
  quantity_ordered?: number;
  expected_delivery_date?: string;
  tracking_reference?: string;
  remarks?: string;
}

export function useUpdateTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTrackingInput }) =>
      apiClient.put<{ id: number; delivery_status: string }>(`/finance/tracking/${id}`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/* -------------------------------------------------------------- allotment */

export interface FacultyOption {
  id: number;
  name: string;
  designation: string | null;
  staff_code: string | null;
  department: string | null;
  email: string | null;
}

/** GET /finance/tracking/faculty-search?q= */
export function useFacultySearch(q: string) {
  return useQuery({
    queryKey: [...KEY, "faculty-search", q],
    queryFn: () =>
      apiClient.get<FacultyOption[]>(
        `/finance/tracking/faculty-search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      ),
    // Keep the previous list while the next query is in flight so the picker
    // does not flicker empty on each keystroke.
    placeholderData: (prev) => prev,
  });
}

export function useAllotOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      trackingId,
      input,
    }: {
      trackingId: number;
      input: { faculty_id: number; quantity?: number; remarks?: string };
    }) => apiClient.post<{ id: number }>(`/finance/tracking/${trackingId}/allotments`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAllotment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: { faculty_id?: number; quantity?: number; remarks?: string };
    }) => apiClient.put<{ id: number }>(`/finance/allotments/${id}`, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAllotment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number }>(`/finance/allotments/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/* -------------------------------------------------------------- dashboard */

export interface FinanceFundSummary {
  id: number;
  academic_year: string;
  total_amount: number;
  available_amount: number;
  committed_amount: number;
  utilisation_pct: number;
  is_locked: boolean;
}

export interface FinanceDashboard {
  /**
   * Institution-wide totals across EVERY fund year — not just the newest one.
   * `academic_year` names the current year purely as a label.
   */
  fund: {
    academic_year: string | null;
    total_amount: number;
    available_amount: number;
    committed_amount: number;
    utilisation_pct: number;
    is_locked: boolean;
    year_count: number;
  } | null;
  /** Per-year figures, so each year is visible in its own right. */
  fund_years: FinanceFundSummary[];
  queues: {
    pop_pending: number;
    sop_pending: number;
    pop_approved: number;
    sop_approved: number;
    rejected: number;
  };
  delivery: {
    awaiting_dispatch: number;
    in_transit: number;
    delivered: number;
    pending_allotment: number;
    cancelled: number;
  };
  spend: {
    committed_this_year: number;
    last_30_days: number;
    by_month: Array<{ month: string; amount: number }>;
  };
  recent_movements: Array<{
    id: string;
    entry_type: string;
    source: string;
    amount: number;
    narration: string;
    created_at: string;
  }>;
  top_departments: Array<{ department: string; amount: number; orders: number }>;
}

/** GET /finance/dashboard */
export function useFinanceDashboard() {
  return useQuery({
    queryKey: [...KEY, "dashboard"],
    queryFn: () => apiClient.get<FinanceDashboard>("/finance/dashboard"),
  });
}

/* ----------------------------------------------------------------- shared */

/** ₹ formatting used across every Finance screen. */
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** Compact form for tiles (₹1.2 Cr / ₹4.5 L / ₹12,000). */
export function moneyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDate(iso)}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}
