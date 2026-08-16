"use client";

import { useState } from "react";
import { stTone } from "@/modules/secretary/helpers";
import { useMyPayslips, useRequestPayslip, useWithdrawPayslip } from "@/modules/secretary/api/selfService";

// Pixel-exact layout port of the `isEmpPayslip` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 992-1037.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// `payslip_requests` table via the new Secretary self-service branch
// (keyed by the real `staff_user_id` column instead of faculty_id). No
// month-picker/year-picker dropdown values exist as fixed lists on the
// backend — month is a real "YYYY-MM" string; the 5 fixed purpose options
// aren't a real enum either (purpose is free text) — kept as a text field.

const thSx = { fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" as const, color: "#94a3b8" };
const labelSx = { display: "block", fontSize: 12.2, fontWeight: 600, color: "#1e3a8a", marginBottom: 8 } as const;
const inputSx = { width: "100%", height: 46, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 13.1, color: "#0f172a", background: "#ffffff", boxSizing: "border-box" } as const;

export default function SecretaryEmpPayslipPage() {
  const today = new Date();
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [purpose, setPurpose] = useState("");
  const [toast, setToast] = useState("");

  const { data: payslips, isLoading, error } = useMyPayslips();
  const requestMutation = useRequestPayslip();
  const withdrawMutation = useWithdrawPayslip();

  async function onWithdraw(id: number) {
    try {
      await withdrawMutation.mutateAsync(id);
      flash("Payslip request withdrawn.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not withdraw — it may already be processed.");
    }
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function submit() {
    if (!month) {
      flash("Pick a month.");
      return;
    }
    try {
      await requestMutation.mutateAsync({ month, purpose: purpose || undefined });
      setPurpose("");
      flash("Payslip request raised with the HR office.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not raise the payslip request.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Payslip Request</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Request a payslip copy and view earlier requests</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginBottom: 18 }}>New payslip request</div>
          <div>
            <label style={labelSx}>Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputSx} />
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={labelSx}>Purpose</label>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Bank loan documentation" style={inputSx} />
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={submit} disabled={requestMutation.isPending} style={{ width: "100%", height: 52, border: 0, borderRadius: 12, background: "#1d4ed8", color: "#ffffff", fontSize: 14.8, fontWeight: 700, cursor: "pointer", opacity: requestMutation.isPending ? 0.7 : 1 }}>
              {requestMutation.isPending ? "Submitting…" : "Request Payslip"}
            </button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginBottom: 14 }}>Request history</div>
          {isLoading && <div style={{ padding: 30, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading…</div>}
          {error && <div style={{ padding: 30, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load payslip history."}</div>}
          {!isLoading && !error && (
            <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 0.9fr 0.7fr", gap: 12, padding: "16px 20px", borderBottom: "1px solid #eef2f7" }}>
                <span style={thSx}>Period</span><span style={thSx}>Purpose</span><span style={thSx}>Requested</span><span style={thSx}>Status</span><span style={thSx} />
              </div>
              {(payslips ?? []).map((r) => {
                const { stBg, stFg } = stTone(r.status.toUpperCase());
                return (
                  <div key={r.id} data-sec-row="" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 0.9fr 0.7fr", gap: 12, alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #f5f7fa" }}>
                    <span style={{ fontSize: 12.6, fontWeight: 700 }}>{r.month}</span>
                    <span style={{ fontSize: 12.6, color: "#475569" }}>{r.purpose ?? "—"}</span>
                    <span style={{ fontSize: 12.2, color: "#64748b" }}>{r.requested_at.slice(0, 10)}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: stBg, color: stFg, justifySelf: "start" }}>{r.status.toUpperCase()}</span>
                    {r.status === "pending" ? (
                      <button onClick={() => onWithdraw(r.id)} style={{ justifySelf: "start", border: "1px solid #fecaca", background: "#fef2f7", color: "#b91c1c", fontSize: 10.8, fontWeight: 700, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>Withdraw</button>
                    ) : <span />}
                  </div>
                );
              })}
              {(payslips ?? []).length === 0 && (
                <div style={{ padding: 30, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No payslip requests yet.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
