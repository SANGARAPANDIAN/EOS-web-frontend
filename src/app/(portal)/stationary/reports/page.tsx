"use client";

import { useState } from "react";
import { PageHeader, Button, Card, KpiCard, EmptyState, Input } from "@/modules/admin/components/ui";
import { useUsageByDepartment, useRevenueReport } from "@/modules/stationary/api/reports";

// Ported from "Stationery Portal.dc.html"'s Reports page: "Usage by
// Department" tab (usageStats + usageRows, lines 330-354) and "Revenue /
// Payments" tab (revStats + payments + modes, lines 356-401). Both fetch
// real month-to-date data from GET /stationary-requests/reports/*.

type Tab = "usage" | "revenue";

const MODE_LABEL: Record<string, string> = {
  online: "Online (Razorpay)",
  upi: "UPI",
  cash: "Cash",
  internal_voucher: "Internal voucher",
};

function formatRupees(n: number): string {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatRangeLabel(start: string, end: string): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StationaryReportsPage() {
  const [tab, setTab] = useState<Tab>("usage");
  // Both empty = month-to-date (the backend's own default) - set here only
  // to scope a specific window, which then affects the on-screen report AND
  // whatever gets exported, same as this page already behaved before dates
  // were pickable (just month-to-date, un-adjustable).
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const range = fromDate && toDate ? { from: fromDate, to: toDate } : undefined;
  const { data: usage, isLoading: usageLoading } = useUsageByDepartment(range);
  const { data: revenue, isLoading: revenueLoading } = useRevenueReport(range);

  const maxPages = Math.max(1, ...(usage?.departments.map((d) => d.pages) ?? [1]));
  // "unspecified" is only a real mode for rows created before payment_mode
  // existed (see stationary.service.ts) — not a genuine collection channel,
  // so it's excluded from the breakdown entirely rather than shown as one.
  const modeRows = (revenue?.by_mode ?? []).filter((m) => m.mode !== "unspecified");
  const maxModeAmount = Math.max(1, ...modeRows.map((m) => m.amount));

  function handleExport() {
    if (tab === "usage" && usage) {
      exportCsv("stationary-usage-by-department.csv", [
        ["Department", "Jobs", "Pages", "Amount"],
        ...usage.departments.map((d) => [d.department, d.jobs, d.pages, d.amount]),
      ]);
    } else if (revenue) {
      exportCsv("stationary-revenue.csv", [
        ["Date", "Paid by", "Mode", "Jobs", "Amount"],
        ...revenue.recent_payments.map((p) => [
          p.date,
          p.who,
          p.mode === "unspecified" ? "—" : (MODE_LABEL[p.mode] ?? p.mode),
          p.jobs,
          p.amount,
        ]),
      ]);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        description={
          tab === "usage" && usage
            ? `Pages printed this month · ${formatRangeLabel(usage.range.start, usage.range.end)}`
            : revenue
              ? `Collections, pending dues and settlement mode · ${formatRangeLabel(revenue.range.start, revenue.range.end)}`
              : undefined
        }
        actions={
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-admin-muted">From date</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-auto" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-admin-muted">To date</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-auto" />
        </div>
        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="mb-2 text-sm font-semibold text-admin-primary hover:text-admin-primary-dark"
          >
            Reset to month-to-date
          </button>
        )}
      </div>

      <div className="flex gap-7 border-b border-admin-divider">
        {(["usage", "revenue"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 pb-3 text-[15px] font-semibold transition-colors ${
              tab === t ? "border-admin-primary text-admin-primary" : "border-transparent text-admin-muted hover:text-admin-body"
            }`}
          >
            {t === "usage" ? "Usage by Department" : "Revenue / Payments"}
          </button>
        ))}
      </div>

      {tab === "usage" ? (
        <Card hoverable={false} className="flex flex-col gap-6 p-7">
          <p className="text-[15px] font-bold text-admin-ink">Pages printed by department</p>
          {usageLoading ? null : usage && usage.departments.length > 0 ? (
            <div className="flex flex-col gap-5">
              {usage.departments.map((d) => {
                const pct = (d.pages / maxPages) * 100;
                return (
                  <div key={d.department} className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-4">
                      <span className="flex-1 font-semibold text-admin-ink">{d.department}</span>
                      <span className="text-sm text-admin-muted">{d.jobs.toLocaleString("en-IN")} jobs</span>
                      <span className="w-24 text-right font-bold text-admin-ink">{d.pages.toLocaleString("en-IN")}</span>
                      <span className="w-24 text-right text-sm text-admin-muted">{formatRupees(d.amount)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
                      <div className="h-full rounded-admin-pill bg-admin-primary" style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="bar_chart" title="No printed jobs this month yet" />
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <KpiCard
              label="Collected this month"
              value={revenue ? formatRupees(revenue.collected_this_month) : "—"}
              sub={revenue ? formatRangeLabel(revenue.range.start, revenue.range.end) : undefined}
            />
            <KpiCard
              label="Collected today"
              value={revenue ? formatRupees(revenue.collected_today) : "—"}
              sub={revenue ? `${revenue.jobs_today} jobs` : undefined}
            />
            <KpiCard label="Avg. job value" value={revenue ? formatRupees(revenue.avg_job_value) : "—"} sub="across all jobs" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
            <Card hoverable={false} className="overflow-hidden p-0">
              <div className="border-b border-admin-divider px-5 py-4 text-[15px] font-bold text-admin-ink">Recent payments</div>
              {revenueLoading ? null : revenue && revenue.recent_payments.length > 0 ? (
                <div className="flex flex-col">
                  <div className="grid grid-cols-[1fr_1.6fr_1.2fr_0.8fr_1fr] gap-3 border-b border-admin-divider px-5 py-3 text-[11px] font-bold tracking-wide text-admin-muted uppercase">
                    <span>Date</span>
                    <span>Paid by</span>
                    <span>Mode</span>
                    <span>Jobs</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {revenue.recent_payments.map((p, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1.6fr_1.2fr_0.8fr_1fr] items-center gap-3 border-b border-admin-divider px-5 py-3.5 text-sm transition-[transform,box-shadow,background-color] duration-150 last:border-b-0 hover:-translate-y-0.5 hover:bg-admin-tint hover:shadow-admin-row-hover-ring"
                    >
                      <span className="text-admin-muted">{new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                      <span className="font-semibold text-admin-ink">{p.who}</span>
                      <span className="text-admin-muted">{p.mode === "unspecified" ? "—" : (MODE_LABEL[p.mode] ?? p.mode)}</span>
                      <span className="text-admin-muted">{p.jobs} job{p.jobs !== 1 ? "s" : ""}</span>
                      <span className="text-right font-bold text-admin-ink">{formatRupees(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="payments" title="No completed payments this month yet" />
              )}
            </Card>

            <Card hoverable={false} className="flex flex-col gap-5 p-6">
              <p className="text-[15px] font-bold text-admin-ink">Collection by mode</p>
              {revenueLoading ? null : modeRows.length > 0 ? (
                modeRows.map((m) => {
                  const pct = (m.amount / maxModeAmount) * 100;
                  return (
                    <div key={m.mode} className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-3">
                        <span className="flex-1 font-semibold text-admin-ink">{MODE_LABEL[m.mode] ?? m.mode}</span>
                        <span className="text-sm text-admin-muted">{formatRupees(m.amount)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
                        <div className="h-full rounded-admin-pill bg-admin-primary" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState icon="pie_chart" title="No collections this month yet" />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
