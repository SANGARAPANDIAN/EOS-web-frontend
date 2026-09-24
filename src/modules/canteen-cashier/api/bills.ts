import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type PaymentMode = "cash" | "upi";

export interface CreateBillItemInput {
  dish_id: number;
  quantity: number;
  is_parcel?: boolean;
}

export interface CreateBillInput {
  items: CreateBillItemInput[];
  payment_mode: PaymentMode;
  force_emergency?: boolean;
}

export interface UnavailableItem {
  dish_id: number;
  dish_name: string;
  requested: number;
  available: number;
}

export type CreateBillResult =
  | {
      ok: true;
      bill_id: number;
      order_id: number;
      subtotal: number;
      parcel_charge_total: number;
      gst_percentage: number;
      gst_amount: number;
      total_amount: number;
      bill_type: "Dine-in" | "Parcel" | "Mixed";
      is_emergency: boolean;
    }
  | {
      ok: false;
      unavailable_items: UnavailableItem[];
    };

export interface BillRow {
  id: number;
  order_id: number | null;
  cashier_user_id: number | null;
  cashier: string;
  amount: number;
  payment_mode: string;
  bill_type: string | null;
  is_active: boolean;
  is_emergency: boolean;
  date_time: string;
  voided_at: string | null;
  items: string[];
}

export interface BillsSummary {
  total_bills: number;
  active_bills: number;
  voided_bills: number;
  emergency_bills: number;
  total_amount: number;
}

export interface BillsList {
  items: BillRow[];
  summary: BillsSummary;
}

export interface BillsQuery {
  [key: string]: string | undefined;
  from?: string;
  to?: string;
  search?: string;
}

const billKeys = {
  all: ["canteen-cashier", "bills"] as const,
  list: (query: BillsQuery) => ["canteen-cashier", "bills", "list", query] as const,
};

/** POST /canteen-cashier/bills — creates a bill, or returns {ok:false, unavailable_items} on insufficient stock (not an error response). */
export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillInput) => apiClient.post<CreateBillResult>("/canteen-cashier/bills", input),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: billKeys.all });
        queryClient.invalidateQueries({ queryKey: ["canteen-cashier", "dishes"] });
      }
    },
  });
}

/** GET /canteen-cashier/bills?from=&to=&search= */
export function useBills(query: BillsQuery) {
  return useQuery({
    queryKey: billKeys.list(query),
    queryFn: () => apiClient.get<BillsList>("/canteen-cashier/bills", query),
  });
}

/** PATCH /canteen-cashier/bills/:id/void — own bills only, same calendar day, reverts stock. */
export function useVoidBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<{ success: boolean }>(`/canteen-cashier/bills/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.all });
      queryClient.invalidateQueries({ queryKey: ["canteen-cashier", "dishes"] });
    },
  });
}
