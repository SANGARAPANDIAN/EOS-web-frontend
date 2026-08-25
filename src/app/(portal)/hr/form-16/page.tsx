"use client";

import { useState } from "react";
import { Badge, Banner, Card, DataTable, EmptyState, Select, type DataTableColumn } from "@/components/ui";
import { HrFacultyPicker } from "@/modules/hr/components/HrFacultyPicker";
import { usePayrollYears, useAnnualStatement, type AnnualStatementMonth } from "@/modules/hr/api/reports";
import type { HrFaculty } from "@/modules/hr/api/facultyDirectory";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

/**
 * Annual salary statement — the real payroll basis for a Form 16.
 *
 * Deliberately not labelled "Form 16 generated". A statutory Form 16 needs the
 * employer's TAN, the employee's PAN and quarter-wise TDS deposit details, and
 * none of those are recorded anywhere in this system. What *is* recorded — every
 * month's gross, deductions and net, plus the salary component structure — is
 * exactly what a Form 16 is prepared from, so that is what this page produces.
 * Calling it the certificate itself would invite somebody to file it.
 */
export default function HrForm16Page() {
  const years = usePayrollYears();
  const [faculty, setFaculty] = useState<HrFaculty | null>(null);
  const [year, setYear] = useState<number | undefined>(undefined);

  const statement = useAnnualStatement(faculty?.id ?? null, year);
  const data = statement.data;

  const columns: DataTableColumn<AnnualStatementMonth>[] = [
    {
      key: "month",
      header: "Month",
      width: "1fr",
      render: (r) => <span className="font-bold text-ink">{`${MONTH_NAMES[r.month]} ${r.year}`}</span>,
    },
    { key: "gross", header: "Gross", width: "1fr", align: "right", render: (r) => <span className="font-mono text-body">{rupees(r.gross)}</span> },
    { key: "ded", header: "Deductions", width: "1fr", align: "right", render: (r) => <span className="font-mono text-body">{rupees(r.deductions)}</span> },
    { key: "net", header: "Net paid", width: "1fr", align: "right", render: (r) => <span className="font-mono font-bold text-primary">{rupees(r.net)}</span> },
    {
      key: "lop",
      header: "LOP",
      width: "0.8fr",
      align: "right",
      render: (r) => (r.lop_days > 0 ? <span className="font-mono text-danger-fg">{r.lop_days}d</span> : <span className="text-subtle">—</span>),
    },
    {
      key: "status",
      header: "Status",
      width: "0.9fr",
      align: "right",
      render: (r) => <Badge tone={r.status === "processed" ? "accent" : r.status === "hold" ? "danger" : "neutral"}>{r.status}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Annual salary statement</h1>
        <p className="mt-1 text-[13px] text-muted">
          Per-employee salary, deductions and net pay for a financial year — the payroll basis for Form 16.
        </p>
      </div>

      <Banner>
        This is the salary statement a Form 16 is prepared from, not the certificate itself. PAN, employer TAN and
        quarter-wise TDS deposits are not held in this system, so the statutory form cannot be issued from here.
      </Banner>

      <Card className="flex flex-col gap-4 p-[18px_20px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Employee</label>
            <HrFacultyPicker value={faculty} onChange={setFaculty} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Financial year</label>
            <Select
              className="mt-1.5"
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
          </div>
        </div>
      </Card>

      {!faculty ? (
        <Card>
          <EmptyState message="Search for an employee above to see their annual statement." />
        </Card>
      ) : statement.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !data ? (
        <Card>
          <EmptyState message="No payroll recorded for this employee." />
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-[18px_20px]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[19px] font-extrabold text-ink">{data.employee.name}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  {[data.employee.designation, data.employee.department, data.employee.staff_code].filter(Boolean).join(" · ")}
                </div>
                {data.employee.date_of_joining && (
                  <div className="mt-0.5 text-[12px] text-subtle">Joined {data.employee.date_of_joining}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[11.5px] text-muted">Financial year</div>
                <div className="text-[19px] font-extrabold text-primary">{data.financial_year}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-divider pt-3 md:grid-cols-4">
              {[
                { label: "Gross earned", value: rupees(data.totals.gross) },
                { label: "Total deductions", value: rupees(data.totals.deductions) },
                { label: "Net paid", value: rupees(data.totals.net) },
                { label: "Months processed", value: `${data.totals.months_paid} of ${data.totals.months_recorded}` },
              ].map((t) => (
                <div key={t.label} className="rounded-[11px] border border-border-default px-4 py-2.5">
                  <div className="text-[11.5px] text-muted">{t.label}</div>
                  <div className="mt-0.5 text-[17px] font-extrabold text-ink">{t.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-[18px_20px]">
            <h2 className="text-[17px] font-extrabold text-ink">Month-by-month</h2>
            <DataTable columns={columns} data={data.months} rowKey={(r) => `${r.year}-${r.month}`} emptyMessage="No payslips in this year." />
          </Card>

          <Card className="flex flex-col gap-3 p-[18px_20px]">
            <div>
              <h2 className="text-[17px] font-extrabold text-ink">Salary structure</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">Components on record, most recent effective date first.</p>
            </div>
            {data.components.length === 0 ? (
              <EmptyState message="No salary components recorded for this employee." />
            ) : (
              <div className="flex flex-col gap-2">
                {data.components.map((c) => (
                  <div key={`${c.name}-${c.effective_from}`} className="flex items-center justify-between gap-3 rounded-[10px] border border-border-default px-3.5 py-2.5">
                    <div>
                      <div className="text-[13.5px] font-bold text-ink">{c.name}</div>
                      <div className="mt-0.5 text-[11.5px] text-muted">Effective {c.effective_from}</div>
                    </div>
                    <span className="font-mono text-[14px] font-bold text-primary">{rupees(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="text-[11.5px] leading-relaxed text-subtle">{data.disclaimer}</p>
        </>
      )}
    </div>
  );
}
