"use client";

import { useState } from "react";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import {
  useOnlineOrders,
  useAdvanceOrderStatus,
  useGenerateBillForOrder,
  type OnlineOrder,
  type OnlineOrderStatus,
} from "@/modules/canteen-cashier/api/onlineOrders";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Just one real cashier-facing transition now: Paid → Ready (then "Mark Received" is a separate action, see below). */
const NEXT_ACTION: Partial<Record<OnlineOrderStatus, { label: string; next: "ready" }>> = {
  placed: { label: "Mark Ready", next: "ready" },
};

const STATUS_TONE: Record<OnlineOrderStatus, "accent" | "neutral" | "danger"> = {
  placed: "accent",
  accepted: "accent",
  preparing: "accent",
  ready: "accent",
  collected: "neutral",
  cancelled: "danger",
};

const STATUS_LABEL: Record<OnlineOrderStatus, string> = {
  placed: "Paid",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  collected: "Received",
  cancelled: "Cancelled",
};

function OrderCard({ order }: { order: OnlineOrder }) {
  const advance = useAdvanceOrderStatus();
  const generateBill = useGenerateBillForOrder();
  const [error, setError] = useState<string | null>(null);

  const action = NEXT_ACTION[order.status];

  async function handleAdvance() {
    if (!action) return;
    setError(null);
    try {
      await advance.mutateAsync({ id: order.id, status: action.next });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this order.");
    }
  }

  async function handleGenerateBill() {
    setError(null);
    try {
      await generateBill.mutateAsync(order.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate the bill.");
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[16px] font-extrabold tracking-[.03em] text-primary">{order.pickup_token}</div>
          <div className="mt-0.5 text-[12px] text-muted">{order.orderer}</div>
        </div>
        <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
      </div>
      <div className="flex flex-col divide-y divide-border-default border-t border-border-default pt-2">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between py-1.5 text-[13px]">
            <span className="text-ink">{item.name}</span>
            <span className="text-muted">x{item.quantity}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border-default pt-2.5">
        <span className="text-[13px] font-bold text-muted">Total</span>
        <span className="text-[15px] font-extrabold text-ink">{money(order.total_amount)}</span>
      </div>
      {error && <p className="text-[12px] font-semibold text-danger-fg">{error}</p>}
      {order.status === "ready" ? (
        <Button variant="primarySmall" loading={generateBill.isPending} onClick={handleGenerateBill}>
          Mark Received
        </Button>
      ) : action ? (
        <Button variant="primarySmall" loading={advance.isPending} onClick={handleAdvance}>
          {action.label}
        </Button>
      ) : null}
    </Card>
  );
}

export default function CanteenOnlineOrdersPage() {
  const { data: orders, isLoading, error } = useOnlineOrders();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Online Orders</h1>
        <p className="mt-1.5 text-[14px] font-medium text-muted">Orders placed through the app — accept, prepare, and bill them when collected.</p>
      </div>

      {error ? (
        <Card>
          <EmptyState message={error instanceof Error ? error.message : "Could not load online orders."} />
        </Card>
      ) : isLoading && !orders ? (
        <SkeletonCardGrid count={4} columns={3} />
      ) : !orders || orders.length === 0 ? (
        <Card>
          <EmptyState message="No online orders right now." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
