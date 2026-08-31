"use client";

import { useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE, type BadgeTone } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { currencyShort } from "@/modules/admin/lib/format";
import { formatDate } from "@/lib/utils/format";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import {
  useExamFeeTransactions,
  useExamFeeStats,
  useCreateExamFeeTransaction,
  useReconcileExamFeeTransaction,
  useRemindExamFeeTransaction,
  type ExamFeeTransaction,
  type ExamFeeHead,
  type ExamFeeMode,
  type ExamFeeTxnStatus,
} from "@/modules/coe/api/examFeeTransactions";

type Bucket = "pending" | "refunds" | "to_reconcile";
type TabKey = "all" | Bucket;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All transactions" },
  { key: "pending", label: "Pending" },
  { key: "refunds", label: "Refunds" },
  { key: "to_reconcile", label: "To reconcile" },
];

const FEE_HEAD_LABEL: Record<ExamFeeHead, string> = {
  exam_fee: "Exam fee",
  arrear_fee: "Arrear fee",
  revaluation_fee: "Revaluation fee",
  certificate_fee: "Certificate fee",
  late_fee: "Late fee",
};

const MODE_LABEL: Record<ExamFeeMode, string> = { online: "Online", challan: "Challan", counter: "Counter cash" };

const STATUS_TONE: Record<ExamFeeTxnStatus, BadgeTone> = {
  paid: "accentDark",
  pending: "accent",
  unpaid: "danger",
  refunded: "neutral",
};

function bucketsOf(r: ExamFeeTransaction): Bucket[] {
  const buckets: Bucket[] = [];
  if (r.status === "pending" || r.status === "unpaid") buckets.push("pending");
  if (r.status === "refunded") buckets.push("refunds");
  if (r.status === "paid" && !r.reconciled_at) buckets.push("to_reconcile");
  return buckets;
}

