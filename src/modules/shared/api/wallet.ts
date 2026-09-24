import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { loadScriptOnce } from "@/lib/utils/loadScript";

/** Matches WalletController's own paginate() helper — nested under `meta`, distinct from the flat `PaginatedResult` shape other endpoints use. */
export interface WalletTransactionsPage {
  data: WalletTransaction[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Wallet {
  balance: number;
  qr_token: string;
  pin_set: boolean;
}

export interface WalletTransaction {
  id: number;
  txn_type: "credit" | "debit";
  source: "cash" | "razorpay" | "adjustment" | "purchase" | "transfer";
  amount: number;
  status: "pending" | "success" | "failed";
  remarks: string | null;
  created_at: string;
  outlet: { name: string; outlet_type: string } | null;
  counterparty_email: string | null;
}

interface CreateTopupOrderResult {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
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

const walletKeys = {
  wallet: ["wallet"] as const,
  transactions: (page: number) => ["wallet", "transactions", page] as const,
};

/**
 * GET /me/wallet — balance, QR token, whether a PIN is set. Auto-provisioned
 * server-side on first call. `enabled` defaults to true but should be set
 * false for a role with no wallet (Parent) so the topbar never fires this
 * for a role that would just get a 403.
 */
export function useWallet(enabled = true) {
  return useQuery({
    queryKey: walletKeys.wallet,
    queryFn: () => apiClient.get<Wallet>("/me/wallet"),
    enabled,
  });
}

/** GET /me/wallet/transactions — the caller's own history, paginated. */
export function useWalletTransactions(page = 1) {
  return useQuery({
    queryKey: walletKeys.transactions(page),
    queryFn: () => apiClient.get<WalletTransactionsPage>("/me/wallet/transactions", { page, limit: 20 }),
  });
}

/**
 * POST /me/wallet/topup/order + Razorpay Checkout + POST /me/wallet/topup/verify
 * on success — same three-step flow as the student fee-payment cart
 * (usePayFeeCart), which is the proven, already-live Razorpay Web Checkout
 * integration in this app; mirrored here rather than re-derived.
 */
export function useTopUpWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, name, email }: { amount: number; name?: string; email?: string }) => {
      const order = await apiClient.post<CreateTopupOrderResult>("/me/wallet/topup/order", { amount });

      await loadScriptOnce("https://checkout.razorpay.com/v1/checkout.js");

      return new Promise<{ balance: number }>((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.key_id,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          order_id: order.order_id,
          name: "Sri Eshwar College of Engineering",
          description: "Wallet top-up",
          theme: { color: "#1d4ed8" },
          prefill: { name, email },
          handler: (response) => {
            apiClient
              .post<{ balance: number }>("/me/wallet/topup/verify", response)
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
      queryClient.invalidateQueries({ queryKey: walletKeys.wallet });
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
    },
  });
}
