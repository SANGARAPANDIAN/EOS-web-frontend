"use client";

import { useState, type ReactNode } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  ProgressBar,
  Select,
  StatCard,
  type DataTableColumn,
} from "@/components/ui";
import {
  usePayrollSummary,
  usePayrollYears,
  type PayrollMonth,
  type PayrollDepartment,
} from "@/modules/hr/api/reports";
import {
  useDownloadHrReport,
  useHrReportCatalogue,
  type HrReportCatalogueEntry,
  type HrReportFormat,
} from "@/modules/hr/api/reportExports";
import { useHrDepartments } from "@/modules/hr/api/departments";
import { HrFacultyPicker } from "@/modules/hr/components/HrFacultyPicker";
import type { HrFaculty } from "@/modules/hr/api/facultyDirectory";
import { ApiError } from "@/types/api";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Lakhs/crores read better than full digits for payroll totals. */
function compactRupees(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return rupees(n);
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.05em] text-muted">{label}</label>
      {children}
    </div>
  );
}

/**
 * HR payroll reports, aggregated from the real `salary_payments` records, plus
 * the downloadable report pack.
 *
 * Every figure on screen is a live sum over payslips, so the totals reconcile
 * with the individual statements rather than being tracked separately. Payroll
 * runs on the Indian financial year (April–March), which is what the year
 * selector offers — and it only lists years that actually have payroll
 * recorded.
 *
 * The download cards are the point of this page: each one renders a real .xlsx
 * or .pdf server-side from the same queries, so a report can never disagree
 * with what is displayed above it.
 */
