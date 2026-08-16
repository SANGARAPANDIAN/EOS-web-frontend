"use client";

import { useState } from "react";
import { stTone } from "@/modules/secretary/helpers";

// Pixel-exact port of the `isEmpPayroll` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 943-990
// (row logic lines 3204-3207, `stTone` line 2785). Fake data + local-state
// interactivity (static apply form; request list is read-only).

const HR_CATEGORIES = ["Select a category", "PF / ESI query", "Increment / arrears", "Bank account change", "Form 16 / tax", "Other HR query"];
const HR_REQUESTS = [
  { ref: "HRM-2026-118", title: "Correction in July PF contribution", kind: "PF / ESI query", st: "UNDER REVIEW", steps: [{ k: "SUBMITTED", v: "02 Aug 2026", on: true }, { k: "HR ASSIGNED", v: "Ms. Revathi K", on: true }, { k: "RESOLUTION", v: "Awaiting", on: false }] },
  { ref: "HRM-2026-102", title: "Increment arrears for May–June", kind: "Increment / arrears", st: "RESOLVED", steps: [{ k: "SUBMITTED", v: "12 Jul 2026", on: true }, { k: "HR ASSIGNED", v: "Mr. Senthil V", on: true }, { k: "RESOLUTION", v: "Paid 31 Jul 2026", on: true }] },
  { ref: "HRM-2026-087", title: "Update salary account to HDFC", kind: "Bank account change", st: "RESOLVED", steps: [{ k: "SUBMITTED", v: "20 Jun 2026", on: true }, { k: "HR ASSIGNED", v: "Ms. Revathi K", on: true }, { k: "RESOLUTION", v: "Updated 25 Jun 2026", on: true }] },
];

const labelSx = { display: "block", fontSize: 12.2, fontWeight: 600, color: "#1e3a8a", marginBottom: 8 } as const;
const inputSx = { width: "100%", height: 46, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 13.1, color: "#0f172a", background: "#ffffff", boxSizing: "border-box" } as const;

export default function SecretaryEmpPayrollPage() {
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>HR Payroll</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Payroll &amp; HR queries · EMP-CSE-2214</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 24 }}>
          <div>
            <label style={labelSx}>Request Category</label>
            <select style={inputSx}>{HR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={labelSx}>Subject</label>
            <input placeholder="e.g. Revised PF contribution query" style={inputSx} />
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={labelSx}>Description</label>
            <textarea placeholder="Describe your request in detail" style={{ width: "100%", minHeight: 108, border: "1px solid #e5e9f2", borderRadius: 10, padding: "12px 14px", fontSize: 13.1, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <button onClick={() => flash("File attached.")} style={{ width: "100%", height: 52, border: "1px dashed #cbd5e1", borderRadius: 12, background: "#ffffff", color: "#1d4ed8", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Attach a file (optional)</button>
            <button onClick={() => flash("HR request submitted · you will be notified.")} style={{ width: "100%", height: 52, border: 0, borderRadius: 12, background: "#1d4ed8", color: "#ffffff", fontSize: 14.8, fontWeight: 700, cursor: "pointer" }}>Submit Request</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginBottom: 14 }}>Request status</div>
          <div style={{ display: "grid", gap: 18 }}>
            {HR_REQUESTS.map((r) => {
              const { stBg, stFg } = stTone(r.st);
              return (
                <div key={r.ref} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontSize: 11.7, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>{r.ref}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: stBg, color: stFg, border: "1px solid #dbe6ff" }}>{r.st}</span>
                  </div>
                  <div style={{ fontSize: 15.7, fontWeight: 700, marginTop: 12 }}>{r.title}</div>
                  <div style={{ fontSize: 12.6, color: "#64748b", marginTop: 4, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>{r.kind}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
                    {r.steps.map((p, i) => (
                      <div key={i}>
                        <span style={{ display: "block", width: 10, height: 10, borderRadius: 999, background: p.on ? "#1d4ed8" : "#cbd5e1" }} />
                        <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginTop: 10 }}>{p.k}</div>
                        <div style={{ fontSize: 12.6, fontWeight: 600, color: "#334155", marginTop: 4 }}>{p.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
