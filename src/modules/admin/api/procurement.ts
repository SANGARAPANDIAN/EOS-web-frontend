import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ProposalKind = "pop" | "sop";

export type ProposalStatus = "pending" | "finance_approved" | "hod_approved" | "principal_approved" | "rejected";

export interface ProposalView {
  id: number;
  kind: ProposalKind;
  status: ProposalStatus;
  reference: string;
  title: string;
  description: string;
  quantity: string | number;
  estimated_amount: string | null;
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
  approved_amount: string | null;
  order_number: string | null;
}

export interface OrderRecord {
  id: number;
  proposal_id: number;
  po_number?: string;
  so_number?: string;
  approved_by_user_id: number | null;
  approved_at: string | null;
  file_url: string | null;
  sent_to_vendor_at: string | null;
  created_at: string;
}

function proposalsPath(kind: ProposalKind) {
  return kind === "pop" ? "/purchase-order-proposals" : "/service-order-proposals";
}
function ordersPath(kind: ProposalKind) {
  return kind === "pop" ? "/purchase-orders" : "/service-orders";
}

export const procurementKeys = {
  all: ["procurement"] as const,
  proposals: (kind: ProposalKind, status?: string) => [...procurementKeys.all, "proposals", kind, status] as const,
  orders: (kind: ProposalKind) => [...procurementKeys.all, "orders", kind] as const,
};

/** GET /finance/proposals/:kind?status= — Admin has read access here (same role guard as Finance/Principal). */
export function useFinanceProposals(kind: ProposalKind, status?: ProposalStatus) {
  return useQuery({
    queryKey: procurementKeys.proposals(kind, status),
    queryFn: () => apiClient.get<ProposalView[]>(`/finance/proposals/${kind}`, status ? { status } : undefined),
  });
}

/** GET /purchase-orders or /service-orders — used only to resolve proposal_id -> order.id/sent_to_vendor_at, since the finance/proposals view exposes order_number but not the order's own id. */
export function useOrders(kind: ProposalKind) {
  return useQuery({
    queryKey: procurementKeys.orders(kind),
    queryFn: () => apiClient.get<OrderRecord[]>(ordersPath(kind)),
  });
}

/** PATCH /purchase-order-proposals/:id or /service-order-proposals/:id — the only field this endpoint ever changes is vendor_id; it never touches workflow status. */
export function useAssignProposalVendor(kind: ProposalKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vendor_id }: { id: number; vendor_id: number }) =>
      apiClient.patch<{ id: number; vendor_id: number | null }>(`${proposalsPath(kind)}/${id}`, { vendor_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.all }),
  });
}

/** PATCH /purchase-orders/:id or /service-orders/:id — marks the already-created order as sent to the vendor, optionally attaching a document link. */
export function useMarkOrderSent(kind: ProposalKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, sent_to_vendor_at, file_url }: { orderId: number; sent_to_vendor_at: string; file_url?: string }) =>
      apiClient.patch<OrderRecord>(`${ordersPath(kind)}/${orderId}`, { sent_to_vendor_at, file_url }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procurementKeys.all }),
  });
}
