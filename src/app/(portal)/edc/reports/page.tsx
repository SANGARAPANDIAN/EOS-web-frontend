"use client";

import { useState } from "react";
import { useEdcReportStats, useEdcReportLibrary, useGenerateVentureReport } from "@/modules/edc/api/reports";
import { pillSx, barSx } from "@/modules/edc/genericPage";

// Real backend connection — GET /me/edc-reports/stats + /library,
// GET /me/edc-reports/venture-table (real Excel/PDF export), added this
// session. Every KPI is computed live from real venture/incubation/idea
// data. The design wanted AICTE/NIRF/IIC-scheme-specific figures — no such
// concept exists anywhere in the schema, so this reports the real
// underlying counts instead of inventing scheme-specific numbers.

function statusTone(status: string) {
  if (status === "Verified") return pillSx("green");
  if (status === "Pending") return pillSx("amber");
  return pillSx("blue");
}

const inputSx = { height: 40, padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 9, background: "#fff", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", outline: "none", width: "100%" } as const;

export default function EdcReportsPage() {
  const stats = useEdcReportStats();
  const library = useEdcReportLibrary();
  const generate = useGenerateVentureReport();
  const [modalOpen, setModalOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const maxDept = Math.max(1, ...(stats.data?.department_breakdown.map((d) => d.count) ?? [1]));

  function generateAndLog(format: "excel" | "pdf") {
    if (!periodLabel.trim()) {
      setError("Enter a period label (e.g. \"2026 Odd Semester\").");
      return;
    }
    setError(null);
    generate.mutate({ format, periodLabel: periodLabel.trim() }, { onSuccess: () => setModalOpen(false) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Reports</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Institution-wide EDC activity report, exportable for AICTE/NIRF/IIC returns.</p>
        </div>
        <div data-edc-btn-primary="" onClick={() => setModalOpen(true)} style={{ padding: "12px 20px", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Generate Report
        </div>
      </div>

      {stats.isLoading && <div style={{ color: "#94A3B8", fontSize: 14 }}>Loading…</div>}
      {stats.isError && <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14 }}>{stats.error instanceof Error ? stats.error.message : "Failed to load report stats."}</div>}

      {stats.data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
            <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Total ventures</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{stats.data.total_ventures}</div>
            </div>
            <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Idea → venture conversion</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{stats.data.idea_conversion_rate_pct}%</div>
            </div>
            <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Departments active</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{stats.data.departments_active}</div>
            </div>
            <div data-edc-lift="" style={{ background: "#EFF6FF", border: "1px solid #CFE0F7", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, color: "#3B6FD4", fontWeight: 500 }}>Monthly revenue reported</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>₹{stats.data.monthly_revenue_reported.toLocaleString("en-IN")}</div>
            </div>
          </div>

          <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "22px 24px" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Department participation</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#7B8AA0" }}>Real ventures registered per department.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {stats.data.department_breakdown.length === 0 && <div style={{ fontSize: 13, color: "#94A3B8" }}>No ventures registered yet.</div>}
              {stats.data.department_breakdown.map((d) => (
                <div key={d.department} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>{d.department}</span>
                    <span style={{ fontWeight: 700 }}>{d.count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "#E9EEF6" }}>
                    <div style={barSx(Math.round((d.count / maxDept) * 100))} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF2F7", fontSize: 15, fontWeight: 700 }}>Report Library</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr 0.8fr", gap: 16, padding: "11px 22px", background: "#fff", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <span>REPORT</span>
          <span>PERIOD</span>
          <span>PREPARED BY</span>
          <span>GENERATED</span>
          <span style={{ textAlign: "right" }}>STATUS</span>
        </div>
        {library.isLoading && <div style={{ padding: "36px 22px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Loading…</div>}
        {library.data?.length === 0 && !library.isLoading && (
          <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No reports generated yet.</div>
        )}
        {library.data?.map((r) => (
          <div key={r.id} data-edc-row="" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr 0.8fr", gap: 16, alignItems: "center", padding: "13px 22px", borderBottom: "1px solid #EEF2F7" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{r.report_name}</span>
            <span style={{ fontSize: 13, color: "#334155" }}>{r.period_label}</span>
            <span style={{ fontSize: 13, color: "#475569" }}>{r.prepared_by_email ?? "—"}</span>
            <span style={{ fontSize: 12.5, color: "#64748B" }}>{new Date(r.generated_at).toLocaleDateString()}</span>
            <span style={{ textAlign: "right" }}><span style={statusTone(r.status)}>{r.status}</span></span>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 26, width: 420, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Generate Report</div>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Exports every real venture as an Excel or PDF table and logs it in the Report Library.</p>
            {error && <div style={{ padding: "9px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>PERIOD</label>
              <input style={inputSx} value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="e.g. 2026 Odd Semester" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div onClick={() => generateAndLog("excel")} data-edc-row="" style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                {generate.isPending ? "Generating…" : "Export Excel"}
              </div>
              <div onClick={() => generateAndLog("pdf")} data-edc-btn-primary="" style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, background: "#1D4ED8", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                {generate.isPending ? "Generating…" : "Export PDF"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
