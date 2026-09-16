import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/stationary/stationary-vendor.controller.ts
// + stationary.service.ts. `stationary_requests` itself is deliberately not
// modeled in schema.prisma (queried via raw SQL there) — this file only
// depends on the shaped JSON the vendor endpoints already return.

export type StationaryRequestStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "rejected";

export interface StationaryRequest {
  id: number;
  is_walk_in: boolean;
  requester_name: string | null;
  requester_department: string | null;
  file_summary: string | null;
  total_pages: number | null;
  copies: number;
  orientation: string | null;
  color_mode: string | null;
  paper_size: string | null;
  sides: string | null;
  binding: string | null;
  specification: string | null;
  amount: number;
  status: StationaryRequestStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /stationary-requests?status= — every requester's job, online or walk-in. */
export function useStationaryRequests(status?: string) {
  return useQuery({
    queryKey: ["stationary", "requests", status ?? "all"],
    queryFn: () => apiClient.get<StationaryRequest[]>("/stationary-requests", { status }),
    refetchInterval: 30_000,
  });
}

export interface DashboardStats {
  pending_count: number;
  oldest_pending_minutes: number | null;
  pages_printed_today: number;
  completed_today: number;
  collected_today: number;
}

/** GET /stationary-requests/stats — Dashboard's 4 stat cards. */
export function useStationaryStats() {
  return useQuery({
    queryKey: ["stationary", "stats"],
    queryFn: () => apiClient.get<DashboardStats>("/stationary-requests/stats"),
    refetchInterval: 30_000,
  });
}

/** Every forward move a vendor may make — mirrors VENDOR_ALLOWED_TRANSITIONS
 * in stationary.service.ts. `rejected` is reachable from any of these three
 * but is offered as its own action, not a status-picker option. */
export const NEXT_STATUS: Partial<Record<StationaryRequestStatus, StationaryRequestStatus>> = {
  paid: "processing",
  processing: "ready_for_pickup",
  ready_for_pickup: "completed",
};

export interface UpdateStatusInput {
  id: number;
  status: StationaryRequestStatus;
  rejection_reason?: string;
}

/** PATCH /stationary-requests/:id/status */
export function useUpdateStationaryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejection_reason }: UpdateStatusInput) =>
      apiClient.patch(`/stationary-requests/${id}/status`, { status, rejection_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stationary", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["stationary", "stats"] });
    },
  });
}

export interface StockItem {
  id: number;
  item_name: string;
  unit: string;
  quantity_left: number;
  full_stock_quantity: number;
  low_stock_threshold: number;
}

/** GET /stationary-requests/stock — Dashboard's "Stock alerts" panel. */
export function useStockItems() {
  return useQuery({
    queryKey: ["stationary", "stock"],
    queryFn: () => apiClient.get<StockItem[]>("/stationary-requests/stock"),
  });
}

/** PATCH /stationary-requests/stock/:id — vendor updates a stock count after a restock/usage count. */
export function useUpdateStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity_left }: { id: number; quantity_left: number }) =>
      apiClient.patch<StockItem>(`/stationary-requests/stock/${id}`, { quantity_left }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "stock"] }),
  });
}

export type PaymentMode = "upi" | "cash" | "internal_voucher";

export interface CreateCounterEntryInput {
  requester_name: string;
  department?: string;
  document?: string;
  specification?: string;
  copies: number;
  amount: number;
  payment_mode: PaymentMode;
}

/** POST /stationary-requests/counter — the design's "Add entry" modal
 * (a walk-in job with no linked student/staff account, already paid at the
 * counter, so it's created directly in `paid` status). */
export function useCreateCounterEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCounterEntryInput) => apiClient.post<StationaryRequest>("/stationary-requests/counter", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stationary", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["stationary", "stats"] });
    },
  });
}
