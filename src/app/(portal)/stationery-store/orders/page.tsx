"use client";

import { useMemo, useState } from "react";
import { ApiError } from "@/types/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import { PageHeader, Input, DataTable, Badge, Button, useToast, type DataTableColumn } from "@/modules/admin/components/ui";
import { PillTabs } from "@/components/ui";
import {
  useStationeryOrders,
  useUpdateStationeryOrderStatus,
  type StationeryOrder,
  type StationeryOrderStatus,
} from "@/modules/stationery-store/api/orders";
import { OrderDetailModal } from "@/modules/stationery-store/components/OrderDetailModal";
import { formatDayAndTime } from "@/lib/utils/date";

// Simplified down to 3 states an admin actually cares about — the granular
// confirmed/preparing/ready_for_pickup steps the backend tracks internally
// all read as "Pending" here; "Mark Complete" jumps straight to collected.
const ACTIVE_STATUSES: StationeryOrderStatus[] = ["pending", "confirmed", "preparing", "ready_for_pickup"];
const HISTORY_STATUSES: StationeryOrderStatus[] = ["collected", "cancelled"];

export default function StationeryOrdersPage() {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const { show } = useToast();

  const { data: orders, isLoading, error } = useStationeryOrders();
  const updateStatus = useUpdateStationeryOrderStatus();

  const tabStatuses = tab === "history" ? HISTORY_STATUSES : ACTIVE_STATUSES;
  const pendingCount = orders?.filter((o) => ACTIVE_STATUSES.includes(o.status)).length ?? 0;
  const historyCount = orders?.filter((o) => HISTORY_STATUSES.includes(o.status)).length ?? 0;

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = debouncedQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (!tabStatuses.includes(o.status)) return false;
      if (!q) return true;
      return (
        `ord-${1000 + o.id}`.includes(q) ||
        (o.customer_name ?? "").toLowerCase().includes(q) ||
        o.users.email.toLowerCase().includes(q)
      );
    });
  }, [orders, tabStatuses, debouncedQuery]);

  function handleMarkComplete(order: StationeryOrder) {
    updateStatus.mutate(
      { id: order.id, status: "collected" },
      {
        onSuccess: () => show(`ORD-${1000 + order.id} marked complete.`, "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  const baseColumns: DataTableColumn<StationeryOrder>[] = [
    { key: "id", header: "Order", render: (row) => <span className="font-semibold text-admin-primary">ORD-{1000 + row.id}</span> },
    { key: "customer", header: "Student", render: (row) => row.customer_name ?? row.users.email },
    {
      key: "items",
      header: "Items",
      render: (row) => {
        const count = row.stationery_order_items.reduce((sum, i) => sum + i.quantity, 0);
        return `${count} ${count === 1 ? "item" : "items"}`;
      },
    },
    { key: "total", header: "Total", align: "right", render: (row) => `₹${row.total_amount}` },
    { key: "payment", header: "Payment", render: (row) => `${row.payment_method} · ${row.payment_status === "paid" ? "Paid" : row.payment_status}` },
    { key: "date", header: "Date", render: (row) => formatDayAndTime(row.created_at) },
  ];

  const columns: DataTableColumn<StationeryOrder>[] =
    tab === "pending"
      ? [
          ...baseColumns,
          {
            key: "actions",
            header: "",
            align: "right",
            render: (row) =>
              row.payment_status === "paid" ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="primary" onClick={() => handleMarkComplete(row)} disabled={updateStatus.isPending}>
                    Mark Complete
                  </Button>
                </div>
              ) : null,
          },
        ]
      : [...baseColumns, { key: "status", header: "Status", render: (row) => <Badge tone="neutral">{row.status === "collected" ? "Collected" : "Cancelled"}</Badge> }];

  return (
    <div>
      <PageHeader title="Orders" description={orders ? `${orders.length} total orders` : "Every order placed in the Stationery Store"} />

      <div className="mt-5 mb-4">
        <PillTabs
          options={[
            { key: "pending", label: `Pending (${pendingCount})` },
            { key: "history", label: `History (${historyCount})` },
          ]}
          value={tab}
          onChange={(key) => setTab(key as "pending" | "history")}
        />
      </div>

      <div className="mb-4 max-w-md">
        <Input leadingIcon="search" placeholder="Search by order ID, student name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load orders." : null}
        emptyTitle="No orders match this filter"
        onRowClick={(row) => setOpenOrderId(row.id)}
      />

      <OrderDetailModal orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </div>
  );
}
