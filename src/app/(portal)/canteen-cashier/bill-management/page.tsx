"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, SearchBar, Input, Badge, DataTable, ConfirmDialog, EmptyState } from "@/components/ui";
import { SkeletonStatTiles, SkeletonTable } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/types/api";
import { useBills, useVoidBill, type BillRow } from "@/modules/canteen-cashier/api/bills";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function isSameCalendarDay(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
}

export default function CanteenBillManagementPage() {
  const { session } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useBills({ from: from || undefined, to: to || undefined, search: search || undefined });
  const voidBill = useVoidBill();
  const [voidTarget, setVoidTarget] = useState<BillRow | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);

  async function handleVoid() {
    if (!voidTarget) return;
    setVoidError(null);
    try {
      await voidBill.mutateAsync(voidTarget.id);
      setVoidTarget(null);
    } catch (err) {
      setVoidError(err instanceof ApiError ? err.message : "Could not void this bill.");
    }
  }

  const columns = useMemo(
    () => [
      { key: "id", header: "Bill #", width: "0.7fr", render: (row: BillRow) => `#${row.id}` },
      { key: "date_time", header: "Time", width: "1fr", render: (row: BillRow) => formatDateTime(row.date_time), sortValue: (row: BillRow) => row.date_time },
      { key: "cashier", header: "Cashier", width: "1.3fr", render: (row: BillRow) => row.cashier },
      { key: "items", header: "Items", width: "2fr", render: (row: BillRow) => row.items.join(", ") },
      { key: "payment", header: "Payment", width: "0.8fr", render: (row: BillRow) => row.payment_mode.toUpperCase() },
      { key: "amount", header: "Amount", width: "0.9fr", render: (row: BillRow) => money(row.amount), sortValue: (row: BillRow) => row.amount },
      {
        key: "status",
        header: "Status",
        width: "1.3fr",
        render: (row: BillRow) => (
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={row.is_active ? "accent" : "neutral"}>{row.is_active ? "Active" : "Voided"}</Badge>
            {row.is_emergency && <Badge tone="danger">Emergency</Badge>}
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "90px",
        align: "right" as const,
        render: (row: BillRow) => {
          const canVoid = row.is_active && row.cashier_user_id === session?.user.id && isSameCalendarDay(row.date_time);
          if (!canVoid) return null;
          return (
            <button type="button" className="text-[12.5px] font-bold text-danger-fg hover:opacity-80" onClick={() => setVoidTarget(row)}>
              Void
            </button>
          );
        },
      },
    ],
    [session?.user],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Bill Management</h1>
        <p className="mt-1.5 text-[14px] font-medium text-muted">Review bills and void your own, same-day mistakes.</p>
      </div>

      {data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Total Bills" value={data.summary.total_bills} icon="receipt_long" />
          <StatCard label="Active" value={data.summary.active_bills} icon="check_circle" />
          <StatCard label="Voided" value={data.summary.voided_bills} icon="cancel" />
          <StatCard label="Total Amount" value={money(data.summary.total_amount)} icon="payments" />
        </div>
      ) : (
        <SkeletonStatTiles count={4} />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="max-w-[280px] flex-1">
          <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Search</label>
          <SearchBar placeholder="Search by bill #, cashier or dish…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <EmptyState message={error instanceof Error ? error.message : "Could not load bills."} />
        ) : isLoading && !data ? (
          <SkeletonTable rows={6} />
        ) : (
          <DataTable columns={columns} data={data?.items ?? []} rowKey={(row) => row.id} loading={isLoading} emptyMessage="No bills match your filters." hoverableRows />
        )}
      </Card>

      <ConfirmDialog
        open={!!voidTarget}
        title={`Void bill #${voidTarget?.id}?`}
        description={`${voidTarget ? money(voidTarget.amount) : ""} will be reversed and stock restored. This can't be undone.`}
        confirmLabel="Void Bill"
        destructive
        onConfirm={handleVoid}
        onCancel={() => setVoidTarget(null)}
      />
      {voidError && <p className="text-[12.5px] font-semibold text-danger-fg">{voidError}</p>}
    </div>
  );
}
