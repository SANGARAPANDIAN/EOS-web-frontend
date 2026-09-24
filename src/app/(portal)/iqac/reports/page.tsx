"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { HoverDownloadButton } from "@/components/ui/HoverDownloadButton";
import { exportToPdf } from "@/lib/utils/pdf-export";
import { StatTile, FilterSelect } from "@/modules/iqac/components/PageControls";
import { useScorecard, type ScorecardRow } from "@/modules/iqac/api/reports";
import { useDownloadReport, DOWNLOAD_REPORT_DEFS, type DownloadReportKey, type DownloadReportFormat } from "@/modules/iqac/api/reports";
import { useDepartmentsList } from "@/modules/iqac/api/departments";

function formatValue(row: ScorecardRow): string {
  if (row.value == null) return row.note ?? "—";
  return row.unit === "%" ? `${row.value}%` : row.value.toLocaleString("en-IN");
}

export default function IqacReportsPage() {
  const router = useRouter();
  const scorecard = useScorecard();
  const departments = useDepartmentsList();
  const download = useDownloadReport();

  const [reportKey, setReportKey] = useState<DownloadReportKey>("venue-bookings");
  const [format, setFormat] = useState<DownloadReportFormat>("excel");
  const [deptId, setDeptId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hoverScorecard, setHoverScorecard] = useState(false);

  const rows = useMemo(() => scorecard.data?.rows ?? [], [scorecard.data]);
  const realCount = rows.filter((r) => r.value != null).length;

  // No real date dimension on the scorecard (it's a single "this year"
  // snapshot per component, not a time series) — this download is
  // deliberately independent of the "Download reports" section's from/to,
  // which applies only to the real, date-stamped venue-bookings/OD data.
  async function downloadScorecard() {
    await exportToPdf({
      title: "Institution Scorecard",
      subtitle: "Every component across the four Quality domains",
      sections: [
        {
          type: "table",
          columns: [
            { header: "Domain", key: "domain" },
            { header: "Component", key: "name" },
            { header: "This year", key: "value" },
            { header: "Target", key: "target" },
            { header: "Attainment", key: "attainment" },
          ],
          rows: rows.map((r) => ({
            domain: r.domain,
            name: r.name,
            value: formatValue(r),
            target: r.target != null ? `${r.target}${r.unit === "%" ? "%" : ""}` : "—",
            attainment: r.attainment != null ? `${r.attainment}%` : "—",
          })),
        },
      ],
      filename: "institution-scorecard.pdf",
      footerBrand: true,
    });
  }

  const columns = useMemo<DataTableColumn<ScorecardRow>[]>(
    () => [
      { key: "domain", header: "Domain", render: (r) => <span className="text-[12px] font-bold text-muted">{r.domain}</span> },
      { key: "name", header: "Component", render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "value", header: "This year", align: "right", render: (r) => <span className="font-mono text-[13.5px]">{formatValue(r)}</span> },
      { key: "target", header: "Target", align: "right", render: (r) => <span className="font-mono text-[13.5px] text-subtle">{r.target != null ? `${r.target}${r.unit === "%" ? "%" : ""}` : "—"}</span> },
      {
        key: "attainment",
        header: "Attainment",
        align: "right",
        render: (r) => (
          <div className="flex items-center justify-end gap-2.5">
            <div className="h-1.5 w-[80px] overflow-hidden rounded-full bg-surface-tint">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, r.attainment ?? 0)}%` }} />
            </div>
            <span className="w-11 text-right font-mono text-[13px]">{r.attainment != null ? `${r.attainment}%` : "—"}</span>
          </div>
        ),
      },
      {
        key: "open",
        header: "",
        width: "0.6fr",
        render: (r) => (
          <button type="button" onClick={() => router.push(r.path)} className="text-[12px] font-bold text-primary hover:underline">
            Open →
          </button>
        ),
      },
    ],
    [router],
  );

  function handleDownload() {
    download.mutate({
      key: reportKey,
      format,
      filters: { department_id: deptId ? Number(deptId) : undefined, from: from || undefined, to: to || undefined },
    });
  }

  const activeDef = DOWNLOAD_REPORT_DEFS.find((d) => d.key === reportKey)!;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Reports &amp; Analytics</h1>
          <p className="mt-1 text-[13.5px] text-muted">Institution scorecard across every real Quality-domain metric, plus real downloadable reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Institution KPI score" value={scorecard.data?.kpi_score != null ? `${scorecard.data.kpi_score} / 100` : "—"} sub="mean attainment where a target is set" />
        <StatTile label="Components tracked" value={rows.length} sub={`${realCount} with a real this-year value`} />
        <StatTile label="NBA readiness" value={rows.find((r) => r.key === "nba-progress")?.value != null ? `${rows.find((r) => r.key === "nba-progress")!.value}%` : "—"} sub="documentation complete" />
      </div>

      <div
        className="relative rounded-card border border-border-default bg-surface p-0 overflow-hidden"
        onMouseEnter={() => setHoverScorecard(true)}
        onMouseLeave={() => setHoverScorecard(false)}
      >
        <HoverDownloadButton visible={hoverScorecard} onDownload={downloadScorecard} title="Download institution scorecard" />
        <div className="px-5 pb-3.5 pt-5">
          <h2 className="text-[16px] font-extrabold text-ink">Institution scorecard</h2>
          <p className="mt-1 text-[12.5px] text-subtle">Every component across the four Quality domains</p>
        </div>
        <DataTable columns={columns} data={rows} rowKey={(r) => `${r.domain}-${r.key}`} loading={scorecard.isLoading} emptyMessage="No scorecard data available." hoverableRows />
      </div>

      <div className="rounded-card border border-border-default bg-surface p-5">
        <h2 className="text-[16px] font-extrabold text-ink">Download reports</h2>
        <p className="mt-1 text-[12.5px] text-subtle">Real data — venue bookings and on-duty requests, exported as Excel or PDF.</p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FilterSelect
            label="Report"
            value={reportKey}
            onChange={(v) => setReportKey(v as DownloadReportKey)}
            options={DOWNLOAD_REPORT_DEFS.map((d) => ({ value: d.key, label: d.label }))}
          />
          <FilterSelect
            label="Department"
            value={deptId}
            onChange={setDeptId}
            options={[{ value: "", label: "All departments" }, ...(departments.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))]}
          />
          <div className="col-span-2">
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Date range</div>
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { setFrom(""); setTo(""); }} style={{ marginTop: 6 }} />
          </div>
        </div>

        <p className="mt-3 text-[12.5px] text-subtle">{activeDef.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-divider pt-4">
          <div className="flex gap-1 rounded-[10px] bg-surface-tint p-1">
            {(["excel", "pdf"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`h-9 rounded-[8px] px-3.5 text-[12.5px] font-bold transition-colors ${format === f ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
              >
                {f === "excel" ? "Excel" : "PDF"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={download.isPending}
            className="h-10 rounded-[10px] border border-primary-border bg-primary px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {download.isPending ? "Preparing…" : "Download"}
          </button>
          {download.isError && <span className="text-[12.5px] font-semibold text-danger-fg">Could not generate this report.</span>}
        </div>
      </div>
    </div>
  );
}
