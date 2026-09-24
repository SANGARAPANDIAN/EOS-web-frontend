"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, EmptyState, Icon } from "@/components/ui";
import { useMyStationeryOrder, type StationeryPaymentMethod } from "@/modules/student/api/stationeryStore";
import { ApiError } from "@/types/api";

const METHOD_LABEL: Record<StationeryPaymentMethod, string> = { wallet: "Wallet", razorpay: "UPI" };

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = Number(searchParams.get("orderId"));
  const order = useMyStationeryOrder(Number.isFinite(orderId) ? orderId : null);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 animate-pop-in">
      <div className="flex flex-col items-center gap-2 rounded-card bg-gradient-to-br from-primary to-primary-dark py-8 text-center text-white">
        <div className="flex size-13 items-center justify-center rounded-full bg-white/20">
          <Icon name="check" size={26} />
        </div>
        <p className="text-lg font-bold">Paid · order confirmed</p>
        {order.data && (
          <p className="text-[12.5px] text-white/80">
            ₹{order.data.total_amount} · {METHOD_LABEL[order.data.payment_method]}
          </p>
        )}
      </div>

      {order.isLoading ? (
        <Card>
          <EmptyState loading />
        </Card>
      ) : order.error ? (
        <Card>
          <EmptyState message={order.error instanceof ApiError ? order.error.message : "Couldn't load your order."} />
        </Card>
      ) : order.data ? (
        <>
          <Card className="flex flex-col items-center gap-2 text-center">
            <span className="text-[11px] font-bold tracking-wide text-subtle uppercase">Pickup token</span>
            <span className="text-2xl font-bold tracking-wide text-ink">{order.data.pickup_token}</span>
            <p className="text-[11.5px] text-subtle">
              Show this token at the Stationery Counter to collect your order. Held for 30 minutes once ready.
            </p>
          </Card>

          <div>
            <h2 className="mb-2 text-xs font-bold tracking-wide text-subtle uppercase">Order</h2>
            <Card className="flex flex-col gap-2.5">
              {order.data.stationery_order_items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-body">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="font-bold text-ink">₹{item.subtotal}</span>
                </div>
              ))}
            </Card>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => router.replace("/student/stationery-store")}
        className="w-full rounded-xl bg-primary py-3.5 text-[15px] font-extrabold text-white hover:bg-primary-dark"
      >
        Done
      </button>
    </div>
  );
}

export default function StationeryOrderSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
