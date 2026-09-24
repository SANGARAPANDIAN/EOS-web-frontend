"use client";

import { useState } from "react";
import { Card, Badge, EmptyState, Icon } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildCanteenOrders, type ChildCanteenOrder } from "@/modules/parent/api/canteenOrders";
import type { OrderStatus } from "@/modules/shared/api/canteenOrdering";

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Paid",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  collected: "Received",
  cancelled: "Cancelled",
};

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function OrderRow({ order }: { order: ChildCanteenOrder }) {
  const [expanded, setExpanded] = useState(false);
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const status = order.status as OrderStatus;

  return (
    <Card className="flex flex-col gap-0 p-0">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-4">
          {order.pickup_token && (
            <div>
              <div className="text-[11px] font-bold text-muted">Token</div>
              <div className="text-[18px] font-extrabold tracking-[.04em] text-primary">{order.pickup_token}</div>
            </div>
          )}
          <div className="text-[12.5px] text-muted">
            {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
            {new Date(order.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={status === "cancelled" ? "accentDark" : "accent"}>{STATUS_LABEL[status] ?? order.status}</Badge>
          <span className="text-[15px] font-extrabold text-ink">{money(order.total_amount)}</span>
          <Icon name={expanded ? "expand_less" : "expand_more"} size={20} className="text-muted" />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border-default p-4">
          <div className="flex flex-col divide-y divide-border-default">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="text-ink">
                  {item.name}
                  {item.is_parcel && <span className="text-subtle"> (parcel)</span>}
                </span>
                <span className="text-muted">x{item.quantity}</span>
                <span className="w-20 text-right font-semibold text-ink">{money(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border-default pt-3">
            <span className="text-[13px] font-bold text-ink">Total</span>
            <span className="text-[16px] font-extrabold text-ink">{money(order.total_amount)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ParentFoodCourtPage() {
  const { selectedChildId } = useSelectedChild();
  const orders = useChildCanteenOrders(selectedChildId);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Food Court</h1>
          <p className="mt-1 text-[13.5px] text-muted">Today&apos;s orders, plus anything still active from before midnight</p>
        </div>
        <ChildSwitcher />
      </div>

      {orders.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !orders.data || orders.data.length === 0 ? (
        <Card>
          <EmptyState message="No recent orders." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.data.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
