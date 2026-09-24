"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, Badge, Select, Input, DataTable, EmptyState } from "@/components/ui";
import { SkeletonStatTiles, SkeletonTable } from "@/components/ui/Skeleton";
import { useAdminOrders, type AdminOrderRow } from "@/modules/canteen-admin/api/orders";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CanteenAdminOrdersPage() {
  const [source, setSource] = useState<"" | "self" | "cashier">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, error } = useAdminOrders({
    source: source || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const columns = useMemo(
    () => [
      { key: "id", header: "Order #", width: "0.7fr", render: (row: AdminOrderRow) => `#${row.id}` },
      { key: "date_time", header: "Time", width: "1fr", render: (row: AdminOrderRow) => formatDateTime(row.created_at), sortValue: (row: AdminOrderRow) => row.created_at },
      { key: "source", header: "Source", width: "0.9fr", render: (row: AdminOrderRow) => <Badge tone={row.order_source === "self" ? "accent" : "neutral"}>{row.order_source === "self" ? "Online" : "Counter"}</Badge> },
      { key: "placed_by", header: "Placed By", width: "1.3fr", render: (row: AdminOrderRow) => row.placed_by },
      { key: "items", header: "Items", width: "1.8fr", render: (row: AdminOrderRow) => row.items.map((i) => `${i.name} x${i.quantity}${i.is_parcel ? " (parcel)" : ""}`).join(", ") },
      { key: "status", header: "Status", width: "1fr", render: (row: AdminOrderRow) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="neutral">{row.status}</Badge>
          {row.is_emergency && <Badge tone="danger">Emergency</Badge>}
        </div>
      ) },
      { key: "amount", header: "Amount", width: "0.9fr", render: (row: AdminOrderRow) => money(row.total_amount), sortValue: (row: AdminOrderRow) => row.total_amount },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Orders</h1>
        <p className="mt-1.5 text-[14px] font-medium text-muted">Every order, from the app and from the counter.</p>
      </div>

      {data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Total Orders" value={data.summary.total_orders} icon="receipt_long" />
          <StatCard label="Online Orders" value={data.summary.self_ordered} icon="restaurant_menu" />
          <StatCard label="Counter Orders" value={data.summary.cashier_orders} icon="point_of_sale" />
          <StatCard label="Total Amount" value={money(data.summary.total_amount)} icon="payments" />
        </div>
      ) : (
        <SkeletonStatTiles count={4} />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Source</label>
          <Select value={source} onChange={(e) => setSource(e.target.value as "" | "self" | "cashier")} className="w-auto min-w-[160px]">
            <option value="">All Sources</option>
            <option value="self">Online</option>
            <option value="cashier">Counter</option>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-bold text-muted">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-bold text-muted">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        </div>
      </div>

      <Card className="p-0">
        {error ? (
          <EmptyState message={error instanceof Error ? error.message : "Could not load orders."} />
        ) : isLoading && !data ? (
          <SkeletonTable rows={6} />
        ) : (
          <DataTable columns={columns} data={data?.items ?? []} rowKey={(row) => row.id} loading={isLoading} emptyMessage="No orders match your filters." hoverableRows />
        )}
      </Card>
    </div>
  );
}
