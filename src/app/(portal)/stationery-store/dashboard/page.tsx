"use client";

import { PageHeader, KpiCard, SectionCard, EmptyState, VerticalBarChart, DataTable, Badge, type DataTableColumn } from "@/modules/admin/components/ui";
import { SkeletonStatTiles, SkeletonBlock } from "@/components/ui";
import { useStationeryDashboard } from "@/modules/stationery-store/api/dashboard";
import { CATEGORY_NAME } from "@/modules/stationery-store/api/products";
import type { StationeryOrder } from "@/modules/stationery-store/api/orders";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

// Simplified to the same 3 states the Orders page shows — every non-final
// backend status (pending/confirmed/preparing/ready_for_pickup) reads as
// "Pending" here. Blue/white/neutral only, no green/orange/red.
function statusLabel(status: StationeryOrder["status"]): string {
  if (status === "collected") return "Collected";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

// All 4 columns shrink to their own content width (see DataTable's `shrink`
// column option) except Student, which absorbs whatever space is left -
// keeps every column tight against its neighbour instead of the browser's
// default table layout spreading leftover width unevenly across them
// (the "columns not spaced properly" bug this fixes).
const ORDER_COLUMNS: DataTableColumn<StationeryOrder>[] = [
  {
    key: "id",
    header: "Order ID",
    shrink: true,
    render: (row) => <span className="font-semibold text-admin-primary">ORD-{1000 + row.id}</span>,
  },
  {
    key: "customer",
    header: "Student",
    render: (row) => <span className="block max-w-[220px] truncate">{row.customer_name ?? row.users.email}</span>,
  },
  { key: "total", header: "Amount", align: "right", shrink: true, render: (row) => `₹${row.total_amount}` },
  { key: "status", header: "Status", shrink: true, render: (row) => <Badge tone="neutral">{statusLabel(row.status)}</Badge> },
];

export default function StationeryStoreDashboardPage() {
  const { data, isLoading, error } = useStationeryDashboard();

  const errorMessage = error instanceof ApiError ? error.message : error ? "Failed to load the dashboard." : null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Dashboard" description="Stationery Store activity for today" />
        <SkeletonStatTiles count={4} className="sm:grid-cols-2 lg:grid-cols-4" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Dashboard" description={`Stationery Store activity for ${formatDisplayDate(new Date().toISOString())}`} />

      {errorMessage && (
        <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total products" icon="inventory_2" value={data?.summary.total_products ?? "—"} sub={data ? `${data.summary.active_products} active` : undefined} href="/stationery-store/products" />
        <KpiCard label="Today's sales" icon="payments" value={data ? `₹${data.summary.today_sales}` : "—"} sub="gross revenue" />
        <KpiCard label="Today's orders" icon="receipt_long" value={data?.summary.today_orders ?? "—"} sub="placed today" href="/stationery-store/orders" />
        <KpiCard
          label="Pending orders"
          icon="hourglass_top"
          value={data?.summary.pending_orders ?? "—"}
          sub="awaiting confirmation"
          tinted={!!data && data.summary.pending_orders > 0}
          href="/stationery-store/orders"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Recent orders" subtitle="Latest activity across the store">
          {data && data.recent_orders.length > 0 ? (
            <div className="-mx-5 -my-5">
              <DataTable columns={ORDER_COLUMNS} rows={data.recent_orders} rowKey={(row) => row.id} className="border-0 shadow-none" compact />
            </div>
          ) : (
            <EmptyState icon="receipt_long" title="No orders yet" description="Orders placed in the mobile app will show up here." />
          )}
        </SectionCard>

        <SectionCard title="Low stock" subtitle="Below threshold — restock soon">
          {data && data.low_stock_products.length > 0 ? (
            <div className="flex flex-col gap-3">
              {data.low_stock_products.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-admin-ink">{p.name}</p>
                    <p className="text-[11px] text-admin-subtle">{CATEGORY_NAME[p.category as keyof typeof CATEGORY_NAME] ?? p.category}</p>
                  </div>
                  <div className="shrink-0 text-[12.5px] font-extrabold text-admin-primary">{p.stock_quantity} left</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-admin-subtle">Nothing below threshold.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Sales overview" subtitle="Last 7 days">
        {data && (
          <VerticalBarChart
            data={data.sales_last_7_days.map((d) => ({
              label: new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }),
              value: d.amount,
            }))}
            format={(v) => `₹${v}`}
          />
        )}
      </SectionCard>
    </div>
  );
}
