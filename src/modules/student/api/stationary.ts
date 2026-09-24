import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { loadScriptOnce } from "@/lib/utils/loadScript";

// Mirrors EOS-backend's stationary module (see
// EOSbackend1/src/modules/stationary/stationary.*.ts) and the mobile app's
// own src/services/api/stationary.api.ts — the print/xerox shop's
// self-service request form. `amount` is always server-computed from
// total_pages * copies * ₹2/page, never trusted from the client. The
// backend takes only these print-job details, never the actual file — a
// student brings their own file/USB to the counter, same as the mobile app.

export type StationaryOrientation = "portrait" | "landscape";
export type StationaryColorMode = "color" | "bw";
export type StationaryPaperSize = "A4" | "A3" | "A5" | "Letter" | "Legal";
export type StationarySides = "Single-sided" | "Double-sided";
export type StationaryBinding = "No binding" | "Spiral binding" | "Calico binding";

export const PRICE_PER_PAGE = 2;

export function estimateStationaryCost(totalPages: number, copies: number): number {
  return totalPages * copies * PRICE_PER_PAGE;
}

export interface CreateStationaryOrderInput {
  file_summary?: string;
  total_pages: number;
  copies: number;
  orientation: StationaryOrientation;
  color_mode: StationaryColorMode;
  paper_size: StationaryPaperSize;
  sides: StationarySides;
  binding: StationaryBinding;
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

export interface StationaryPaymentResult {
  id: number;
  amount: number;
  status: "paid";
}

/** POST /me/stationary-requests/order + Razorpay Checkout + POST .../order/verify on success. */
export function usePayStationaryRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      studentName,
      studentEmail,
    }: {
      input: CreateStationaryOrderInput;
      studentName?: string;
      studentEmail?: string;
    }) => {
      const order = await apiClient.post<{ order_id: string; amount: number; currency: string; key_id: string }>(
        "/me/stationary-requests/order",
        input,
      );

      await loadScriptOnce("https://checkout.razorpay.com/v1/checkout.js");

      return new Promise<StationaryPaymentResult>((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.key_id,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          order_id: order.order_id,
          name: "Copy Center",
          description: `${input.total_pages} pages × ${input.copies} ${input.copies === 1 ? "copy" : "copies"}`,
          theme: { color: "#1d4ed8" },
          prefill: { name: studentName, email: studentEmail },
          handler: (response) => {
            apiClient
              .post<StationaryPaymentResult>("/me/stationary-requests/order/verify", response)
              .then(resolve)
              .catch(reject);
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        checkout.open();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stationary", "my-requests"] });
    },
  });
}

// Every status a request can be in across its whole lifecycle - the first
// two are set only by this student-payment flow; the rest are set only by
// a Stationary-vendor account via the separate vendor portal once paid.
export type StationaryRequestStatus = "pending_payment" | "paid" | "processing" | "ready_for_pickup" | "completed" | "rejected";

export interface MyStationaryRequest {
  id: number;
  file_summary: string | null;
  total_pages: number;
  copies: number;
  orientation: StationaryOrientation;
  color_mode: StationaryColorMode;
  paper_size: StationaryPaperSize | null;
  sides: StationarySides | null;
  binding: StationaryBinding | null;
  amount: number;
  status: StationaryRequestStatus;
  rejection_reason: string | null;
  created_at: string;
}

/** GET /me/stationary-requests */
export function useMyStationaryRequests() {
  return useQuery({
    queryKey: ["stationary", "my-requests"],
    queryFn: () => apiClient.get<MyStationaryRequest[]>("/me/stationary-requests"),
  });
}
