import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { loadScriptOnce } from "@/lib/utils/loadScript";
import { getToken } from "@/lib/auth/session";
import { ApiError } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

/**
 * The receipt endpoint returns a raw PDF (not the JSON envelope apiClient
 * expects), and a plain <a href> download wouldn't carry the Bearer token —
 * so this fetches the PDF as a blob with the auth header attached, then
 * triggers a normal browser download from an in-memory object URL.
 */
export async function downloadFeeReceipt(paymentId: number, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/me/fees/payments/${paymentId}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body ?? { success: false, statusCode: res.status, errorCode: "UNKNOWN_ERROR", message: "Could not download the receipt.", timestamp: new Date().toISOString(), path: "" },
    );
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface FeePaymentOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface FeePaymentReceipt {
  id: number;
  demand_id: number;
  amount_paid: number;
  receipt_no: string;
  payment_date: string;
}

interface VerifyFeePaymentResult {
  payments: FeePaymentReceipt[];
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

/** POST /me/fees/pay/order (one or more demands, a "cart") + Razorpay Checkout + POST /me/fees/pay/verify on success. */
export function usePayFeeCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      items,
      studentName,
      studentEmail,
    }: {
      items: { demandId: number; amount: number }[];
      studentName?: string;
      studentEmail?: string;
    }) => {
      const order = await apiClient.post<FeePaymentOrder>("/me/fees/pay/order", {
        items: items.map((i) => ({ demand_id: i.demandId, amount: i.amount })),
      });

      await loadScriptOnce("https://checkout.razorpay.com/v1/checkout.js");

      return new Promise<VerifyFeePaymentResult>((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.key_id,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          order_id: order.order_id,
          name: "Sri Eshwar College of Engineering",
          description: items.length === 1 ? "Fee payment" : `Fee payment · ${items.length} heads`,
          theme: { color: "#1d4ed8" },
          prefill: { name: studentName, email: studentEmail },
          handler: (response) => {
            apiClient
              .post<VerifyFeePaymentResult>("/me/fees/pay/verify", response)
              .then(resolve)
              .catch(reject);
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
        });
        checkout.open();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "fees"] });
    },
  });
}
