"use client";

import { useRef, useState } from "react";
import { stTone } from "@/modules/secretary/helpers";
import { useMyHrQueries, useCreateHrQuery, HR_QUERY_CATEGORIES } from "@/modules/advisor/api/hr-queries";
import { useMyHrPayroll } from "@/modules/secretary/api/selfService";

// Pixel-exact port of the `isEmpPayroll` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 943-990
// (row logic lines 3204-3207, `stTone` line 2785).
//
// REAL BACKEND WIRING — was previously 100% fake (hardcoded HR_REQUESTS
// array, "Attach a file"/"Submit Request" buttons only called flash(),
// no backend call of any kind). Now uses the exact same real feature
// Faculty's own payroll screen uses:
//   - POST/GET /me/hr-queries (HrQueriesController — real ticket+upload
//     feature, was Faculty-only, now also allows ROLES.SECRETARY) via the
//     shared `advisor/api/hr-queries.ts` hooks — reused as-is, it's
//     generic, not advisor-specific.
//   - GET /me/hr-payroll (HrPayrollController — real salary_payments rows;
//     backend now resolves Secretary's own records via the real
//     non_teaching_staff table the same way it already resolves Faculty
//     via the faculty table).

const labelSx = { display: "block", fontSize: 12.2, fontWeight: 600, color: "#1e3a8a", marginBottom: 8 } as const;
const inputSx = { width: "100%", height: 46, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 13.1, color: "#0f172a", background: "#ffffff", boxSizing: "border-box" } as const;

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
}
function payrollTone(status: string) {
  if (status === "processed") return { bg: "#eef4ff", fg: "#1d4ed8" };
  if (status === "hold") return { bg: "#fef2f2", fg: "#dc2626" };
  return { bg: "#f1f5f9", fg: "#475569" };
}

