"use client";

import { useState } from "react";
import { useAppraisalCriteria, useMyAppraisals, useSubmitAppraisal, useWithdrawAppraisal } from "@/modules/secretary/api/selfService";

// Pixel-exact layout port of the `isEmpAppraisal` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1039-1094.
//
// REAL BACKEND WIRING — ZERO fake data, but with an honest, deliberate
// scope limit documented here: `appraisal_criteria` is a real, shared,
// institution-wide reference table, but its actual seeded criteria are
// teaching-specific ("Student Feedback Score", "Journal Publications") —
// forcing a Secretary to self-score against those would be dishonest, not
// "real data". Rather than fabricate Secretary-only criteria or hide the
// screen, this shows the REAL criteria list and lets the Secretary choose
// only the ones that genuinely apply to their own role (e.g.
// "Institutional Contribution" ones) — same real `/appraisal_requests`
// CRUD Faculty use, keyed by the real `staff_user_id` column, going
// straight to HR scoring since no HoD exists to review a Secretary's
// appraisal (same precedent as Leave/OD/Payslip).

const STATUS_LABEL: Record<string, string> = {
  hod_reviewed: "AWAITING HR SCORING",
  hr_scored: "SCORED",
  management_approved: "COMPLETED",
  rejected: "REJECTED",
  submitted: "SUBMITTED",
};

export default function SecretaryEmpAppraisalPage() {
  const [tab, setTab] = useState<"Apply" | "History">("Apply");
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const today = new Date();
  const academicYear = `${today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1}-${(today.getMonth() >= 5 ? today.getFullYear() + 1 : today.getFullYear())}`;

  const { data: criteriaData, isLoading: critLoading } = useAppraisalCriteria();
  const { data: appraisals, isLoading, error } = useMyAppraisals();
  const submitMutation = useSubmitAppraisal();
  const withdrawMutation = useWithdrawAppraisal();

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) {
      flash("Select at least one criterion that applies to your role.");
      return;
    }
    if (!criteriaData?.academic_year) {
      flash("No appraisal cycle is open right now.");
      return;
    }
    try {
      await submitMutation.mutateAsync({
        academic_year: criteriaData.academic_year,
        entries: Array.from(selected).map((criteria_id) => ({ criteria_id })),
      });
      setSelected(new Set());
      flash("Appraisal submitted — routed straight to HR Payroll for scoring.");
      setTab("History");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit the appraisal.");
    }
  }

  async function onWithdraw(id: number) {
    try {
      await withdrawMutation.mutateAsync(id);
      flash("Appraisal request withdrawn.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not withdraw — it may already be scored.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Request Appraisal</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Academic Year {criteriaData?.academic_year ?? academicYear} · choose only the criteria relevant to your role</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", border: "1px solid #e5e9f2", borderRadius: 12, padding: 4 }}>
          {(["Apply", "History"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ border: 0, background: tab === t ? "#ffffff" : "transparent", color: tab === t ? "#1d4ed8" : "#64748b", fontSize: 13.1, fontWeight: tab === t ? 700 : 500, borderRadius: 9, padding: "12px 30px", whiteSpace: "nowrap", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "Apply" && (
        <div>
          {critLoading && <div style={{ padding: 30, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading criteria…</div>}
          <div style={{ display: "grid", gap: 18 }}>
            {(criteriaData?.divisions ?? []).map((d) => (
              <div key={d.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "20px 22px" }}>
                <div style={{ fontSize: 15.7, fontWeight: 700, marginBottom: 12 }}>{d.name}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {d.criteria.map((c) => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.6, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={{ width: 16, height: 16 }} />
                      {c.name} <span style={{ color: "#94a3b8" }}>(max {c.max_score})</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {!critLoading && (criteriaData?.divisions ?? []).length === 0 && (
            <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No appraisal cycle is currently open.</div>
          )}
          <div style={{ marginTop: 22 }}>
            <button onClick={submit} disabled={submitMutation.isPending} style={{ width: "100%", height: 56, border: 0, borderRadius: 12, background: "#1d4ed8", color: "#ffffff", fontSize: 14.8, fontWeight: 700, cursor: "pointer", opacity: submitMutation.isPending ? 0.7 : 1 }}>
              {submitMutation.isPending ? "Submitting…" : "Submit Appraisal Request"}
            </button>
          </div>
        </div>
      )}

      {tab === "History" && (
        <div style={{ display: "grid", gap: 18 }}>
          {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading…</div>}
          {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load appraisal history."}</div>}
          {(appraisals ?? []).map((r) => (
            <div key={r.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 11.7, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>APR-{r.id}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: "#eef4ff", color: "#1d4ed8" }}>{STATUS_LABEL[r.status] ?? r.status.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 700, margin: "14px 0 6px" }}>Academic Year {r.academic_year}</div>
              <div style={{ fontSize: 12.2, color: "#94a3b8" }}>Submitted {r.created_at.slice(0, 10)}</div>
              {r.status === "hod_reviewed" && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                  <button onClick={() => onWithdraw(r.id)} style={{ border: "1px solid #fecaca", background: "#fef2f7", color: "#b91c1c", fontSize: 11.3, fontWeight: 700, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Withdraw</button>
                </div>
              )}
            </div>
          ))}
          {!isLoading && !error && (appraisals ?? []).length === 0 && (
            <div style={{ padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No appraisal requests yet.</div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
