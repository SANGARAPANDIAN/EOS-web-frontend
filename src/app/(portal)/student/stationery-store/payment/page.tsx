"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Icon } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { useStationeryProducts, usePayStationeryCart } from "@/modules/student/api/stationeryStore";
import { useCartEntries, buildCartLines } from "@/modules/student/lib/useStationeryCart";
import { ApiError } from "@/types/api";

// Razorpay-only on web (no wallet UI on this portal yet, unlike the mobile
// app's wallet-or-Razorpay choice) - same two-step stage-then-verify flow
// as the existing Fee payment page (see feePayment.ts), reused here.
export default function StationeryPaymentPage() {
  const router = useRouter();
  const { session } = useAuth();
  const products = useStationeryProducts();
  const cart = useCartEntries();
  const pay = usePayStationeryCart();
  const [error, setError] = useState<string | null>(null);

  const lines = buildCartLines(cart.entries, products.data ?? []);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

  function handlePay() {
    setError(null);
    pay
      .mutateAsync({
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        studentEmail: session?.user.email,
      })
      .then((order) => {
        cart.clear();
        router.replace(`/student/stationery-store/success?orderId=${order.id}`);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === "Payment cancelled") return;
        setError(err instanceof ApiError ? err.message : "Payment didn't go through.");
      });
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 animate-pop-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default hover:bg-nav-hover">
          <Icon name="arrow_back" size={18} />
        </button>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">Payment</h1>
          <p className="text-[12.5px] text-muted">Secured by campus payment gateway</p>
        </div>
      </div>

      <Card className="flex flex-col gap-1">
        <span className="text-xs text-subtle">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
        <span className="text-[22px] font-bold text-ink">₹{total}</span>
      </Card>

      <Card className="flex items-center gap-3 border-primary/40 bg-accent-50">
        <Icon name="account_balance_wallet" size={20} className="text-primary" />
        <div className="flex-1">
          <p className="text-[13.5px] font-semibold text-ink">UPI / Card / Netbanking</p>
          <p className="text-[11.5px] text-muted">GPay, PhonePe, Paytm, cards, netbanking</p>
        </div>
      </Card>

      <div className="flex gap-2 text-[11.5px] text-subtle">
        <Icon name="verified_user" size={14} className="mt-0.5 shrink-0" />
        <p>Charges post to your student ledger in the ERP. Unclaimed orders are refunded automatically.</p>
      </div>

      {error && <p className="text-[13px] text-danger-fg">{error}</p>}

      <button
        type="button"
        onClick={handlePay}
        disabled={pay.isPending || lines.length === 0}
        className="w-full rounded-xl bg-primary py-3.5 text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:bg-disabled enabled:hover:bg-primary-dark"
      >
        {pay.isPending ? "Processing…" : `Pay ₹${total} securely`}
      </button>
    </div>
  );
}
