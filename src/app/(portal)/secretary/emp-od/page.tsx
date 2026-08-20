"use client";

import { useState } from "react";
import { stTone } from "@/modules/secretary/helpers";
import { useMyOds, useApplyOd, useWithdrawOd } from "@/modules/secretary/api/selfService";

// Pixel-exact layout port of the `isEmpOd` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 889-941.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// `faculty_od_requests` table via the new Secretary self-service branch
// (keyed by the real `staff_user_id` column instead of faculty_id).
// Honest gaps: no od_type/periods-affected/class-adjustment/invitation
// columns exist — dropped, real columns are only from_date/to_date/place/
// purpose. No HoD exists for a Secretary account, so this goes straight to
// the HR Payroll stage.

const labelSx = { display: "block", fontSize: 12.2, fontWeight: 600, color: "#1e3a8a", marginBottom: 8 } as const;
const inputSx = { width: "100%", height: 46, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 13.1, color: "#0f172a", background: "#ffffff", boxSizing: "border-box" } as const;

function overallLabel(s: { overall_status: string }) {
  if (s.overall_status === "approved") return "APPROVED";
  if (s.overall_status === "rejected") return "REJECTED";
  return "PENDING";
}

export default function SecretaryEmpOdPage() {
  const [tab, setTab] = useState<"Apply" | "History">("Apply");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [place, setPlace] = useState("");
  const [purpose, setPurpose] = useState("");
  const [toast, setToast] = useState("");

  const { data: ods, isLoading, error } = useMyOds();
  const applyMutation = useApplyOd();
  const withdrawMutation = useWithdrawOd();

  async function onWithdraw(id: number) {
    try {
      await withdrawMutation.mutateAsync(id);
      flash("OD request withdrawn.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not withdraw — it may already be decided.");
    }
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function submit() {
    if (!fromDate || !toDate) {
      flash("Pick both a from and to date.");
      return;
    }
    try {
      await applyMutation.mutateAsync({ from_date: fromDate, to_date: toDate, place: place || undefined, purpose: purpose || undefined });
      setFromDate(""); setToDate(""); setPlace(""); setPurpose("");
      flash("OD request submitted — routed straight to HR Payroll.");
      setTab("History");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit the OD request.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Staff OD</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Apply for on-duty and track your applications</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", border: "1px solid #e5e9f2", borderRadius: 12, padding: 4 }}>
          {(["Apply", "History"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ border: 0, background: tab === t ? "#ffffff" : "transparent", color: tab === t ? "#1d4ed8" : "#64748b", fontSize: 13.1, fontWeight: tab === t ? 700 : 500, borderRadius: 9, padding: "12px 30px", whiteSpace: "nowrap", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "Apply" && (
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            <div>
              <label style={labelSx}>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputSx} />
            </div>
            <div>
              <label style={labelSx}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputSx} />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={labelSx}>Purpose</label>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. ICACCS 2026 paper presentation" style={inputSx} />
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={labelSx}>Place</label>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. PSG College of Technology, Coimbatore" style={inputSx} />
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <button onClick={submit} disabled={applyMutation.isPending} style={{ width: "100%", height: 52, border: 0, borderRadius: 12, background: "#1d4ed8", color: "#ffffff", fontSize: 14.8, fontWeight: 700, cursor: "pointer", opacity: applyMutation.isPending ? 0.7 : 1 }}>
              {applyMutation.isPending ? "Submitting…" : "Submit OD Request"}
            </button>
          </div>
        </div>
      )}

      {tab === "History" && (
        <div style={{ display: "grid", gap: 18 }}>
          {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading…</div>}
          {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load OD history."}</div>}
          {(ods ?? []).map((r) => {
            const st = overallLabel(r);
            const { stBg, stFg } = stTone(st);
            return (
              <div key={r.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ fontSize: 11.7, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>OD-{r.id}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: stBg, color: stFg }}>{st}</span>
                </div>
                <div style={{ fontSize: 16.5, fontWeight: 700, marginTop: 14 }}>{r.purpose ?? "On-duty request"}</div>
                <div style={{ fontSize: 13.1, color: "#475569", marginTop: 6 }}>{r.from_date.slice(0, 10)} – {r.to_date.slice(0, 10)}</div>
                <div style={{ fontSize: 13.1, color: "#64748b", marginTop: 10 }}>{r.place ?? "—"}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 12.2, color: "#94a3b8" }}>HR Payroll: {r.hr_approval_status}</span>
                  {r.hr_approval_status === "pending" && (
                    <button onClick={() => onWithdraw(r.id)} style={{ border: "1px solid #fecaca", background: "#fef2f7", color: "#b91c1c", fontSize: 11.3, fontWeight: 700, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Withdraw</button>
                  )}
                </div>
              </div>
            );
          })}
          {!isLoading && !error && (ods ?? []).length === 0 && (
            <div style={{ padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No OD requests yet.</div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
