"use client";

import { useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { currencyShort } from "@/modules/admin/lib/format";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import {
  useExamFeeTransactions,
  useExamFeeStats,
  useCreateExamFeeTransaction,
  useUpdateExamFeeStatus,
  type ExamFeeTransaction,
  type ExamFeeHead,
  type ExamFeeMode,
  type ExamFeeTxnStatus,
} from "@/modules/coe/api/examFeeTransactions";

const TABS: { key: "all" | ExamFeeTxnStatus; label: string }[] = [
  { key: "all", label: "All transactions" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "unpaid", label: "Unpaid" },
  { key: "refunded", label: "Refunded" },
];

const FEE_HEAD_LABEL: Record<ExamFeeHead, string> = {
  exam_fee: "Exam fee",
  arrear_fee: "Arrear fee",
  revaluation_fee: "Revaluation fee",
  certificate_fee: "Certificate fee",
  late_fee: "Late fee",
};

const STATUS_TONE: Record<ExamFeeTxnStatus, BadgeTone> = {
  paid: "accentDark",
  pending: "accent",
  unpaid: "danger",
  refunded: "neutral",
};

function studentName(r: ExamFeeTransaction) {
  const s = r.students;
  return s.soa_applications ? [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ") : s.register_no ?? s.student_id_no;
}

export default function CoeExamFinancePage() {
  const [status, setStatus] = useState<"all" | ExamFeeTxnStatus>("all");
  const [feeHead, setFeeHead] = useState<"all" | ExamFeeHead>("all");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const stats = useExamFeeStats();
  const rows = useExamFeeTransactions({ status: status === "all" ? null : status, fee_head: feeHead === "all" ? null : feeHead, search });
  const updateStatus = useUpdateExamFeeStatus();

  const data = rows.data ?? [];

  function handleExport() {
    downloadCsv(
      "exam-fee-transactions",
      [
        { header: "Student", value: (r: ExamFeeTransaction) => studentName(r) },
        { header: "Register no", value: (r: ExamFeeTransaction) => r.students.register_no ?? r.students.student_id_no },
        { header: "Fee head", value: (r: ExamFeeTransaction) => FEE_HEAD_LABEL[r.fee_head] },
        { header: "Amount", value: (r: ExamFeeTransaction) => r.amount },
        { header: "Mode", value: (r: ExamFeeTransaction) => r.mode },
        { header: "Status", value: (r: ExamFeeTransaction) => r.status },
        { header: "Receipt no", value: (r: ExamFeeTransaction) => r.receipt_no ?? "" },
        { header: "Date", value: (r: ExamFeeTransaction) => r.created_at.slice(0, 10) },
      ],
      data,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Exam Finance"
        subtitle="Exam, arrear, revaluation, certificate and late fee transactions across every student."
        actions={
          <>
            <Button variant="secondary" className="w-auto" onClick={handleExport}>
              Export
            </Button>
            <Button variant="primarySmall" className="w-auto" onClick={() => setShowNew(true)}>
              + Record transaction
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Fee demand raised" value={stats.data ? currencyShort(stats.data.raised) : stats.isLoading ? "…" : "₹0"} icon="payments" />
        <StatCard
          label="Fee collected"
          value={stats.data ? currencyShort(stats.data.collected) : stats.isLoading ? "…" : "₹0"}
          icon="account_balance_wallet"
          sub={stats.data ? `${stats.data.collected_pct}% collected` : undefined}
        />
        <StatCard label="Pending / unpaid" value={stats.data?.pending_count ?? (stats.isLoading ? "…" : 0)} icon="hourglass_empty" />
        <StatCard label="Refunded" value={stats.data?.refunded_count ?? (stats.isLoading ? "…" : 0)} icon="undo" />
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <PillTabs options={TABS} value={status} onChange={(k) => setStatus(k as typeof status)} />
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar placeholder="Search by register number or receipt no…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[280px]" />
            <Select value={feeHead} onChange={(e) => setFeeHead(e.target.value as typeof feeHead)} className="w-auto min-w-[150px]">
              <option value="all">All fee heads</option>
              {Object.entries(FEE_HEAD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {rows.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Transactions</span>
            <span className="text-[12.5px] text-muted">{data.length} records</span>
          </div>
          {data.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No transactions match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[130px]">Fee head</div>
                <div className="w-[100px]">Amount</div>
                <div className="w-[90px]">Mode</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[170px] text-right">Actions</div>
              </div>
              {data.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{studentName(r)}</div>
                    <div className="text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no} · {r.receipt_no ?? "no receipt"}</div>
                  </div>
                  <div className="w-[130px] text-[12.5px] text-ink">{FEE_HEAD_LABEL[r.fee_head]}</div>
                  <div className="w-[100px] text-[13px] font-bold text-ink">{currencyShort(r.amount)}</div>
                  <div className="w-[90px] text-[12px] uppercase text-muted">{r.mode}</div>
                  <div className="w-[110px]">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status.toUpperCase()}</Badge>
                  </div>
                  <div className="w-[170px] text-right">
                    {r.status === "pending" || r.status === "unpaid" ? (
                      <Button
                        variant="secondary"
                        className="w-auto px-3 py-1.5 text-[12px]"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: r.id, status: "paid" })}
                      >
                        Mark paid
                      </Button>
                    ) : r.status === "paid" ? (
                      <Button
                        variant="secondary"
                        className="w-auto px-3 py-1.5 text-[12px]"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: r.id, status: "refunded" })}
                      >
                        Refund
                      </Button>
                    ) : (
                      <span className="text-[12px] text-subtle">{r.created_at.slice(0, 10)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <NewTransactionModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function NewTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lookup = useLookupStudentByRegisterNo();
  const createTxn = useCreateExamFeeTransaction();

  const [registerNo, setRegisterNo] = useState("");
  const [student, setStudent] = useState<{ id: number; name: string | null; register_no: string } | null>(null);
  const [feeHead, setFeeHead] = useState<ExamFeeHead>("exam_fee");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<ExamFeeMode>("online");

  function handleClose() {
    setRegisterNo("");
    setStudent(null);
    setFeeHead("exam_fee");
    setAmount("");
    setMode("online");
    lookup.reset();
    createTxn.reset();
    onClose();
  }

  function handleLookup() {
    if (!registerNo.trim()) return;
    lookup.mutate(registerNo.trim(), {
      onSuccess: (result) => setStudent({ id: result.id, name: result.name, register_no: result.register_no }),
      onError: () => setStudent(null),
    });
  }

  function handleCreate() {
    if (!student || !amount) return;
    createTxn.mutate({ student_id: student.id, fee_head: feeHead, amount: Number(amount), mode }, { onSuccess: handleClose });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Record fee transaction" subtitle="Look up the student, then record the fee head, amount and payment mode.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Register number</label>
          <div className="flex gap-2">
            <Input value={registerNo} onChange={(e) => setRegisterNo(e.target.value)} placeholder="e.g. 21CS045" />
            <Button variant="secondary" className="w-auto shrink-0" disabled={lookup.isPending} onClick={handleLookup}>
              {lookup.isPending ? "…" : "Find"}
            </Button>
          </div>
          {lookup.isError && isNotFound(lookup.error) && <p className="mt-1.5 text-[12px] text-danger-fg">No student found with this register number.</p>}
          {student && (
            <p className="mt-1.5 text-[12.5px] font-semibold text-primary">
              {student.name ?? student.register_no} · {student.register_no}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee head</label>
            <Select value={feeHead} onChange={(e) => setFeeHead(e.target.value as ExamFeeHead)}>
              {Object.entries(FEE_HEAD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Mode</label>
            <Select value={mode} onChange={(e) => setMode(e.target.value as ExamFeeMode)}>
              <option value="online">Online</option>
              <option value="challan">Challan</option>
              <option value="counter">Counter</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Amount (₹)</label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 2700" />
        </div>
        {createTxn.isError && <p className="text-[12px] text-danger-fg">{(createTxn.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!student || !amount || createTxn.isPending} onClick={handleCreate}>
            {createTxn.isPending ? "Recording…" : "Record transaction"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
