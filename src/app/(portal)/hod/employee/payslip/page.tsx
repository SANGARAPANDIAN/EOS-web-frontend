"use client";

import { useState } from "react";
import { Card, Badge, Button, Select, Textarea } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useHodPayslipHistory, useApplyHodPayslip, type HodPayslipHistoryRow } from "@/modules/hod/api/employeePayslip";
import { formatDisplayDate } from "@/lib/utils/date";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const PURPOSES = ["Bank loan", "Income tax filing", "Visa application", "Credit card application", "Other"];

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "processed") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "processed") return "ISSUED";
  if (status === "rejected") return "REJECTED";
  return "PENDING";
}

function periodLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${year}`;
}

export default function HodEmployeePayslipPage() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const history = useHodPayslipHistory();
  const apply = useApplyHodPayslip();

  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(currentYear);
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [remarks, setRemarks] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    await apply.mutateAsync({
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      purpose,
    });
    setSubmitted(true);
    setRemarks("");
  }

  const columns: DataTableColumn<HodPayslipHistoryRow>[] = [
    {
      key: "ref",
      header: "Ref",
      width: "1fr",
      render: (r) => (
        <span className="font-bold text-subtle">PSL-{r.month.slice(0, 4)}-{String(r.id).padStart(3, "0")}</span>
      ),
    },
    { key: "period", header: "Period", width: "1.2fr", render: (r) => <span className="font-extrabold text-ink">{periodLabel(r.month)}</span> },
    { key: "purpose", header: "Purpose", width: "1.4fr", render: (r) => <span>{r.purpose ?? "—"}</span> },
    { key: "requested", header: "Requested", width: "1.1fr", render: (r) => <span className="text-subtle">{formatDisplayDate(r.requested_at)}</span> },
    {
      key: "status",
      header: "Status",
      width: "100px",
      render: (r) => <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {history.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load payslip history — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Payslip Request</h1>
        <p className="mt-1 text-[13px] text-muted">Request a payslip copy and view earlier requests</p>
      </div>

      <div className="grid grid-cols-[1fr_1.5fr] items-start gap-5">
        <Card className="hod-hover-card">
          {submitted && (
            <div className="mb-4 rounded-[10px] bg-accent-50 px-4 py-3 text-[13px] font-bold text-primary">
              Payslip request submitted.
            </div>
          )}
          <div className="mb-4 text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">New Payslip Request</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Month</label>
              <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Year</label>
              <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Purpose</label>
            <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Remarks</label>
            <Textarea
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional detail for the HR team"
            />
          </div>

          <Button variant="primary" className="mt-6" onClick={submit} loading={apply.isPending}>
            Request Payslip
          </Button>
        </Card>

        <div>
          <div className="mb-2 text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Request History</div>
          <DataTable
            columns={columns}
            data={history.data ?? []}
            rowKey={(r) => r.id}
            rowClassName="hod-hover-row"
            loading={history.isLoading}
            emptyMessage={history.isError ? "Couldn't load payslip history." : "No payslip requests yet."}
          />
        </div>
      </div>
    </div>
  );
}
