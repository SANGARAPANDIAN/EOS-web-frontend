"use client";

import { useState } from "react";
import { stTone } from "@/modules/secretary/helpers";
import { useMyLeaves, useApplyLeave, useWithdrawLeave } from "@/modules/secretary/api/selfService";

// Pixel-exact layout port of the `isEmpLeave` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 814-887.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// `faculty_leaves` table via the new Secretary self-service branch added
// this session (skips the faculty-row lookup, keyed by the real
// `staff_user_id` column instead of faculty_id). Honest gaps: no
// leave_type/alternate-arrangement/station-leave/medical-certificate
// columns exist on this table — dropped from the composer, not faked.
// Since a Secretary has no HoD to review their request, it goes straight
// to the HR Payroll stage (same precedent as an HoD's own leave).

const labelSx = { display: "block", fontSize: 12.2, fontWeight: 600, color: "#1e3a8a", marginBottom: 8 } as const;
const inputSx = { width: "100%", height: 46, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 13.1, color: "#0f172a", background: "#ffffff", boxSizing: "border-box" } as const;

function overallLabel(s: { hod_approval_status: string; hr_approval_status: string; overall_status: string }) {
  if (s.overall_status === "approved") return "APPROVED";
  if (s.overall_status === "rejected") return "REJECTED";
  return "PENDING";
}

export default function SecretaryEmpLeavePage() {
  const [tab, setTab] = useState<"Apply" | "History">("Apply");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");

  const { data: leaves, isLoading, error } = useMyLeaves();
  const applyMutation = useApplyLeave();
  const withdrawMutation = useWithdrawLeave();

  async function onWithdraw(id: number) {
    try {
      await withdrawMutation.mutateAsync(id);
      flash("Leave request withdrawn.");
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
      await applyMutation.mutateAsync({ from_date: fromDate, to_date: toDate, reason: reason || undefined });
      setFromDate(""); setToDate(""); setReason("");
      flash("Leave request submitted — routed straight to HR Payroll.");
      setTab("History");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit the leave request.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Staff Leave</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>No HoD exists for a Secretary account — requests go straight to HR Payroll</p>
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
            <label style={labelSx}>Reason ({reason.length}/200)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} placeholder="Describe the reason for your leave" style={{ width: "100%", minHeight: 108, border: "1px solid #e5e9f2", borderRadius: 10, padding: "12px 14px", fontSize: 13.1, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <button onClick={submit} disabled={applyMutation.isPending} style={{ width: "100%", height: 52, border: 0, borderRadius: 12, background: "#1d4ed8", color: "#ffffff", fontSize: 14.8, fontWeight: 700, cursor: "pointer", opacity: applyMutation.isPending ? 0.7 : 1 }}>
              {applyMutation.isPending ? "Submitting…" : "Submit Leave Request"}
            </button>
          </div>
        </div>
      )}

      {tab === "History" && (
        <div style={{ display: "grid", gap: 18 }}>
          {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading…</div>}
          {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load leave history."}</div>}
          {(leaves ?? []).map((r) => {
            const st = overallLabel(r);
            const { stBg, stFg } = stTone(st);
            return (
              <div key={r.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ fontSize: 11.7, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>LVE-{r.id}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: stBg, color: stFg }}>{st}</span>
                </div>
                <div style={{ fontSize: 16.5, fontWeight: 700, marginTop: 14 }}>{r.from_date.slice(0, 10)} – {r.to_date.slice(0, 10)}</div>
                <div style={{ fontSize: 13.1, color: "#64748b", marginTop: 10 }}>{r.reason ?? "No reason given"}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 12.2, color: "#94a3b8" }}>HR Payroll: {r.hr_approval_status}</span>
                  {r.hr_approval_status === "pending" && (
                    <button onClick={() => onWithdraw(r.id)} style={{ border: "1px solid #fecaca", background: "#fef2f7", color: "#b91c1c", fontSize: 11.3, fontWeight: 700, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Withdraw</button>
                  )}
                </div>
              </div>
            );
          })}
          {!isLoading && !error && (leaves ?? []).length === 0 && (
            <div style={{ padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No leave requests yet.</div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
