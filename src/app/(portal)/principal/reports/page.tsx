"use client";

import { useState } from "react";
import { usePrincipalReportsSummary, usePrincipalScorecard, downloadScorecard } from "@/modules/principal/api/reports";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { principalColors } from "@/modules/principal/theme";
import { Icon } from "@/components/ui/Icon";

/** June academic-year cutoff — same convention as the backend's PrincipalDashboardService.getPeriodRange('year', ...). */
function currentAcademicYearLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() + 1 >= 6 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

function ExportButton({
  label,
  icon,
  format,
  variant,
}: {
  label: string;
  icon: string;
  format: "excel" | "pdf";
  variant: "outline" | "solid";
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    setDownloading(true);
    try {
      await downloadScorecard(format);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={downloading}
      className="flex h-11 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition-colors disabled:opacity-60"
      style={
        variant === "solid"
          ? { background: principalColors.primary, borderColor: principalColors.primary, color: "#FFFFFF" }
          : { background: principalColors.bg, borderColor: principalColors.border, color: principalColors.body }
      }
    >
      <Icon name={icon} size={18} />
      {downloading ? "Preparing…" : label}
    </button>
  );
}

export default function PrincipalReportsPage() {
  const summary = usePrincipalReportsSummary();
  const scorecard = usePrincipalScorecard();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-[34px] font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
          >
            Reports &amp; Analytics
          </h1>
          <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
            Institution scorecard for AY {currentAcademicYearLabel()}
          </p>
        </div>
        <div className="flex gap-2.5">
          <ExportButton label="Export Excel" icon="table_view" format="excel" variant="outline" />
          <ExportButton label="Export PDF" icon="picture_as_pdf" format="pdf" variant="solid" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <PrincipalStatCard
          label="Mean attendance"
          icon="fact_check"
          loading={summary.isLoading}
          value={summary.data?.mean_attendance.value ?? "—"}
          footer={summary.data?.mean_attendance.detail}
        />
        <PrincipalStatCard
          label="Placement rate"
          icon="work"
          loading={summary.isLoading}
          value={summary.data?.placement_rate.value ?? "—"}
          footer={summary.data?.placement_rate.detail}
        />
        <PrincipalStatCard
          label="Fee recovery"
          icon="payments"
          loading={summary.isLoading}
          value={summary.data?.fee_recovery.value ?? "—"}
          footer={summary.data?.fee_recovery.detail}
        />
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-6 py-[18px]" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Institution scorecard
          </div>
          <p className="mt-1 text-sm" style={{ color: principalColors.textFaint }}>
            This year against last year and the AY target
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                <th className="px-6 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                  METRIC
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                  THIS YEAR
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                  LAST YEAR
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                  TARGET
                </th>
                <th className="px-6 py-2.5 text-right text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                  ATTAINMENT
                </th>
              </tr>
            </thead>
            <tbody>
              {scorecard.isLoading && <PrincipalTableSkeleton columns={5} />}
              {scorecard.data?.rows.map((row) => {
                const attainmentPct = row.attainment.endsWith("%") ? parseFloat(row.attainment) : null;
                return (
                  <tr key={row.metric} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                    <td className="px-6 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {row.metric}
                    </td>
                    <td
                      className="px-3 py-3.5 text-right tabular-nums"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.heading }}
                    >
                      {row.this_year}
                    </td>
                    <td
                      className="px-3 py-3.5 text-right tabular-nums"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint }}
                    >
                      {row.last_year}
                    </td>
                    <td
                      className="px-3 py-3.5 text-right tabular-nums"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint }}
                    >
                      {row.target}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: principalColors.borderLight }}>
                          {attainmentPct != null && (
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.max(0, Math.min(100, attainmentPct))}%`, background: principalColors.primary }}
                            />
                          )}
                        </div>
                        <span
                          className="w-9 text-right tabular-nums"
                          style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint }}
                        >
                          {row.attainment}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
