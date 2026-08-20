"use client";

import { useState } from "react";
import { useMyPayslipRequests, useCreatePayslipRequest, useDeletePayslipRequest } from "@/modules/advisor/api/employee";

// Backed by GET/POST /me/payslip-requests (PayslipRequestsController). Real
// CreatePayslipRequestDto is just {month: "YYYY-MM", purpose?} — no
// free-text "Remarks" field and no fixed purpose enum exist, so remarks are
// dropped and purpose becomes a free-text input.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Real status enum (ListPayslipRequestQueryDto): 'pending' | 'processed' | 'rejected'.
// A previous version only styled 'issued'/'pending', so 'processed' and
// 'rejected' both silently fell back to the pending (blue) style — fixed to
// cover every real status distinctly.
function pill(status: string | null | undefined) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    processed: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    pending: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
    rejected: { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
  };
  const t = map[status ?? "pending"] ?? map.pending;
  return { padding: "5px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11, fontWeight: 800 } as const;
}

export default function AdvisorPayslipPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [purpose, setPurpose] = useState("");

  const requests = useMyPayslipRequests();
  const create = useCreatePayslipRequest();
  const remove = useDeletePayslipRequest();
  const [formError, setFormError] = useState<string | null>(null);

  function submit() {
    setFormError(null);
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    create.mutate(
      { month: monthStr, purpose: purpose || undefined },
      {
        onSuccess: () => setPurpose(""),
        // Real backend returns 409 if a non-rejected request for this month
        // already exists — was previously swallowed silently (button just
        // reverted with no feedback at all).
        onError: (e) => setFormError(e instanceof Error ? e.message : "Failed to submit payslip request."),
      },
    );
  }

  function withdraw(id: number) {
    if (!confirm("Withdraw this payslip request?")) return;
    remove.mutate(id);
  }

  const rows = requests.data?.data ?? [];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Payslip Request</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>Request a payslip copy and view earlier requests</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: 16, marginTop: 20, alignItems: "start" }}>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>NEW PAYSLIP REQUEST</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18, marginTop: 18 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Month</div>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff" }}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Year</div>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff" }}>
                {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2, now.getFullYear() - 3].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Purpose</div>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value.slice(0, 255))}
              placeholder="e.g. Bank loan"
              style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff" }}
            />
          </div>
          {formError && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
              {formError}
            </div>
          )}
          <div onClick={submit} style={{ marginTop: 20, textAlign: "center", padding: 14, background: create.isPending ? "#93C5FD" : "#1D4ED8", color: "#fff", borderRadius: 10, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>
            {create.isPending ? "Submitting…" : "Submit request"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>REQUEST HISTORY</div>
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 0.9fr 0.8fr 1fr", padding: "15px 22px", borderBottom: "1px solid #EEF1F6", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>
              <div>PERIOD</div>
              <div>PURPOSE</div>
              <div>REQUESTED</div>
              <div>STATUS</div>
              <div></div>
            </div>
            {rows.map((p) => (
              <div key={p.id} data-advisor-lift="" style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 0.9fr 0.8fr 1fr", padding: "15px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center", fontSize: 13.5, fontWeight: 600 }}>
                <div style={{ fontWeight: 700 }}>{p.month}</div>
                <div style={{ color: "#475569" }}>{p.purpose ?? "—"}</div>
                <div style={{ color: "#7C8899", fontSize: 12.5 }}>{new Date(p.requested_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                <div>
                  <span style={pill(p.status)}>{p.status ?? "pending"}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  {p.status === "processed" && p.file_url && (
                    <a href={p.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>
                      Download
                    </a>
                  )}
                  {(p.status ?? "pending") === "pending" && (
                    <span onClick={() => withdraw(p.id)} style={{ fontSize: 12.5, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>
                      Withdraw
                    </span>
                  )}
                </div>
              </div>
            ))}
            {rows.length === 0 && !requests.isLoading && (
              <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No payslip requests yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
