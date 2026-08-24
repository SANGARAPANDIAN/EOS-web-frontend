"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Icon,
  IconButton,
  Input,
  Modal,
  StatCard,
  type DataTableColumn,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useCreateHrPayroll,
  useHrPayroll,
  useMarkHrPayrollPaid,
  type CreateHrPayrollInput,
  type HrPayrollRecord,
} from "@/modules/hr/api/payroll";
import { HrFacultyPicker } from "@/modules/hr/components/HrFacultyPicker";
import type { HrFaculty } from "@/modules/hr/api/facultyDirectory";
import { formatDisplayDate, todayDateOnly } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const PAGE_SIZE = 20;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function facultyName(f: { first_name: string; last_name: string } | null | undefined): string {
  return f ? `${f.first_name} ${f.last_name}`.trim() : "Unknown faculty";
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

interface CreateFormState {
  month: string;
  basicSalary: string;
  hra: string;
  da: string;
  pfDeduction: string;
  otherDeductions: string;
}

const EMPTY_FORM: CreateFormState = {
  month: currentMonth(),
  basicSalary: "",
  hra: "",
  da: "",
  pfDeduction: "",
  otherDeductions: "",
};

function RunPayrollModal({ onClose }: { onClose: () => void }) {
  const createPayroll = useCreateHrPayroll();
  // A plain dropdown could only ever hold the first 100 of ~500 faculty, so
  // the picker searches server-side by name, roll number or email instead.
  const [faculty, setFaculty] = useState<HrFaculty | null>(null);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const estimatedNet = useMemo(() => {
    const basic = Number(form.basicSalary) || 0;
    const hra = Number(form.hra) || 0;
    const da = Number(form.da) || 0;
    const pf = Number(form.pfDeduction) || 0;
    const other = Number(form.otherDeductions) || 0;
    return basic + hra + da - pf - other;
  }, [form]);

  function update<K extends keyof CreateFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (faculty === null) {
      setError("Choose a faculty member.");
      return;
    }
    if (!form.month) {
      setError("Choose a month.");
      return;
    }
    if (!form.basicSalary) {
      setError("Enter a basic salary.");
      return;
    }
    setError(null);
    const input: CreateHrPayrollInput = {
      faculty_id: faculty.id,
      month: form.month,
      basic_salary: Number(form.basicSalary) || 0,
      hra: Number(form.hra) || 0,
      da: Number(form.da) || 0,
      pf_deduction: form.pfDeduction ? Number(form.pfDeduction) : undefined,
      other_deductions: form.otherDeductions ? Number(form.otherDeductions) : undefined,
    };
    try {
      await createPayroll.mutateAsync(input);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this payroll record.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Run payroll" subtitle="Records one faculty member's payroll for a month">
      <div className="flex flex-col gap-3.5">
        <div>
          <div className="mb-1.5 text-[13px] font-bold text-body">Faculty</div>
          <HrFacultyPicker value={faculty} onChange={setFaculty} />
        </div>

        <div>
          <div className="mb-1.5 text-[13px] font-bold text-body">Month</div>
          <Input type="month" value={form.month} onChange={(e) => update("month", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">Basic salary</div>
            <Input type="number" min={0} value={form.basicSalary} onChange={(e) => update("basicSalary", e.target.value)} />
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">HRA</div>
            <Input type="number" min={0} value={form.hra} onChange={(e) => update("hra", e.target.value)} />
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">DA</div>
            <Input type="number" min={0} value={form.da} onChange={(e) => update("da", e.target.value)} />
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">PF deduction</div>
            <Input type="number" min={0} value={form.pfDeduction} onChange={(e) => update("pfDeduction", e.target.value)} />
          </div>
          <div className="col-span-2">
            <div className="mb-1.5 text-[13px] font-bold text-body">Other deductions</div>
            <Input type="number" min={0} value={form.otherDeductions} onChange={(e) => update("otherDeductions", e.target.value)} />
          </div>
        </div>

        <div className="rounded-[10px] border border-border-default bg-surface-tint px-3.5 py-2.5 text-[13px] text-muted">
          Estimated net: <span className="font-bold text-ink">{formatCurrency(estimatedNet)}</span> — the saved record&apos;s
          actual gross and net are computed by the server.
        </div>

        {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
      </div>

      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="secondary" className="w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={createPayroll.isPending}>
          {createPayroll.isPending ? "Saving…" : "Save record"}
        </Button>
      </div>
    </Modal>
  );
}

export default function HrPayrollPage() {
  const [month, setMonth] = useState(currentMonth());
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [payingRecord, setPayingRecord] = useState<HrPayrollRecord | null>(null);
  const [filterFaculty, setFilterFaculty] = useState<HrFaculty | null>(null);

  const payroll = useHrPayroll({
    month: month || undefined,
    faculty_id: filterFaculty?.id,
    page,
    limit: PAGE_SIZE,
  });
  const markPaid = useMarkHrPayrollPaid();

  function updateMonth(value: string) {
    setMonth(value);
    setPage(1);
  }

  function updateFacultyFilter(next: HrFaculty | null) {
    setFilterFaculty(next);
    setPage(1);
  }

  const rows = useMemo(() => payroll.data?.data ?? [], [payroll.data]);
  const meta = payroll.data?.meta;

  const shownStats = useMemo(() => {
    const paid = rows.filter((r) => r.paid_at !== null);
    const totalNet = rows.reduce((sum, r) => sum + r.net_amount, 0);
    return { paid: paid.length, pending: rows.length - paid.length, totalNet };
  }, [rows]);

  function statusTone(record: HrPayrollRecord): BadgeTone {
    return record.paid_at ? "accent" : "neutral";
  }

  const columns: DataTableColumn<HrPayrollRecord>[] = [
    {
      key: "faculty",
      header: "Faculty",
      width: "1.6fr",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={facultyName(row.faculty)} imageUrl={row.faculty?.profile_url} size={32} />
          <div className="min-w-0">
            <div className="truncate font-bold text-ink">{facultyName(row.faculty)}</div>
            <div className="truncate text-[12px] text-muted">{row.faculty?.designation ?? "—"}</div>
          </div>
        </div>
      ),
    },
    { key: "month", header: "Month", render: (row) => monthLabel(row.month) },
    { key: "gross", header: "Gross", align: "right", render: (row) => formatCurrency(row.gross_amount) },
    {
      key: "net",
      header: "Net",
      align: "right",
      render: (row) => <span className="font-bold text-ink">{formatCurrency(row.net_amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (row) => <Badge tone={statusTone(row)}>{row.paid_at ? "Paid" : "Pending"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      width: "170px",
      align: "right",
      render: (row) =>
        row.paid_at ? (
          <span className="text-[12px] text-subtle">Paid {formatDisplayDate(row.paid_at)}</span>
        ) : (
          <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12.5px]" onClick={() => setPayingRecord(row)}>
            Mark paid
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Payroll</h1>
          <p className="mt-1 text-[13px] text-muted">Review payroll runs by month and record faculty payments.</p>
        </div>
        <Button variant="primarySmall" className="inline-flex w-auto items-center gap-1.5 px-5 py-3" onClick={() => setShowCreate(true)}>
          <Icon name="add" size={16} />
          Run payroll
        </Button>
      </div>

      {payroll.isError && (
        <Banner>{payroll.error instanceof ApiError ? payroll.error.message : "Could not load payroll records."}</Banner>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard label={`Records — ${monthLabel(month || currentMonth())}`} value={meta?.total ?? 0} icon="payments" />
        <StatCard label="Paid (shown)" value={shownStats.paid} icon="check_circle" sub={`of ${rows.length} on this page`} />
        <StatCard label="Pending (shown)" value={shownStats.pending} icon="hourglass_top" sub={`of ${rows.length} on this page`} />
        <StatCard label="Net payable (shown)" value={formatCurrency(shownStats.totalNet)} icon="account_balance_wallet" />
      </div>

      <Card className="flex flex-col gap-4 p-[18px_20px]">
        <h2 className="text-[15px] font-extrabold text-ink">Filters</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Month</label>
            <Input type="month" value={month} onChange={(e) => updateMonth(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Faculty</label>
            {/* Searchable rather than a dropdown: the list endpoint caps a page
                at 100 rows and there are ~500 faculty, so a dropdown could never
                offer everyone. */}
            <HrFacultyPicker
              value={filterFaculty}
              onChange={updateFacultyFilter}
              placeholder="All faculty — search by name, roll no, designation or email"
            />
          </div>
        </div>
      </Card>

      <DataTable columns={columns} data={rows} rowKey={(row) => row.id} loading={payroll.isLoading} emptyMessage="No payroll records for these filters." />

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-muted">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <IconButton
              icon="chevron_left"
              disabled={page <= 1}
              className="disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            <span className="text-[12.5px] font-bold text-body">
              Page {meta.page} of {meta.totalPages}
            </span>
            <IconButton
              icon="chevron_right"
              disabled={page >= meta.totalPages}
              className="disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            />
          </div>
        </div>
      )}

      {showCreate && <RunPayrollModal onClose={() => setShowCreate(false)} />}

      <ConfirmDialog
        open={payingRecord !== null}
        title="Mark this payroll record as paid?"
        description={
          payingRecord
            ? `${facultyName(payingRecord.faculty)} — ${monthLabel(payingRecord.month)} · paid on ${formatDisplayDate(todayDateOnly())}.`
            : undefined
        }
        confirmLabel={markPaid.isPending ? "Saving…" : "Mark paid"}
        onConfirm={() => {
          if (!payingRecord) return;
          markPaid.mutate({ id: payingRecord.id, paidOn: todayDateOnly() }, { onSuccess: () => setPayingRecord(null) });
        }}
        onCancel={() => setPayingRecord(null)}
      />
    </div>
  );
}
