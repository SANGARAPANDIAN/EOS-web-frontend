"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, EmptyState, Icon } from "@/components/ui";
import { formatDisplayDate } from "@/lib/utils/date";
import { useMyStationeryOrders, type StationeryOrder, type StationeryOrderStatus } from "@/modules/student/api/stationeryStore";
import { ApiError } from "@/types/api";

const STATUS_META: Record<StationeryOrderStatus, { label: string; text: string; bg: string }> = {
  pending: { label: "Pending", text: "text-amber-700", bg: "bg-amber-50" },
  confirmed: { label: "Confirmed", text: "text-primary", bg: "bg-accent-50" },
  preparing: { label: "Preparing", text: "text-primary", bg: "bg-accent-50" },
  ready_for_pickup: { label: "Ready for Pickup", text: "text-violet-700", bg: "bg-violet-50" },
  collected: { label: "Collected", text: "text-emerald-700", bg: "bg-emerald-50" },
  cancelled: { label: "Cancelled", text: "text-danger-fg", bg: "bg-danger-bg" },
};

function OrderRow({ order }: { order: StationeryOrder }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[order.status];
  const itemCount = order.stationery_order_items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Card className="flex flex-col gap-2">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-start justify-between gap-3 text-left">
        <div>
          <p className="text-[13.5px] font-bold text-ink">Order #{order.id}</p>
          <p className="mt-0.5 text-[11.5px] text-subtle">
            {formatDisplayDate(order.created_at)} · {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-sm font-bold text-ink">₹{order.total_amount}</span>
          <span className={`rounded-[8px] px-2 py-0.5 text-[10.5px] font-bold ${meta.bg} ${meta.text}`}>{meta.label}</span>
        </div>
      </button>
      {expanded && (
        <div className="flex flex-col gap-1.5 border-t border-divider pt-2">
          {order.stationery_order_items.map((item) => (
            <div key={item.id} className="flex justify-between text-[12.5px] text-body">
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <span>₹{item.subtotal}</span>
            </div>
          ))}
          {order.pickup_token && <p className="mt-1 text-[11.5px] text-subtle">Pickup token: {order.pickup_token}</p>}
        </div>
      )}
    </Card>
  );
}

export default function StationeryOrdersPage() {
  const orders = useMyStationeryOrders();
  const rows = orders.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center gap-3">
        <Link href="/student/stationery-store" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default hover:bg-nav-hover">
          <Icon name="arrow_back" size={18} />
        </Link>
        <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">My Orders</h1>
      </div>

      {orders.isLoading ? (
        <Card>
          <EmptyState loading />
        </Card>
      ) : orders.error ? (
        <Card>
          <EmptyState message={orders.error instanceof ApiError ? orders.error.message : "Couldn't load your orders."} />
        </Card>
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Icon name="receipt_long" size={32} className="text-subtle" />
          <p className="text-sm font-semibold text-body">No orders yet</p>
          <Link href="/student/stationery-store" className="rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark">
            Browse Stationery
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
