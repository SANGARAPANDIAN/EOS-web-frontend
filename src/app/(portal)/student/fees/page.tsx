"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Select, EmptyState } from "@/components/ui";
import { useMyFees, type FeeDemand, type FeePayment } from "@/modules/student/api/fees";
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

function DemandRow({
  demand,
  selected,
  amount,
  onToggle,
  onAmountChange,
}: {
  demand: FeeDemand;
  selected: boolean;
  amount: number;
  onToggle: () => void;
  onAmountChange: (value: number) => void;
}) {
  const disabled = demand.due <= 0;

  return (
    <div
      onClick={disabled ? undefined : onToggle}
      className={`rounded-card border p-[18px] transition-colors ${
        disabled ? "cursor-default border-border-default bg-surface-muted" : "cursor-pointer border-border-default bg-surface hover:border-border-accent"
      } ${selected ? "border-border-accent bg-accent-50" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3.5">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="size-[18px] shrink-0 accent-primary"
        />
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

      {selected && !disabled && (
        <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-dashed border-border-accent pt-3.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 rounded-[10px] border border-border-accent bg-surface px-3.5 py-2.5">
            <span className="text-[14px] font-bold text-muted">₹</span>
            <Input
              type="number"
              min={1}
              max={demand.due}
              value={amount}
              onChange={(e) => onAmountChange(Math.min(demand.due, Math.max(0, Number(e.target.value))))}
              className="w-28 border-0 p-0 text-[15px] font-bold focus:outline-none"
            />
          </div>
          <button onClick={() => onAmountChange(demand.due)} className="text-[13px] font-bold text-primary">
            Pay full due
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeesPage() {
  const [tab, setTab] = useState<Tab>("pay");
  const fees = useMyFees();
  const identity = useMyIdentity();
  const payCart = usePayFeeCart();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [amounts, setAmounts] = useState<Record<number, number>>({});
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

  function toggleDemand(demand: FeeDemand) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(demand.id)) {
        next.delete(demand.id);
      } else {
        next.add(demand.id);
        setAmounts((a) => ({ ...a, [demand.id]: a[demand.id] ?? demand.due }));
      }
      return next;
    });
    setSuccess(null);
    setError(null);
  }

  const cartItems = useMemo(
    () =>
      Array.from(selected)
        .map((id) => ({ demand: demandsById.get(id), amount: amounts[id] ?? 0 }))
        .filter((item): item is { demand: FeeDemand; amount: number } => Boolean(item.demand)),
    [selected, demandsById, amounts],
  );
  const cartTotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
  const canPay = cartItems.length > 0 && cartItems.every((item) => item.amount > 0 && item.amount <= item.demand.due);

  async function handlePay() {
    setError(null);
    setSuccess(null);
    try {
      const result = await payCart.mutateAsync({
        items: cartItems.map((item) => ({ demandId: item.demand.id, amount: item.amount })),
        studentName: identity.data?.name,
        studentEmail: identity.data?.work_email,
      });
      setSuccess(
        result.payments.length === 1
          ? `Payment received — receipt ${result.payments[0].receipt_no}`
          : `Payment received — ${result.payments.length} receipts issued`,
      );
      setSelected(new Set());
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
        <p className="mt-1 text-[13.5px] text-muted">Pay in full or part · receipts issued instantly</p>
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
                <DemandRow
                  key={d.id}
                  demand={d}
                  selected={selected.has(d.id)}
                  amount={amounts[d.id] ?? d.due}
                  onToggle={() => toggleDemand(d)}
                  onAmountChange={(value) => setAmounts((a) => ({ ...a, [d.id]: value }))}
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
                  cartItems.map((item) => (
                    <div key={item.demand.id} className="flex items-center justify-between gap-3 border-b border-divider py-[9px] text-[13px]">
                      <span className="font-semibold text-body">{item.demand.fee_structure_name}</span>
                      <span className="font-bold text-ink">₹{item.amount.toLocaleString("en-IN")}</span>
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
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-[1.2fr_2fr_1fr_1fr_1fr] gap-2 bg-surface-muted px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle">
            <div>DATE</div>
            <div>PARTICULARS</div>
            <div>MODE</div>
            <div className="text-right">AMOUNT</div>
            <div className="text-right">RECEIPT</div>
          </div>
          {paymentsInSemester.length === 0 ? (
            <EmptyState message="No payments recorded for this semester." />
          ) : (
            paymentsInSemester.map((p) => (
              <div key={p.id} className="grid grid-cols-[1.2fr_2fr_1fr_1fr_1fr] items-center gap-2 border-t border-divider px-5 py-3.5">
                <div className="font-mono text-[13px] text-body">{formatDisplayDate(p.payment_date)}</div>
                <div className="text-[13.5px] font-bold text-ink">{p.fee_structure_name}</div>
                <div className="text-[13px] text-muted">{p.payment_mode ?? "—"}</div>
                <div className="text-right text-[14px] font-extrabold text-ink">₹{p.amount_paid.toLocaleString("en-IN")}</div>
                <div className="text-right">
                  <button onClick={() => handleDownloadReceipt(p)} className="font-mono text-[12.5px] font-bold text-primary hover:text-primary-dark">
                    {p.receipt_no}
                  </button>
                </div>
              </div>
            ))
          )}
          {downloadError && (
            <div className="border-t border-divider px-5 py-3">
              <span className="text-[12.5px] font-semibold text-danger-fg">{downloadError}</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
