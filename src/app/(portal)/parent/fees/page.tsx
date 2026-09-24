"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SegmentedTabs, Select, EmptyState, Icon, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildFees, type FeeDemand, type FeePayment } from "@/modules/parent/api/fees";
import { formatDisplayDate } from "@/lib/utils/date";

type Tab = "summary" | "history";

const STATUS_LABEL: Record<FeeDemand["status"], string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
};

function DemandCard({ demand }: { demand: FeeDemand }) {
  const items = demand.items.length > 0 ? demand.items : null;
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-3.5 p-[18px] pb-3.5">
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

      {items && (
        <div className="flex flex-col gap-1 border-t border-divider p-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-[10px] p-3">
              <div className="min-w-[140px] flex-1 text-[13.5px] font-bold text-ink">{item.label}</div>
              <div className="flex gap-2 font-mono text-[12px] text-muted">
                <span>₹{item.total.toLocaleString("en-IN")} total</span>
                {item.paid > 0 && <span className="text-primary">· ₹{item.paid.toLocaleString("en-IN")} paid</span>}
              </div>
              <Badge tone={item.status === "pending" ? "accentDark" : "accent"} className="ml-auto">
                {item.status === "paid" ? "Paid" : `₹${item.due.toLocaleString("en-IN")} due`}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function ParentFeesPage() {
  const { selectedChildId } = useSelectedChild();
  const [tab, setTab] = useState<Tab>("summary");
  const fees = useChildFees(selectedChildId);

  const [semesterOverride, setSemesterOverride] = useState<number | null>(null);

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

  const totals = useMemo(
    () => ({
      total: demandsInSemester.reduce((s, d) => s + d.total, 0),
      paid: demandsInSemester.reduce((s, d) => s + d.paid, 0),
      due: demandsInSemester.reduce((s, d) => s + d.due, 0),
    }),
    [demandsInSemester],
  );

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
    { key: "receipt", header: "Receipt", width: "1fr", align: "right", render: (p) => <span className="font-mono text-[12.5px] font-bold text-ink">{p.receipt_no}</span> },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Fees</h1>
        <p className="mt-1 text-[13.5px] text-muted">Read-only — for payment, please use the student&apos;s own account</p>
      </div>

      <Card className="flex flex-wrap items-center gap-[34px]">
        <ChildSwitcher />
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
            { key: "summary", label: "Summary" },
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
      ) : tab === "summary" ? (
        demandsInSemester.length === 0 ? (
          <Card>
            <EmptyState message="No fee demands recorded for this semester." />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {totals.due === 0 && (
              <p className="flex items-center gap-1.5 px-0.5 text-[13px] text-subtle">
                <Icon name="check_circle" size={15} className="text-primary" />
                All fees paid for this semester.
              </p>
            )}
            {demandsInSemester.map((d) => (
              <DemandCard key={d.id} demand={d} />
            ))}
          </div>
        )
      ) : (
        <DataTable columns={historyColumns} data={paymentsInSemester} rowKey={(p) => p.id} emptyMessage="No payments recorded for this semester." />
      )}
    </div>
  );
}