function studentName(r: ExamFeeTransaction): string {
  const s = r.students;
  return s.soa_applications ? [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ") : (s.register_no ?? s.student_id_no);
}

export default function CoeExamFinancePage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [feeHead, setFeeHead] = useState<"all" | ExamFeeHead>("all");
  const [mode, setMode] = useState<"all" | ExamFeeMode>("all");
  const [status, setStatus] = useState<"all" | ExamFeeTxnStatus>("all");
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [viewingRow, setViewingRow] = useState<ExamFeeTransaction | null>(null);

  const stats = useExamFeeStats();
  const allRows = useExamFeeTransactions({
    search: search.trim() || undefined,
    fee_head: feeHead === "all" ? undefined : feeHead,
    mode: mode === "all" ? undefined : mode,
    status: status === "all" ? undefined : status,
  });

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const data = allRows.data ?? [];
  const tabCounts = {
    all: data.length,
    pending: data.filter((r) => bucketsOf(r).includes("pending")).length,
    refunds: data.filter((r) => bucketsOf(r).includes("refunds")).length,
    to_reconcile: data.filter((r) => bucketsOf(r).includes("to_reconcile")).length,
  };

  const filtered = tab === "all" ? data : data.filter((r) => bucketsOf(r).includes(tab));
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function handleExport() {
    downloadCsv(
      "exam-fee-transactions",
      [
        { header: "Receipt", value: (r: ExamFeeTransaction) => r.receipt_no ?? "" },
        { header: "Student", value: (r: ExamFeeTransaction) => studentName(r) },
        { header: "Register no", value: (r: ExamFeeTransaction) => r.students.register_no ?? r.students.student_id_no },
        { header: "Fee head", value: (r: ExamFeeTransaction) => FEE_HEAD_LABEL[r.fee_head] },
        { header: "Amount", value: (r: ExamFeeTransaction) => r.amount },
        { header: "Mode", value: (r: ExamFeeTransaction) => MODE_LABEL[r.mode] },
        { header: "Status", value: (r: ExamFeeTransaction) => r.status },
        { header: "Reference no", value: (r: ExamFeeTransaction) => r.reference_no ?? "" },
        { header: "Date", value: (r: ExamFeeTransaction) => r.created_at.slice(0, 10) },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Exam Finance"
        subtitle="Exam, arrear and revaluation fee demand, collections, refunds and reconciliation."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setShowNew(true)}>
              <Icon name="add" size={16} />
              Record payment
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total collected"
          value={stats.data ? currencyShort(stats.data.collected) : "₹0"}
          icon="payments"
          sub={stats.data?.collected_pct_of_demand != null ? `${stats.data.collected_pct_of_demand}% of demand` : undefined}
        />
        <StatCard
          label="Outstanding"
          value={stats.data ? currencyShort(stats.data.outstanding) : "₹0"}
          icon="hourglass_empty"
          sub={stats.data ? `${stats.data.outstanding_students} students` : undefined}
        />
        <StatCard
          label="Revaluation fees"
          value={stats.data ? currencyShort(stats.data.revaluation_fees) : "₹0"}
          icon="difference"
          sub={stats.data ? `${stats.data.revaluation_applications} applications` : undefined}
        />
        <StatCard
          label="Refunds processed"
          value={stats.data ? currencyShort(stats.data.refunds_processed) : "₹0"}
          icon="undo"
          sub={stats.data ? `${stats.data.refunds_cases} cases` : undefined}
        />
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-7 border-b border-divider px-5 pt-4">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => changeFilter(setTab, t.key)}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 pb-3 text-[14px] font-bold transition-colors",
                  active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-bold", active ? "bg-accent-50 text-primary" : "bg-surface-tint text-muted")}>
                  {tabCounts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-5 py-4">
          <SearchBar placeholder="Search receipt, roll number or head…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[280px]" />
          <Select value={feeHead} onChange={(e) => changeFilter(setFeeHead, e.target.value as typeof feeHead)} className="w-auto min-w-[140px]">
            <option value="all">All heads</option>
            {Object.entries(FEE_HEAD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select value={mode} onChange={(e) => changeFilter(setMode, e.target.value as typeof mode)} className="w-auto min-w-[130px]">
            <option value="all">All modes</option>
            {Object.entries(MODE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => changeFilter(setStatus, e.target.value as typeof status)} className="w-auto min-w-[130px]">
            <option value="all">All status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="unpaid">Unpaid</option>
            <option value="refunded">Refunded</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {allRows.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No transactions match the current filters.</p>
        ) : (
          <>
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[130px]">Receipt</div>
                <div className="flex-1">Student</div>
                <div className="w-[150px]">Fee head</div>
                <div className="w-[100px] text-right">Amount</div>
                <div className="w-[110px]">Mode</div>
                <div className="w-[100px]">Status</div>
                <div className="w-[90px] text-right">Actions</div>
              </div>
              {pageRows.map((r) => (
                <TransactionRow key={r.id} row={r} onView={() => setViewingRow(r)} />
              ))}
            </div>
            <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <NewTransactionModal open={showNew} onClose={() => setShowNew(false)} />
      <ReceiptModal row={viewingRow} onClose={() => setViewingRow(null)} />
    </div>
  );
}

function TransactionRow({ row: r, onView }: { row: ExamFeeTransaction; onView: () => void }) {
  const reconcile = useReconcileExamFeeTransaction();
  const remind = useRemindExamFeeTransaction();

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="w-[130px] min-w-0 shrink-0">
        <div className="truncate text-[13px] font-extrabold text-ink">{r.receipt_no ?? "—"}</div>
        <div className="text-[11px] text-muted">{formatDate(r.created_at)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">{studentName(r)}</div>
        <div className="truncate text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no}</div>
      </div>
      <div className="w-[150px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{FEE_HEAD_LABEL[r.fee_head]}</div>
      <div className="w-[100px] shrink-0 text-right text-[13px] font-bold text-ink">{currencyShort(r.amount)}</div>
      <div className="w-[110px] min-w-0 shrink-0 truncate text-[12px] text-ink">{MODE_LABEL[r.mode]}</div>
      <div className="w-[100px] min-w-0 shrink-0">
        <Badge tone={STATUS_TONE[r.status]} className="max-w-full truncate">
          {r.status.toUpperCase()}
        </Badge>
      </div>
      <div className="flex w-[90px] shrink-0 justify-end">
        {(r.status === "pending" || r.status === "unpaid") && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            disabled={remind.isPending || remind.isSuccess}
            onClick={() => remind.mutate(r.id)}
          >
            {remind.isSuccess ? "Reminded" : remind.isPending ? "Sending…" : "Remind"}
          </button>
        )}
        {r.status === "paid" && !r.reconciled_at && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            disabled={reconcile.isPending}
            onClick={() => reconcile.mutate(r.id)}
          >
            {reconcile.isPending ? "…" : "Reconcile"}
          </button>
        )}
        {r.status === "paid" && !!r.reconciled_at && (
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onView}>
            Receipt
          </button>
        )}
        {r.status === "refunded" && (
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onView}>
            View
          </button>
        )}
      </div>
    </div>
  );
}

/** Pure read-only receipt summary — never changes anything. */
function ReceiptModal({ row, onClose }: { row: ExamFeeTransaction | null; onClose: () => void }) {
  return (
    <Modal open={row != null} onClose={onClose} title={row?.receipt_no ?? ""} subtitle={row ? studentName(row) : undefined}>
      {row && (
        <div className="flex flex-col gap-3 text-[13px]">
          {(
            [
              ["Fee head", FEE_HEAD_LABEL[row.fee_head]],
              ["Amount", currencyShort(row.amount)],
              ["Mode", MODE_LABEL[row.mode]],
              ["Reference no.", row.reference_no ?? "—"],
              ["Status", row.status.toUpperCase()],
              ["Date", formatDate(row.created_at)],
              ["Reconciled", row.reconciled_at ? formatDate(row.reconciled_at) : "—"],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 last:border-0">
              <span className="font-bold text-muted">{label}</span>
              <span className="text-right text-ink">{value}</span>
            </div>
          ))}
          <Button variant="secondary" className="mt-2 w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}

function NewTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lookup = useLookupStudentByRegisterNo();
  const createTxn = useCreateExamFeeTransaction();

  const [registerNo, setRegisterNo] = useState("");
  const [lookedUpFor, setLookedUpFor] = useState("");
  const [feeHead, setFeeHead] = useState<ExamFeeHead>("exam_fee");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<ExamFeeMode>("counter");
  const [referenceNo, setReferenceNo] = useState("");

  function reset() {
    setRegisterNo("");
    setLookedUpFor("");
    setFeeHead("exam_fee");
    setAmount("");
    setMode("counter");
    setReferenceNo("");
    lookup.reset();
    createTxn.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleRollBlur() {
    const value = registerNo.trim();
    if (!value || value === lookedUpFor) return;
    setLookedUpFor(value);
    lookup.mutate(value);
  }

  function handleCreate() {
    if (!lookup.data || !amount) return;
    createTxn.mutate(
      { student_id: lookup.data.id, fee_head: feeHead, amount: Number(amount), mode, reference_no: referenceNo.trim() || undefined },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Record a payment"
      subtitle="Counter and challan entries. Online payments reconcile automatically from the gateway feed."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Roll number *</label>
          <input
            type="text"
            value={registerNo}
            onChange={(e) => setRegisterNo(e.target.value)}
            onBlur={handleRollBlur}
            placeholder="e.g. 22IT073"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          {lookup.isPending ? (
            <p className="mt-1.5 text-[12px] text-muted">Looking up…</p>
          ) : lookup.data ? (
            <p className="mt-1.5 text-[12px] font-semibold text-primary">
              Found: {lookup.data.name ?? lookup.data.register_no} · {lookup.data.department_code ?? "—"}
            </p>
          ) : lookup.isError ? (
            <p className="mt-1.5 text-[12px] text-danger-fg">{isNotFound(lookup.error) ? "No student found with this roll number." : (lookup.error as Error).message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee head</label>
          <select
            value={feeHead}
            onChange={(e) => setFeeHead(e.target.value as ExamFeeHead)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {Object.entries(FEE_HEAD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Amount (₹) *</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1200"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ExamFeeMode)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {Object.entries(MODE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Reference number</label>
          <input
            type="text"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="Challan or transaction ID"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-[11.5px] text-subtle">A receipt is generated and the student is notified on save.</p>
        </div>

        {createTxn.isError && <p className="text-[12px] text-danger-fg">{(createTxn.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!lookup.data || !amount || createTxn.isPending} onClick={handleCreate}>
            {createTxn.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
