"use client";

import { Card, Badge, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import {
  useHigherEducationReports,
  type ProgressionRow,
  type DepartmentSummaryRow,
  type CountryMobilityRow,
  type StandingReturn,
  type StandingReturnStatus,
} from "@/modules/higher-education/api/reports";

/** Matches the Transport dashboard/routes hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

const STATUS_LABEL: Record<StandingReturnStatus, string> = {
  filed: "Filed",
  drafting: "Drafting",
  in_review: "In review",
  not_started: "Not started",
};

const STATUS_TONE: Record<StandingReturnStatus, BadgeTone> = {
  filed: "accent",
  drafting: "accentDark",
  in_review: "accentDark",
  not_started: "neutral",
};

function formatRupees(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HigherEducationReportsPage() {
  const reports = useHigherEducationReports();
  const data = reports.data;
  const isLoading = reports.isLoading;

  const progressionColumns: DataTableColumn<ProgressionRow>[] = [
    { key: "batch", header: "Cycle", render: (row) => <span className="font-bold text-ink">{row.batch}</span> },
    { key: "aspirants", header: "Aspirants", align: "right", render: (row) => <span className="font-mono text-ink">{row.aspirants}</span> },
    { key: "admits", header: "Admits", align: "right", render: (row) => <span className="font-mono text-body">{row.admits}</span> },
    { key: "abroad", header: "Abroad", align: "right", render: (row) => <span className="font-mono text-body">{row.abroad}</span> },
    { key: "funded", header: "Funded", align: "right", render: (row) => <span className="font-mono text-body">{row.funded}</span> },
    { key: "value", header: "Value", align: "right", render: (row) => <span className="font-bold text-primary">{row.totalValue > 0 ? formatRupees(row.totalValue) : "—"}</span> },
    { key: "conv", header: "Conversion", align: "right", render: (row) => <span className="font-bold text-primary">{row.conversionPercent}%</span> },
  ];

  function exportProgression() {
    if (!data) return;
    downloadCsv(
      "higher-education-progression.csv",
      ["Cycle", "Aspirants", "Admits", "Abroad", "Funded", "Value", "Conversion %"],
      data.progression.map((r) => [r.batch, r.aspirants, r.admits, r.abroad, r.funded, r.totalValue, r.conversionPercent]),
    );
  }

  function exportDepartmentSummary() {
    if (!data) return;
    downloadCsv(
      "higher-education-department-summary.csv",
      ["Department", "Aspirants", "Admits", "Abroad", "Funded", "Value", "Conversion %"],
      data.departmentSummary.map((r: DepartmentSummaryRow) => [r.department, r.aspirants, r.admits, r.abroad, r.funded, r.totalValue, r.conversionPercent]),
    );
  }

  function exportCountryMobility() {
    if (!data) return;
    downloadCsv(
      "higher-education-country-mobility.csv",
      ["Country", "Aspirants", "Admits", "Funded", "Value", "Conversion %"],
      data.countryMobility.map((r: CountryMobilityRow) => [r.country, r.aspirants, r.admits, r.funded, r.totalValue, r.conversionPercent]),
    );
  }

  function exportStandingReturns() {
    if (!data) return;
    downloadCsv(
      "higher-education-standing-returns.csv",
      ["Title", "Detail", "Status"],
      data.standingReturns.map((r: StandingReturn) => [r.title, r.meta ?? "", STATUS_LABEL[r.status]]),
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Reports & analytics</h1>
        <p className="mt-1 text-[13px] text-muted">Cycle comparisons and the returns the cell files for NAAC, NBA and the management review.</p>
      </div>

      <Card className={`overflow-hidden p-0 ${HOVERABLE}`}>
        <div className="p-[18px_20px] pb-3">
          <h2 className="text-[17px] font-extrabold text-ink">Progression by batch</h2>
        </div>
        <DataTable
          columns={progressionColumns}
          data={data?.progression ?? []}
          rowKey={(row) => row.batch}
          emptyMessage={isLoading ? "Loading…" : "No aspirants recorded yet."}
          hoverableRows
        />
      </Card>

      <div className="grid grid-cols-2 gap-4 items-start">
        <Card className={`border-[1.5px] border-primary ${HOVERABLE}`}>
          <h2 className="mb-3.5 text-[17px] font-extrabold text-ink">Standing returns</h2>
          {!data || data.standingReturns.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-subtle">No standing returns recorded yet.</div>
          ) : (
            <div className="flex flex-col">
              {data.standingReturns.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                  <div>
                    <div className="text-[14.5px] font-bold text-ink">{r.title}</div>
                    {r.meta && <div className="text-[12.5px] text-subtle">{r.meta}</div>}
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <h2 className="mb-1.5 text-[17px] font-extrabold text-ink">Export</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-muted">Pull the cycle data as a CSV for accreditation and management use.</p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={exportProgression}
              disabled={!data || data.progression.length === 0}
              className="rounded-[9px] bg-primary px-4 py-2.5 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Progression register · CSV
            </button>
            <button
              type="button"
              onClick={exportDepartmentSummary}
              disabled={!data || data.departmentSummary.length === 0}
              className="rounded-[9px] border border-border-accent px-4 py-2.5 text-[14px] font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Department summary · CSV
            </button>
            <button
              type="button"
              onClick={exportCountryMobility}
              disabled={!data || data.countryMobility.length === 0}
              className="rounded-[9px] border border-border-default px-4 py-2.5 text-[14px] font-bold text-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              Country-wise mobility · CSV
            </button>
            <button
              type="button"
              onClick={exportStandingReturns}
              disabled={!data || data.standingReturns.length === 0}
              className="rounded-[9px] border border-border-default px-4 py-2.5 text-[14px] font-bold text-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              Standing returns · CSV
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