export default function HrReportsPage() {
  const years = usePayrollYears();
  const [year, setYear] = useState<number | undefined>(undefined);
  const summary = usePayrollSummary(year);
  const data = summary.data;

  const catalogue = useHrReportCatalogue();
  const departments = useHrDepartments();
  const download = useDownloadHrReport();

  const [departmentId, setDepartmentId] = useState("all");
  const [faculty, setFaculty] = useState<HrFaculty | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(null);

  const maxDeptGross = Math.max(1, ...(data?.by_department ?? []).map((d) => d.gross));

  async function run(entry: HrReportCatalogueEntry, format: HrReportFormat) {
    const key = `${entry.kind}:${format}`;
    setError(null);
    setBusyKey(key);
    try {
      await download.mutateAsync({
        report: entry.kind,
        format,
        year,
        departmentId: departmentId === "all" ? undefined : Number(departmentId),
        facultyId: entry.needs_faculty ? faculty?.id : undefined,
      });
      setLastDownloaded(`${entry.title} · ${format === "excel" ? "Excel" : "PDF"}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate this report.");
    } finally {
      setBusyKey(null);
    }
  }

  const monthColumns: DataTableColumn<PayrollMonth>[] = [
    {
      key: "month",
      header: "Month",
      width: "1fr",
      render: (r) => <span className="font-bold text-ink">{`${MONTH_NAMES[r.month]} ${r.year}`}</span>,
    },
    {
      key: "head",
      header: "Payslips",
      width: "0.8fr",
      align: "right",
      render: (r) => <span className="font-mono text-body">{r.headcount}</span>,
    },
    {
      key: "gross",
      header: "Gross",
      width: "1.1fr",
      align: "right",
      render: (r) => <span className="font-mono text-body">{rupees(r.gross)}</span>,
    },
    {
      key: "ded",
      header: "Deductions",
      width: "1.1fr",
      align: "right",
      render: (r) => <span className="font-mono text-body">{rupees(r.deductions)}</span>,
    },
    {
      key: "net",
      header: "Net",
      width: "1.1fr",
      align: "right",
      render: (r) => <span className="font-mono font-bold text-primary">{rupees(r.net)}</span>,
    },
    {
      key: "lop",
      header: "LOP days",
      width: "0.8fr",
      align: "right",
      render: (r) =>
        r.lop_days > 0 ? (
          <span className="font-mono text-danger-fg">{r.lop_days}</span>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      key: "status",
      header: "Run status",
      width: "1.2fr",
      align: "right",
      render: (r) =>
        r.pending === 0 ? <Badge tone="accent">All processed</Badge> : <Badge tone="neutral">{`${r.pending} pending`}</Badge>,
    },
  ];

  const deptColumns: DataTableColumn<PayrollDepartment>[] = [
    {
      key: "dept",
      header: "Department",
      width: "1.8fr",
      render: (r) => <span className="font-bold text-ink">{r.department_name}</span>,
    },
    {
      key: "head",
      header: "Payslips",
      width: "0.8fr",
      align: "right",
      render: (r) => <span className="font-mono text-body">{r.headcount}</span>,
    },
    {
      key: "share",
      header: "Share of payroll",
      width: "1.6fr",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <ProgressBar percent={Math.round((r.gross / maxDeptGross) * 100)} height={6} className="w-[110px]" />
          <span className="font-mono text-[12px] text-muted">{compactRupees(r.gross)}</span>
        </div>
      ),
    },
    {
      key: "ded",
      header: "Deductions",
      width: "1.1fr",
      align: "right",
      render: (r) => <span className="font-mono text-body">{rupees(r.deductions)}</span>,
    },
    {
      key: "net",
      header: "Net",
      width: "1.1fr",
      align: "right",
      render: (r) => <span className="font-mono font-bold text-primary">{rupees(r.net)}</span>,
    },
  ];

  const entries = catalogue.data ?? [];
  const groups = Array.from(new Set(entries.map((e) => e.group)));
  const needsFacultySomewhere = entries.some((e) => e.needs_faculty);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Payroll reports</h1>
          <p className="mt-1 text-[13px] text-muted">
            Month-by-month and department-wise payroll for the financial year, summed from processed payslips — each
            report downloads as a real Excel workbook or PDF.
          </p>
        </div>
        <Field label="Financial year" className="min-w-[220px]">
          <Select
            value={year != null ? String(year) : ""}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Current year</option>
            {(years.data ?? []).map((y) => (
              <option key={y.financial_year_start} value={y.financial_year_start}>
                FY {y.label} ({y.payslips} payslips)
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {error && <Banner>{error}</Banner>}

      {/* ── Download pack ───────────────────────────────────────────────────── */}
      <Card className="flex flex-col gap-4 p-[18px_20px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">Download reports</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Rendered server-side from live payroll and establishment records. Excel keeps figures as numbers you can
              sum; the PDF is a letterheaded document with totals.
            </p>
          </div>
          {lastDownloaded && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary">
              <Icon name="task_alt" size={15} />
              {lastDownloaded} downloaded
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-divider pt-4 md:grid-cols-2">
          <Field label="Department (where the report supports it)">
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="all">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          {needsFacultySomewhere && (
            <Field label="Employee (for the annual salary statement)">
              <HrFacultyPicker
                value={faculty}
                onChange={setFaculty}
                placeholder="Search by name, roll no, designation or email"
                showDepartmentFilter={false}
              />
            </Field>
          )}
        </div>

        {catalogue.isLoading ? (
          <EmptyState message="Loading the report catalogue…" />
        ) : entries.length === 0 ? (
          <EmptyState message="No reports are available." />
        ) : (
          groups.map((group) => (
            <div key={group} className="flex flex-col gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[.06em] text-subtle">{group}</div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {entries
                  .filter((e) => e.group === group)
                  .map((entry) => {
                    // A per-employee report is impossible without an employee,
                    // so the buttons say so rather than failing on click.
                    const blocked = entry.needs_faculty && faculty === null;
                    return (
                      <div
                        key={entry.kind}
                        className="flex flex-col gap-2.5 rounded-card border border-border-default bg-surface p-4"
                      >
                        <div className="text-[14px] font-extrabold text-ink">{entry.title}</div>
                        <p className="flex-1 text-[12px] leading-relaxed text-muted">{entry.description}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Button
                            variant="primarySmall"
                            className="inline-flex w-auto items-center gap-1.5 px-3.5 py-2 text-[12.5px]"
                            // Only this button reacts. Disabling every button
                            // while one downloaded made it look as though the
                            // whole set had been triggered.
                            disabled={blocked || busyKey === `${entry.kind}:excel`}
                            title={blocked ? "Choose an employee above first." : undefined}
                            onClick={() => void run(entry, "excel")}
                          >
                            <Icon name="table_view" size={15} />
                            {busyKey === `${entry.kind}:excel` ? "Preparing…" : "Excel"}
                          </Button>
                          <Button
                            variant="secondary"
                            className="inline-flex w-auto items-center gap-1.5 px-3.5 py-2 text-[12.5px]"
                            disabled={blocked || busyKey === `${entry.kind}:pdf`}
                            title={blocked ? "Choose an employee above first." : undefined}
                            onClick={() => void run(entry, "pdf")}
                          >
                            <Icon name="picture_as_pdf" size={15} />
                            {busyKey === `${entry.kind}:pdf` ? "Preparing…" : "PDF"}
                          </Button>
                        </div>
                        {blocked && (
                          <span className="text-[11px] text-subtle">Choose an employee above to enable this.</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))
        )}
      </Card>

      {/* ── On-screen summary ───────────────────────────────────────────────── */}
      {summary.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !data ? (
        <Card>
          <EmptyState message="No payroll recorded yet." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={`Gross · FY ${data.financial_year}`} icon="payments" value={compactRupees(data.totals.gross)} />
            <StatCard label="Deductions" icon="remove_circle" value={compactRupees(data.totals.deductions)} />
            <StatCard label="Net paid" icon="account_balance_wallet" value={compactRupees(data.totals.net)} />
            <StatCard label="Payslips" icon="receipt_long" value={data.totals.payslips} />
          </div>

          <Card className="flex flex-col gap-3 p-[18px_20px]">
            <div>
              <h2 className="text-[17px] font-extrabold text-ink">Monthly payroll register</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                A month shows as pending until every payslip in it is processed.
              </p>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={monthColumns}
                data={data.monthly}
                rowKey={(r) => `${r.year}-${r.month}`}
                emptyMessage="No payroll recorded in this financial year."
              />
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-[18px_20px]">
            <div>
              <h2 className="text-[17px] font-extrabold text-ink">Department-wise cost</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Non-teaching staff have no department on their record, so they group together at the end.
              </p>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={deptColumns}
                data={data.by_department}
                rowKey={(r) => String(r.department_id ?? "unassigned")}
                emptyMessage="No department breakdown available."
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
