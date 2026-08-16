"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { useBatchesLookup, useDepartmentsLookup } from "@/modules/secretary/api/announcements";
import { useAccreditationOverview, useCreateCriterion, useAddEvidenceItem, useToggleEvidenceItem, type CriterionRow } from "@/modules/secretary/api/accreditation";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";

// Pixel-exact layout port of the `isAccred` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1475-1518.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// new `/me/nba` module (built this session against the real
// `nba_criteria`/`nba_evidence_items` tables added via the Secretary
// module completion migration). Starts genuinely empty (new tables) — add
// your institution's real NBA criteria/evidence items via the composer
// below; nothing here is pre-seeded fake data.

const CRITERION_FIELDS: QuickFieldSpec[] = [
  { key: "code", label: "Criterion code", type: "text", placeholder: "Criterion 1" },
  { key: "name", label: "Criterion name", type: "text", placeholder: "Vision, Mission & Programme Educational Objectives" },
  { key: "max_marks", label: "Max marks", type: "text", placeholder: "60" },
];
const EVIDENCE_FIELDS: QuickFieldSpec[] = [{ key: "label", label: "Evidence item", type: "text", placeholder: "e.g. Vision & mission display record" }];

export default function SecretaryAccreditationPage() {
  const [toast, setToast] = useState("");
  const [criterionModalOpen, setCriterionModalOpen] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);

  const { data: overview, isLoading, error } = useAccreditationOverview(cseDept?.id);
  const createCriterionMutation = useCreateCriterion();
  const addEvidenceMutation = useAddEvidenceItem();
  const toggleMutation = useToggleEvidenceItem();

  function openAddCriterion() {
    setForm({ code: "", name: "", max_marks: "60" });
    setCriterionModalOpen(true);
  }
  async function submitCriterion() {
    if (!form.code?.trim() || !form.name?.trim()) {
      flash("Fill in the criterion code and name.");
      return;
    }
    if (!cseDept) {
      flash("Department list isn't loaded yet — try again in a moment.");
      return;
    }
    try {
      await createCriterionMutation.mutateAsync({ department_id: cseDept.id, code: form.code, name: form.name, max_marks: parseInt(form.max_marks, 10) || 0 });
      setCriterionModalOpen(false);
      flash("Criterion added.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not add the criterion.");
    }
  }
  function openAddEvidence(criterionId: number) {
    setForm({ label: "" });
    setEvidenceModal(criterionId);
  }
  async function submitEvidence() {
    if (!form.label?.trim() || evidenceModal === null) {
      flash("Fill in the evidence item.");
      return;
    }
    try {
      await addEvidenceMutation.mutateAsync({ criterionId: evidenceModal, label: form.label });
      setEvidenceModal(null);
      flash("Evidence item added.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not add the evidence item.");
    }
  }
  async function onToggle(item: { id: number; label: string; done: boolean }) {
    try {
      await toggleMutation.mutateAsync(item.id);
      flash(item.done ? `${item.label} marked pending.` : `${item.label} marked ready.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not update the evidence item.");
    }
  }

  const readinessPct = overview?.readiness_pct ?? 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Accreditation Documentation</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>NBA self-assessment report evidence — {overview?.done_count ?? 0} of {overview?.total_count ?? 0} items in place</p>
        </div>
        <button onClick={openAddCriterion} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>＋ Add criterion</button>
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading accreditation data…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load accreditation data."}</div>}

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "20px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.2, fontWeight: 600, color: "#334155" }}>
          <span>Overall readiness</span><span>{readinessPct}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "#eef2f7", marginTop: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#1e3a8a", borderRadius: 999, width: `${readinessPct}%` }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(overview?.criteria ?? []).map((c: CriterionRow) => {
          const label = c.status === "complete" ? "Complete" : c.status === "missing" ? "Missing" : "In progress";
          const t = tone(label);
          return (
            <div key={c.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>{c.code} · {c.max_marks} marks</div>
                  <div style={{ fontSize: 14.8, fontWeight: 600, marginTop: 3 }}>{c.name}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 13.9, fontWeight: 700 }}>{c.done_count}/{c.total_count}</div>
                  <div style={{ fontSize: 11.3, color: "#94a3b8" }}>evidence ready</div>
                </div>
                <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "5px 10px", background: t.bg, color: t.fg }}>{label}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginTop: 16 }}>
                {c.items.map((i) => (
                  <button key={i.id} onClick={() => onToggle(i)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", border: "1px solid #eef2f7", borderRadius: 10, padding: "12px 14px", cursor: "pointer", background: i.done ? "#f7fdfa" : "#ffffff" }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.3, fontWeight: 700, background: i.done ? "#047857" : "#eef2f7", color: i.done ? "#ffffff" : "#94a3b8" }}>{i.done ? "✓" : ""}</span>
                    <span style={{ fontSize: 11.7, fontWeight: 500, color: "#334155" }}>{i.label}</span>
                  </button>
                ))}
                <button onClick={() => openAddEvidence(c.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #c7d7fe", borderRadius: 10, padding: "12px 14px", cursor: "pointer", background: "#ffffff", color: "#1d4ed8", fontSize: 11.7, fontWeight: 600 }}>＋ Add evidence item</button>
              </div>
            </div>
          );
        })}
        {!isLoading && !error && (overview?.criteria.length ?? 0) === 0 && (
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No NBA criteria added yet — click &quot;Add criterion&quot; to start tracking real evidence.</div>
        )}
      </div>

      <QuickModal open={criterionModalOpen} title="Add NBA criterion" subtitle="Real criterion, saved to the department register" cta="Add criterion" fields={CRITERION_FIELDS} values={form} onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))} onClose={() => setCriterionModalOpen(false)} onSubmit={submitCriterion} />
      <QuickModal open={evidenceModal !== null} title="Add evidence item" subtitle="Tracked against this criterion" cta="Add item" fields={EVIDENCE_FIELDS} values={form} onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))} onClose={() => setEvidenceModal(null)} onSubmit={submitEvidence} />

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