export default function SecretaryEmpPayrollPage() {
  const [toast, setToast] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queries = useMyHrQueries();
  const create = useCreateHrQuery();
  const payroll = useMyHrPayroll();
  const payrollRows = payroll.data?.data ?? [];

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function submit() {
    if (!category || !subject.trim()) {
      flash("Pick a category and enter a subject before submitting.");
      return;
    }
    create.mutate(
      { category, subject: subject.trim(), description: description.trim() || undefined, file: file ?? undefined },
      {
        onSuccess: () => {
          setCategory(""); setSubject(""); setDescription(""); setFile(null);
          flash("HR request submitted · you will be notified.");
        },
        onError: (err) => flash(err instanceof Error ? err.message : "Could not submit the request."),
      },
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>HR Payroll</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Payroll &amp; HR queries</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 24 }}>
          <div>
            <label style={labelSx}>Request Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputSx}>
              <option value="">Select a category</option>
              {HR_QUERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={labelSx}>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 200))} placeholder="e.g. Revised PF contribution query" style={inputSx} />
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={labelSx}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your request in detail" style={{ width: "100%", minHeight: 108, border: "1px solid #e5e9f2", borderRadius: 10, padding: "12px 14px", fontSize: 13.1, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span onClick={() => fileInputRef.current?.click()} style={{ display: "block", width: "100%", height: 52, border: "1px dashed #cbd5e1", borderRadius: 12, background: "#ffffff", color: "#1d4ed8", fontSize: 13.5, fontWeight: 700, cursor: "pointer", textAlign: "center", lineHeight: "52px" }}>
              {file ? `📎 ${file.name}` : "Attach a file (optional)"}
            </span>
            <button onClick={submit} disabled={create.isPending} style={{ width: "100%", height: 52, border: 0, borderRadius: 12, background: "#1d4ed8", color: "#ffffff", fontSize: 14.8, fontWeight: 700, cursor: "pointer", opacity: create.isPending ? 0.7 : 1 }}>{create.isPending ? "Submitting…" : "Submit Request"}</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginBottom: 14 }}>Request status</div>
          <div style={{ display: "grid", gap: 18 }}>
            {(queries.data ?? []).map((r) => {
              const { stBg, stFg } = stTone(r.status.replace("_", " ").toUpperCase());
              return (
                <div key={r.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontSize: 11.7, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>{r.ticket_no}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: stBg, color: stFg, border: "1px solid #dbe6ff" }}>{r.status.replace("_", " ").toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 15.7, fontWeight: 700, marginTop: 12 }}>{r.subject}</div>
                  <div style={{ fontSize: 12.6, color: "#64748b", marginTop: 4, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>{r.category}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
                    <div>
                      <span style={{ display: "block", width: 10, height: 10, borderRadius: 999, background: "#1d4ed8" }} />
                      <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginTop: 10 }}>SUBMITTED</div>
                      <div style={{ fontSize: 12.6, fontWeight: 600, color: "#334155", marginTop: 4 }}>{fmtDate(r.created_at)}</div>
                    </div>
                    <div>
                      <span style={{ display: "block", width: 10, height: 10, borderRadius: 999, background: r.assigned_to_name ? "#1d4ed8" : "#cbd5e1" }} />
                      <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginTop: 10 }}>HR ASSIGNED</div>
                      <div style={{ fontSize: 12.6, fontWeight: 600, color: "#334155", marginTop: 4 }}>{r.assigned_to_name ?? "Awaiting"}</div>
                    </div>
                    <div>
                      <span style={{ display: "block", width: 10, height: 10, borderRadius: 999, background: r.resolved_at ? "#1d4ed8" : "#cbd5e1" }} />
                      <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginTop: 10 }}>RESOLUTION</div>
                      <div style={{ fontSize: 12.6, fontWeight: 600, color: "#334155", marginTop: 4 }}>{r.resolved_at ? fmtDate(r.resolved_at) : "Awaiting"}</div>
                    </div>
                  </div>
                  {r.file_url && (
                    <a href={r.file_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 12, fontSize: 11.7, fontWeight: 700, color: "#1d4ed8" }}>View attachment →</a>
                  )}
                </div>
              );
            })}
            {(queries.data ?? []).length === 0 && !queries.isLoading && (
              <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 40, textAlign: "center", color: "#94a3b8", fontWeight: 600, fontSize: 13.1 }}>No requests submitted yet.</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <div style={{ fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", marginBottom: 14 }}>Salary records</div>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr 1fr 1fr", padding: "15px 22px", borderBottom: "1px solid #eef2f7", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>
            <span>MONTH</span><span>GROSS</span><span>DEDUCTIONS</span><span>NET</span><span>PAID ON</span><span>STATUS</span>
          </div>
          {payrollRows.map((r) => {
            const t = payrollTone(r.status);
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr 1fr 1fr", padding: "14px 22px", borderBottom: "1px solid #f5f7fa", alignItems: "center" }}>
                <span style={{ fontSize: 13.1, fontWeight: 700 }}>{r.month}</span>
                <span style={{ fontSize: 12.6, fontWeight: 600, color: "#475569" }}>₹{r.gross_amount.toLocaleString("en-IN")}</span>
                <span style={{ fontSize: 12.2, fontWeight: 600, color: "#dc2626" }}>
                  {r.deductions_amount ? `₹${r.deductions_amount.toLocaleString("en-IN")}` : "—"}
                  {r.lop_days ? ` · ${r.lop_days} LOP` : ""}
                </span>
                <span style={{ fontSize: 12.6, fontWeight: 700, color: "#1d4ed8" }}>₹{r.net_amount.toLocaleString("en-IN")}</span>
                <span style={{ fontSize: 12.2, fontWeight: 600, color: "#64748b" }}>{r.paid_at ? fmtDate(r.paid_at) : "—"}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "6px 12px", justifySelf: "start", background: t.bg, color: t.fg }}>{r.status.toUpperCase()}</span>
              </div>
            );
          })}
          {payrollRows.length === 0 && !payroll.isLoading && (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#94a3b8", fontWeight: 600, fontSize: 13.1 }}>No payroll records yet.</div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
