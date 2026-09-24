"use client";

import { Modal, Button, Badge, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { formatDisplayDate } from "@/lib/utils/date";
import { useStationeryOrder, useUpdateStationeryOrderStatus } from "@/modules/stationery-store/api/orders";

interface OrderDetailDrawerProps {
  orderId: number | null;
  onClose: () => void;
}

// Simplified to the 3 states the Orders list also shows — Pending (covers
// every non-final backend status: pending/confirmed/preparing/ready_for_pickup),
// Collected, Cancelled. "Mark Complete" jumps straight to collected.
export function OrderDetailModal({ orderId, onClose }: OrderDetailDrawerProps) {
  const { data: order } = useStationeryOrder(orderId);
  const updateStatus = useUpdateStationeryOrderStatus();
  const { show } = useToast();

  if (!order) {
    return (
      <Modal open={orderId !== null} onClose={onClose} title="Order">
        <p className="text-sm text-admin-muted">Loading…</p>
      </Modal>
    );
  }

  const isFinal = order.status === "collected" || order.status === "cancelled";
  const canComplete = !isFinal && order.payment_status === "paid";
  const canCancel = !isFinal;
  const statusLabel = order.status === "collected" ? "Collected" : order.status === "cancelled" ? "Cancelled" : "Pending";

  function handleComplete() {
    updateStatus.mutate(
      { id: order!.id, status: "collected" },
      {
        onSuccess: () => show("Order marked complete.", "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function handleCancel() {
    const reason = window.prompt("Reason for cancelling this order (optional):") ?? undefined;
    updateStatus.mutate(
      { id: order!.id, status: "cancelled", cancel_reason: reason },
      {
        onSuccess: () => show("Order cancelled — stock and payment reversed.", "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  return (
    <Modal
      open={orderId !== null}
      onClose={onClose}
      title={`ORD-${1000 + order.id}`}
      subtitle={formatDisplayDate(order.created_at)}
      widthClassName="max-w-lg"
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-admin-subtle uppercase">Customer</p>
          <p className="text-[13.5px] font-bold text-admin-ink">{order.customer_name ?? order.users.email}</p>
          <p className="mt-0.5 text-[12.5px] text-admin-body">{order.users.email}</p>
          {order.register_no && <p className="text-[12.5px] text-admin-body">{order.register_no}</p>}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-admin-subtle uppercase">Order items</p>
          <div className="flex flex-col gap-2">
            {order.stationery_order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-[12.5px] text-admin-body">
                <span>
                  {item.product_name} × {item.quantity}
                </span>
                <span className="font-semibold text-admin-ink">₹{item.subtotal}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5 border-t border-admin-border pt-2.5">
            <div className="flex justify-between text-[12.5px] text-admin-subtle">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-admin-ink">
              <span>Total</span>
              <span>₹{order.total_amount}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-admin-subtle uppercase">Payment</p>
          <div className="flex justify-between text-[12.5px] text-admin-body">
            <span>Method</span>
            <span className="font-semibold text-admin-ink capitalize">{order.payment_method}</span>
          </div>
          <div className="mt-1 flex justify-between text-[12.5px] text-admin-body">
            <span>Status</span>
            <Badge tone={order.payment_status === "paid" ? "primary" : "neutral"}>{order.payment_status}</Badge>
          </div>
        </div>

        {order.pickup_token && (
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-admin-subtle uppercase">Pickup</p>
            <div className="flex justify-between text-[12.5px] text-admin-body">
              <span>Token</span>
              <span className="font-extrabold tracking-wide text-admin-ink">{order.pickup_token}</span>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2.5 text-[11px] font-bold tracking-wide text-admin-subtle uppercase">Order status</p>
          <Badge tone="neutral">
            {statusLabel}
            {order.status === "cancelled" && order.cancel_reason ? ` — ${order.cancel_reason}` : ""}
          </Badge>
        </div>

        {canComplete && (
          <Button variant="primary" onClick={handleComplete} disabled={updateStatus.isPending}>
            Mark Complete
          </Button>
        )}
        {canCancel && (
          <Button variant="secondary" onClick={handleCancel} disabled={updateStatus.isPending}>
            Cancel order
          </Button>
        )}
      </div>
    </Modal>
  );
}
