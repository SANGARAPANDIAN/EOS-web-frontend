"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Select, EmptyState, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useMyFees, type FeeDemand, type FeeDemandItem, type FeePayment } from "@/modules/student/api/fees";
import { usePayFeeCart, downloadFeeReceipt } from "@/modules/student/api/feePayment";
import { useMyIdentity } from "@/modules/student/api/profile";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "pay" | "history";

const STATUS_LABEL: Record<FeeDemand["status"], string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
};

// Fee structures that haven't been broken into fee_structure_items yet (older
// records) fall back to one pseudo-item standing in for the whole demand, so
// every demand is payable through the same per-line-item UI/cart regardless
// of whether it happens to be itemized in the DB. -1 is never a real item id.
const WHOLE_DEMAND_ITEM_ID = -1;

function payableItems(demand: FeeDemand): FeeDemandItem[] {
  if (demand.items.length > 0) return demand.items;
  return [
    {
      id: WHOLE_DEMAND_ITEM_ID,
      label: demand.fee_structure_name,
      total: demand.total,
      paid: demand.paid,
      due: demand.due,
      status: demand.status,
    },
  ];
}

function cartKey(demandId: number, itemId: number): string {
  return `${demandId}:${itemId}`;
}

function ItemRow({
  item,
  selected,
  amount,
  onToggle,
  onAmountChange,
}: {
  item: FeeDemandItem;
  selected: boolean;
  amount: number;
  onToggle: () => void;
  onAmountChange: (value: number) => void;
}) {
  const disabled = item.due <= 0;

  return (
    <div
      onClick={disabled ? undefined : onToggle}
      className={`rounded-[10px] border p-3 transition-colors ${
        disabled ? "cursor-default border-transparent bg-surface-muted" : "cursor-pointer border-transparent hover:bg-nav-hover"
      } ${selected ? "!border-border-accent bg-accent-50" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="size-4 shrink-0 accent-primary"
        />
        <div className="min-w-[140px] flex-1 text-[13.5px] font-bold text-ink">{item.label}</div>
        <div className="flex gap-2 font-mono text-[12px] text-muted">
          <span>₹{item.total.toLocaleString("en-IN")} total</span>
          {item.paid > 0 && <span className="text-primary">· ₹{item.paid.toLocaleString("en-IN")} paid</span>}
        </div>
        <Badge tone={item.status === "pending" ? "accentDark" : "accent"} className="ml-auto">
          {item.status === "paid" ? "Paid" : `₹${item.due.toLocaleString("en-IN")} due`}
        </Badge>
      </div>

      {selected && !disabled && (
        <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-dashed border-border-accent pt-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 rounded-[10px] border border-border-accent bg-surface px-3.5 py-2">
            <span className="text-[13px] font-bold text-muted">₹</span>
            <Input
              type="number"
              min={1}
              max={item.due}
              value={amount}
              onChange={(e) => onAmountChange(Math.min(item.due, Math.max(0, Number(e.target.value))))}
              className="w-24 border-0 p-0 text-[14px] font-bold focus:outline-none"
            />
          </div>
          <button onClick={() => onAmountChange(item.due)} className="text-[12.5px] font-bold text-primary">
            Pay full due
          </button>
        </div>
      )}
    </div>
  );
}

function DemandCard({
  demand,
  selectedKeys,
  amounts,
  onToggleItem,
  onAmountChange,
  onToggleAll,
}: {
  demand: FeeDemand;
  selectedKeys: Set<string>;
  amounts: Record<string, number>;
  onToggleItem: (item: FeeDemandItem) => void;
  onAmountChange: (item: FeeDemandItem, value: number) => void;
  onToggleAll: (items: FeeDemandItem[], select: boolean) => void;
}) {
  const items = payableItems(demand);
  const payableCount = items.filter((i) => i.due > 0).length;
  const selectedCount = items.filter((i) => selectedKeys.has(cartKey(demand.id, i.id))).length;
  const allSelected = payableCount > 0 && selectedCount === payableCount;

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-3.5 p-[18px] pb-3.5">
        {payableCount > 0 && (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onToggleAll(items, !allSelected)}
            title="Select all line items"
            className="size-[18px] shrink-0 accent-primary"
          />
        )}
        <div className="min-w-[160px] flex-1">
          <div className="text-[15px] font-bold text-ink">{demand.fee_structure_name}</div>
          <div className="mt-0.5 text-[12px] text-subtle">
            {demand.academic_year} · Semester {demand.semester}
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="rounded-[9px] bg-surface-muted px-3 py-2 text-center">
            <div className="text-[9.5px] font-extrabold tracking-[.09em] text-subtle">TOTAL</div>
            <div className="mt-0.5 font-mono text-[13.5px] font-extrabold text-ink">₹{demand.total.toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-[9px] bg-surface-muted px-3 py-2 text-center">
            <div className="text-[9.5px] font-extrabold tracking-[.09em] text-subtle">PAID</div>
            <div className="mt-0.5 font-mono text-[13.5px] font-extrabold text-ink">₹{demand.paid.toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-[9px] bg-surface-muted px-3 py-2 text-center">
            <div className="text-[9.5px] font-extrabold tracking-[.09em] text-subtle">DUE</div>
            <div className="mt-0.5 font-mono text-[13.5px] font-extrabold text-primary">₹{demand.due.toLocaleString("en-IN")}</div>
          </div>
        </div>
        <Badge tone={demand.status === "pending" ? "accentDark" : "accent"}>{STATUS_LABEL[demand.status]}</Badge>
      </div>

      <div className="flex flex-col gap-1 border-t border-divider p-3">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            selected={selectedKeys.has(cartKey(demand.id, item.id))}
            amount={amounts[cartKey(demand.id, item.id)] ?? item.due}
            onToggle={() => onToggleItem(item)}
            onAmountChange={(value) => onAmountChange(item, value)}
          />
        ))}
      </div>
    </Card>
  );
}

export default function FeesPage() {
  const [tab, setTab] = useState<Tab>("pay");
  const fees = useMyFees();
  const identity = useMyIdentity();
  const payCart = usePayFeeCart();

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [semesterOverride, setSemesterOverride] = useState<number | null>(null);

  // /me/fees returns every demand across every semester (not just the
  // current one), same as /me/exam-schedule — so the semester picker is a
  // real client-side filter, not decorative. Defaults to the most recent
  // semester with a fee demand, but a manual pick always wins.
  const semesters = useMemo(() => {
    const set = new Set<number>();
    for (const d of fees.data?.demands ?? []) set.add(d.semester);
    return Array.from(set).sort((a, b) => b - a);
  }, [fees.data]);
  const semester = semesterOverride ?? semesters[0] ?? null;

  const demandsById = useMemo(() => {
    const map = new Map<number, FeeDemand>();
    for (const d of fees.data?.demands ?? []) map.set(d.id, d);
    return map;
  }, [fees.data]);

  const demandsInSemester = useMemo(
    () => (fees.data?.demands ?? []).filter((d) => semester === null || d.semester === semester),
    [fees.data, semester],
  );
  const paymentsInSemester = useMemo(
    () => (fees.data?.payments ?? []).filter((p) => semester === null || demandsById.get(p.demand_id)?.semester === semester),
    [fees.data, semester, demandsById],
  );

  function toggleItem(demand: FeeDemand, item: FeeDemandItem) {
    const key = cartKey(demand.id, item.id);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        setAmounts((a) => ({ ...a, [key]: a[key] ?? item.due }));
      }
      return next;
    });
    setSuccess(null);
    setError(null);
  }

  function toggleAll(demand: FeeDemand, items: FeeDemandItem[], select: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (item.due <= 0) continue;
        const key = cartKey(demand.id, item.id);
        if (select) next.add(key);
        else next.delete(key);
      }
      return next;
    });
    if (select) {
      setAmounts((a) => {
        const next = { ...a };
        for (const item of items) {
          if (item.due <= 0) continue;
          const key = cartKey(demand.id, item.id);
          next[key] = next[key] ?? item.due;
        }
        return next;
      });
    }
    setSuccess(null);
    setError(null);
  }

  const cartItems = useMemo(() => {
    const rows: { demand: FeeDemand; item: FeeDemandItem; amount: number }[] = [];
    for (const demand of demandsInSemester) {
      for (const item of payableItems(demand)) {
        const key = cartKey(demand.id, item.id);
        if (selectedKeys.has(key)) rows.push({ demand, item, amount: amounts[key] ?? 0 });
      }
    }
    return rows;
  }, [demandsInSemester, selectedKeys, amounts]);
  const cartTotal = cartItems.reduce((sum, row) => sum + row.amount, 0);
  const canPay = cartItems.length > 0 && cartItems.every((row) => row.amount > 0 && row.amount <= row.item.due);

  async function handlePay() {
    setError(null);
    setSuccess(null);
    try {
      const result = await payCart.mutateAsync({
        items: cartItems.map((row) => ({
          demandId: row.demand.id,
          amount: row.amount,
          feeStructureItemId: row.item.id === WHOLE_DEMAND_ITEM_ID ? undefined : row.item.id,
        })),
        studentName: identity.data?.name,
        studentEmail: identity.data?.work_email,
      });
      setSuccess(
        result.payments.length === 1
          ? `Payment received — receipt ${result.payments[0].receipt_no}`
          : `Payment received — ${result.payments.length} receipts issued`,
      );
      setSelectedKeys(new Set());
      setAmounts({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error && err.message === "Payment cancelled" ? "Payment cancelled." : "Payment could not be completed.");
    }
  }

  async function handleDownloadReceipt(payment: FeePayment) {
    setDownloadError(null);
    try {
      await downloadFeeReceipt(payment.id, `${payment.receipt_no}.pdf`);
    } catch {
      setDownloadError("Could not download this receipt. Please try again.");
    }
  }

  const historyColumns: DataTableColumn<FeePayment>[] = [
    { key: "date", header: "Date", width: "1fr", render: (p) => <span className="font-mono text-[13px]">{formatDisplayDate(p.payment_date)}</span> },
    { key: "amount", header: "Amount paid", width: "1fr", render: (p) => <span className="font-extrabold text-ink">₹{p.amount_paid.toLocaleString("en-IN")}</span> },
    {
      key: "mode",
      header: "Transaction type",
      width: "1fr",
      render: (p) => (p.payment_mode ? p.payment_mode.charAt(0).toUpperCase() + p.payment_mode.slice(1) : "—"),
    },
    { key: "purpose", header: "Purpose", width: "1.8fr", render: (p) => <span className="font-bold text-ink">{p.item_label ?? p.fee_structure_name}</span> },
    {
      key: "receipt",
      header: "Receipt",
      width: "1fr",
      align: "right",
      render: (p) => (
        <button onClick={() => handleDownloadReceipt(p)} className="font-mono text-[12.5px] font-bold text-primary hover:text-primary-dark">
          {p.receipt_no}
        </button>
      ),
    },
  ];

  const totals = useMemo(
    () => ({
      total: demandsInSemester.reduce((s, d) => s + d.total, 0),
      paid: demandsInSemester.reduce((s, d) => s + d.paid, 0),
      due: demandsInSemester.reduce((s, d) => s + d.due, 0),
    }),
    [demandsInSemester],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Fees</h1>
        <p className="mt-1 text-[13.5px] text-muted">Pay in full or part, by fee head · receipts issued instantly</p>
      </div>

      <Card className="flex flex-wrap items-center gap-[34px]">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-bold text-muted">Semester</label>
          <Select
            value={semester ?? ""}
            onChange={(e) => setSemesterOverride(Number(e.target.value))}
            className="min-w-[220px] w-auto border-border-accent font-bold"
          >
            {semesters.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="h-11 w-px bg-divider" />
        <div>
          <div className="text-[25px] font-extrabold tracking-[-.03em] text-ink">₹{totals.total.toLocaleString("en-IN")}</div>
          <div className="text-[12px] font-semibold text-muted">Total payable</div>
        </div>
        <div>
          <div className="text-[25px] font-extrabold tracking-[-.03em] text-primary">₹{totals.paid.toLocaleString("en-IN")}</div>
          <div className="text-[12px] font-semibold text-muted">Paid</div>
        </div>
        <div>
          <div className="text-[25px] font-extrabold tracking-[-.03em] text-primary">₹{totals.due.toLocaleString("en-IN")}</div>
          <div className="text-[12px] font-semibold text-muted">Outstanding</div>
        </div>
        <div className="flex-1" />
        <SegmentedTabs
          options={[
            { key: "pay", label: "Pay fees" },
            { key: "history", label: "Payment history" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </Card>

      {fees.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : tab === "pay" ? (
        demandsInSemester.length === 0 ? (
          <Card>
            <EmptyState message="No fee demands recorded for this semester." />
          </Card>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4">
            <div className="flex flex-col gap-3">
              {demandsInSemester.map((d) => (
                <DemandCard
                  key={d.id}
                  demand={d}
                  selectedKeys={selectedKeys}
                  amounts={amounts}
                  onToggleItem={(item) => toggleItem(d, item)}
                  onAmountChange={(item, value) => setAmounts((a) => ({ ...a, [cartKey(d.id, item.id)]: value }))}
                  onToggleAll={(items, select) => toggleAll(d, items, select)}
                />
              ))}
              {error && (
                <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{error}</div>
              )}
              {success && (
                <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">{success}</div>
              )}
            </div>

            <Card className="sticky top-[88px]">
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Payment summary</h2>
              <div className="mt-3.5 flex flex-col">
                {cartItems.length === 0 ? (
                  <p className="py-4 text-[13px] leading-[1.55] text-subtle">Select one or more fee heads to pay. You can enter any amount up to the due.</p>
                ) : (
                  cartItems.map((row) => (
                    <div key={cartKey(row.demand.id, row.item.id)} className="flex items-center justify-between gap-3 border-b border-divider py-[9px] text-[13px]">
                      <span className="font-semibold text-body">{row.item.label}</span>
                      <span className="font-bold text-ink">₹{row.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3.5 flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-body">Total</span>
                <span className="text-[26px] font-extrabold tracking-[-.03em] text-ink">₹{cartTotal.toLocaleString("en-IN")}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] text-subtle">Convenience charge ₹0 · net banking, UPI and cards accepted</p>
              <Button className="mt-4 w-full" disabled={!canPay || payCart.isPending} onClick={handlePay}>
                {payCart.isPending ? "Processing…" : "Proceed to pay"}
              </Button>
            </Card>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          <DataTable columns={historyColumns} data={paymentsInSemester} rowKey={(p) => p.id} emptyMessage="No payments recorded for this semester." />
          {downloadError && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{downloadError}</div>
          )}
        </div>
      )}
    </div>
  );
}
