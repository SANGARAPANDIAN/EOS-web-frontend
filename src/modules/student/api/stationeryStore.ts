import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { loadScriptOnce } from "@/lib/utils/loadScript";

// Mirrors EOS-backend's Stationery Store module (see
// EOSbackend1/src/modules/stationery/*) and the mobile app's own
// src/services/api/stationery.api.ts — same shopping-cart e-commerce
// module, same endpoints. Web checkout is Razorpay-only (no wallet UI
// exists on this portal yet, unlike the mobile app's wallet-or-Razorpay
// choice) — everything else (browse, cart, pickup token, order history)
// matches the mobile app feature-for-feature.

export type StationeryCategory = "study" | "food" | "care" | "hostel" | "college";

export const STATIONERY_CATEGORIES: { id: StationeryCategory; name: string; icon: string }[] = [
  { id: "study", name: "Study Essentials", icon: "menu_book" },
  { id: "food", name: "Food & Snacks", icon: "fastfood" },
  { id: "care", name: "Personal Care", icon: "water_drop" },
  { id: "hostel", name: "Hostel Essentials", icon: "bed" },
  { id: "college", name: "College Essentials", icon: "school" },
];

export function categoryName(id: StationeryCategory): string {
  return STATIONERY_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export interface StationeryProduct {
  id: number;
  category: StationeryCategory;
  name: string;
  description: string | null;
  specs: string[];
  price: number;
  original_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
}

/** GET /stationery/products — public catalogue (no role restriction, matches the mobile app). */
export function useStationeryProducts(params?: { category?: StationeryCategory }) {
  return useQuery({
    queryKey: ["stationery-store", "products", params?.category ?? "all"],
    queryFn: () => apiClient.get<StationeryProduct[]>("/stationery/products", params),
  });
}

export type StationeryCheckoutItem = { product_id: number; quantity: number };
export type StationeryOrderStatus = "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "collected" | "cancelled";
export type StationeryPaymentMethod = "wallet" | "razorpay";
export type StationeryPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface StationeryOrderItem {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface StationeryOrder {
  id: number;
  status: StationeryOrderStatus;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  payment_method: StationeryPaymentMethod;
  payment_status: StationeryPaymentStatus;
  pickup_token: string | null;
  cancel_reason: string | null;
  created_at: string;
  stationery_order_items: StationeryOrderItem[];
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  theme: { color: string };
  prefill: { name?: string; email?: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

/**
 * POST /me/stationery/checkout/razorpay-order + Razorpay Checkout + POST
 * .../razorpay-verify on success — same two-step stage-then-verify shape
 * every Razorpay flow in this backend uses (see MeFeesService).
 */
export function usePayStationeryCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      items,
      studentName,
      studentEmail,
    }: {
      items: StationeryCheckoutItem[];
      studentName?: string;
      studentEmail?: string;
    }) => {
      const order = await apiClient.post<{ order_id: string; amount: number; currency: string; key_id: string }>(
        "/me/stationery/checkout/razorpay-order",
        { items },
      );

      await loadScriptOnce("https://checkout.razorpay.com/v1/checkout.js");

      return new Promise<StationeryOrder>((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.key_id,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          order_id: order.order_id,
          name: "Stationery Store",
          description: `${items.length} item${items.length === 1 ? "" : "s"}`,
          theme: { color: "#1d4ed8" },
          prefill: { name: studentName, email: studentEmail },
          handler: (response) => {
            apiClient
              .post<StationeryOrder>("/me/stationery/checkout/razorpay-verify", response)
              .then(resolve)
              .catch(reject);
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        checkout.open();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stationery-store", "orders"] });
    },
  });
}

/** GET /me/stationery/orders */
export function useMyStationeryOrders() {
  return useQuery({
    queryKey: ["stationery-store", "orders"],
    queryFn: () => apiClient.get<StationeryOrder[]>("/me/stationery/orders"),
  });
}

/** GET /me/stationery/orders/:id */
export function useMyStationeryOrder(id: number | null) {
  return useQuery({
    queryKey: ["stationery-store", "orders", id],
    queryFn: () => apiClient.get<StationeryOrder>(`/me/stationery/orders/${id}`),
    enabled: id !== null,
  });
}
