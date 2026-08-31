"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EdcEntrepreneurshipRow, UpdateEdcVentureInput } from "./api/entrepreneurship";
import { isBeyondIdeaStage, useUpdateEdcVenture, useDeleteEdcVenture, useFacultyDirectory } from "./api/entrepreneurship";
import { pillSx } from "./genericPage";

// Shared detail view for a single real student_entrepreneurship row — used
// by both "EDC Students" and "Startups" detail routes (same underlying
// data, no separate ventures table exists). Real fields only — no
// VENTURE_FILE-style fake per-venture object. Sections/fields not backed by
// any real column are dropped rather than invented (no student mobile/
// email/batch is returned by this endpoint's student summary — same
// omission the Advisor module made for the identical gap).
//
// Full CRUD: Edit toggles every EDC-owned field (everything except the
// read-only admin-owned student identity block) into inputs, submitted via
// PATCH /me/edc-entrepreneurship/:id (added this session — there was no
// update endpoint at all before). Delete removes the venture entirely via
// the also-new DELETE endpoint, with a confirm step since it's destructive.

function money(v: number | null): string {
  return v !== null ? `₹${v.toLocaleString("en-IN")}` : "—";
}
function yesNo(v: boolean | null): string {
  return v === null ? "—" : v ? "Yes" : "No";
}
function humanize(v: string | null): string | null {
  if (!v) return null;
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const inputSx = { height: 38, padding: "0 11px", border: "1px solid #E2E8F0", borderRadius: 9, background: "#fff", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", outline: "none", width: "100%" } as const;
const textareaSx = { ...inputSx, height: 72, padding: "9px 11px", resize: "vertical" as const };
const REGISTRATION_TYPES = [
  { value: "", label: "Not registered yet" },
  { value: "private_limited", label: "Private Limited" },
  { value: "llp", label: "LLP" },
  { value: "proprietorship", label: "Proprietorship" },
  { value: "unregistered", label: "Unregistered" },
] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#94A3B8" }}>{label}</label>
      {children}
    </div>
  );
}

export function EdcVentureDetail({
  row,
  backHref,
  backLabel,
  readOnly,
}: {
  row: EdcEntrepreneurshipRow;
  backHref?: string;
  backLabel?: string;
  /** Hides Edit/Delete — the student's own "My Venture" view is read-only; only the EDC Coordinator can change venture data. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const update = useUpdateEdcVenture();
  const remove = useDeleteEdcVenture();
  const facultyDirectory = useFacultyDirectory();
  const beyondIdea = isBeyondIdeaStage(row);

  const [edit, setEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateEdcVentureInput>({});

  function startEdit() {
    setForm({
      business_name: row.business_name,
      business_description: row.business_description ?? undefined,
      sector: row.sector ?? undefined,
      business_category: row.business_category ?? undefined,
      location: row.location ?? undefined,
      year_started: row.year_started ?? undefined,
      website: row.website ?? undefined,
      linkedin_url: row.linkedin_url ?? undefined,
      problem_statement: row.problem_statement ?? undefined,
      business_model: row.business_model ?? undefined,
      target_customers: row.target_customers ?? undefined,
      remarks: row.remarks ?? undefined,
      stage: row.stage ?? undefined,
      growth_stage: row.growth_stage ?? undefined,
      registration_type: row.registration_type as UpdateEdcVentureInput["registration_type"],
      current_status_note: row.current_status_note ?? undefined,
      is_incubated: row.is_incubated ?? undefined,
      role: row.role ?? undefined,
      team_size: row.team_size ?? undefined,
      co_founders: row.co_founders ?? undefined,
      student_team_note: row.student_team_note ?? undefined,
      mentor_faculty_id: row.mentor_faculty_id ?? undefined,
      external_mentor_name: row.external_mentor_name ?? undefined,
      external_mentor_org: row.external_mentor_org ?? undefined,
      team_roles_note: row.team_roles_note ?? undefined,
      idea_developed: row.idea_developed ?? undefined,
      prototype_developed: row.prototype_developed ?? undefined,
      mvp_launched: row.mvp_launched ?? undefined,
      product_launched: row.product_launched ?? undefined,
      customers_count: row.customers_count ?? undefined,
      monthly_revenue: row.monthly_revenue ?? undefined,
      funding_required: row.funding_required ?? undefined,
      funding_status: row.funding_status ?? undefined,
      funding_received: row.funding_received ?? undefined,
      funding_source: row.funding_source ?? undefined,
      govt_grant_scheme: row.govt_grant_scheme ?? undefined,
      incubator_support: row.incubator_support ?? undefined,
      accelerator_support: row.accelerator_support ?? undefined,
    });
    setEdit(true);
  }

  function set<K extends keyof UpdateEdcVentureInput>(key: K, value: UpdateEdcVentureInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    if (!form.business_name?.trim()) {
      setError("Venture / business name is required.");
      return;
    }
    setError(null);
    update.mutate({ id: row.id, input: form }, { onSuccess: () => setEdit(false), onError: (e) => setError(e instanceof Error ? e.message : "Failed to save changes.") });
  }

  function doDelete() {
    remove.mutate(row.id, {
      onSuccess: () => { if (backHref) router.push(backHref); },
      onError: (e) => setError(e instanceof Error ? e.message : "Failed to delete."),
    });
  }

  const studentInfo = [
    { k: "Student name", v: row.student.name },
    { k: "Register number", v: row.student.student_id_no },
    { k: "Department", v: row.student.department?.name ?? "—" },
    { k: "Section", v: row.student.section ?? "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1560 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {backHref ? (
          <div onClick={() => router.push(backHref)} data-edc-back="" style={{ fontSize: 13, fontWeight: 600, color: "#64748B", cursor: "pointer", width: "fit-content" }}>
            ← {backLabel}
          </div>
        ) : (
          <div />
        )}
        {!readOnly && (
          <div style={{ display: "flex", gap: 10 }}>
            {edit ? (
              <>
                <div onClick={() => setEdit(false)} data-edc-row="" style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
                <div data-edc-btn-primary="" onClick={save} style={{ padding: "9px 18px", borderRadius: 9, background: "#1D4ED8", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {update.isPending ? "Saving…" : "Save changes"}
                </div>
              </>
            ) : (
              <>
                <div onClick={() => setConfirmDelete(true)} style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete venture</div>
                <div onClick={startEdit} data-edc-row="" style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit</div>
              </>
            )}
          </div>
        )}
      </div>

      {error && <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setConfirmDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 26, width: 420, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Delete {row.business_name}?</div>
            <p style={{ margin: 0, fontSize: 13.5, color: "#64748B" }}>This permanently removes the venture and any incubation record for it. This can't be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <div onClick={() => setConfirmDelete(false)} data-edc-row="" style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
              <div onClick={doDelete} style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, background: "#DC2626", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                {remove.isPending ? "Deleting…" : "Delete permanently"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "26px 28px", display: "flex", gap: 26 }}>
        <div style={{ width: 150, height: 150, flex: "none", borderRadius: 12, border: "1px solid #DBE7F7", background: "repeating-linear-gradient(135deg,#ffffff 0 8px,#eff6ff 8px 16px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#5B7398" }}>
          venture logo
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            {edit ? (
              <input style={{ ...inputSx, fontSize: 24, fontWeight: 800, height: 48, marginBottom: 10 }} value={form.business_name ?? ""} onChange={(e) => set("business_name", e.target.value)} />
            ) : (
              <h1 style={{ margin: "0 0 6px", fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em" }}>{row.business_name}</h1>
            )}
            <p style={{ margin: "0 0 14px", fontSize: 16, color: "#64748B" }}>
              {[row.sector, row.year_started ? `started ${row.year_started}` : null, `founded by ${row.student.name}`].filter(Boolean).join(" · ")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span style={pillSx("blue")}>{row.stage ?? (beyondIdea ? "Beyond idea stage" : "Idea stage")}</span>
              {row.is_incubated && <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", background: "#fff", border: "1px solid #E6EBF2", borderRadius: 99, padding: "6px 15px" }}>Inside college</span>}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: "#475569", background: "#fff", border: "1px solid #E6EBF2", borderRadius: 99, padding: "6px 15px" }}>Reg {row.student.student_id_no}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
            {[
              { label: "Customers / users", value: row.customers_count !== null ? String(row.customers_count) : "—", note: "as reported" },
              { label: "Monthly revenue", value: money(row.monthly_revenue), note: row.monthly_revenue !== null ? `${money(row.monthly_revenue * 12)} a year` : "—" },
              { label: "Team size", value: row.team_size !== null ? String(row.team_size) : "—", note: "members" },
              { label: "Funding received", value: money(row.funding_received), note: row.funding_source ?? "—", highlight: true },
            ].map((s) => (
              <div key={s.label} data-edc-lift="" style={{ background: s.highlight ? "#EFF6FF" : "#fff", border: `1px solid ${s.highlight ? "#CFE0F7" : "#E6EBF2"}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.value}</div>
                <div style={{ fontSize: 12.5, color: "#94A3B8" }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18 }}>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>1 · Student information</div>
          <div style={{ padding: "6px 24px 14px" }}>
            {studentInfo.map((r) => (
              <div key={r.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "13px 0", borderBottom: "1px solid #EEF2F7" }}>
                <span style={{ fontSize: 14, color: "#64748B" }}>{r.k}</span>
                <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{r.v}</span>
              </div>
            ))}
            <div style={{ padding: "13px 0 0", fontSize: 12, color: "#94A3B8" }}>Identity data — read-only, entered by Admission. Not editable here.</div>
          </div>
        </div>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>2 · Entrepreneurship status</div>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            {edit ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="STAGE"><input style={inputSx} value={form.stage ?? ""} onChange={(e) => set("stage", e.target.value)} /></Field>
                  <Field label="ENTREPRENEUR TYPE"><input style={inputSx} value={form.role ?? ""} onChange={(e) => set("role", e.target.value)} /></Field>
                </div>
                <Field label="CURRENT STATUS NOTE"><textarea style={textareaSx} value={form.current_status_note ?? ""} onChange={(e) => set("current_status_note", e.target.value)} /></Field>
                <Field label="MONTHLY REVENUE (₹)"><input type="number" style={inputSx} value={form.monthly_revenue ?? ""} onChange={(e) => set("monthly_revenue", e.target.value ? Number(e.target.value) : undefined)} /></Field>
              </>
            ) : (
              [
                { k: "Entrepreneurship status", v: row.stage ?? (beyondIdea ? "Beyond idea stage" : "Idea stage") },
                { k: "Entrepreneur type", v: humanize(row.role) ?? "—" },
                { k: "Current status", v: row.current_status_note ?? "—" },
                { k: "Monthly revenue", v: money(row.monthly_revenue) },
              ].map((r) => (
                <div key={r.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "0", borderBottom: "1px solid #EEF2F7", paddingBottom: 13 }}>
                  <span style={{ fontSize: 14, color: "#64748B" }}>{r.k}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{r.v}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>3 · Startup / business details</div>
        {edit ? (
          <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
            <Field label="DOMAIN / SECTOR"><input style={inputSx} value={form.sector ?? ""} onChange={(e) => set("sector", e.target.value)} /></Field>
            <Field label="BUSINESS CATEGORY"><input style={inputSx} value={form.business_category ?? ""} onChange={(e) => set("business_category", e.target.value)} /></Field>
            <Field label="LOCATION"><input style={inputSx} value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} /></Field>
            <Field label="YEAR STARTED"><input type="number" style={inputSx} value={form.year_started ?? ""} onChange={(e) => set("year_started", e.target.value ? Number(e.target.value) : undefined)} /></Field>
            <Field label="WEBSITE"><input style={inputSx} value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
            <Field label="LINKEDIN"><input style={inputSx} value={form.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} /></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="PROBLEM STATEMENT"><textarea style={textareaSx} value={form.problem_statement ?? ""} onChange={(e) => set("problem_statement", e.target.value)} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}><Field label="SOLUTION / PRODUCT"><textarea style={textareaSx} value={form.business_model ?? ""} onChange={(e) => set("business_model", e.target.value)} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}><Field label="TARGET CUSTOMERS"><input style={inputSx} value={form.target_customers ?? ""} onChange={(e) => set("target_customers", e.target.value)} /></Field></div>
          </div>
        ) : (
          <div style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "22px 28px" }}>
            {[
              { k: "Domain / sector", v: row.sector ?? "—", mono: false, light: false },
              { k: "Business category", v: row.business_category ?? "—", mono: false, light: false },
              { k: "Location", v: row.location ?? "—", mono: false, light: false },
              { k: "Problem statement", v: row.problem_statement ?? "—", mono: false, light: true },
              { k: "Solution / product", v: row.business_model ?? "—", mono: false, light: true },
              { k: "Target customers", v: row.target_customers ?? "—", mono: false, light: true },
              { k: "Website", v: row.website ?? "—", mono: true, light: false },
              { k: "LinkedIn", v: row.linkedin_url ?? "—", mono: true, light: false },
            ].map((b) => (
              <div key={b.k}>
                <div style={{ fontSize: 12.5, color: "#7B8AA0", marginBottom: 5 }}>{b.k}</div>
                <div style={b.mono ? { fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#1D4ED8" } : { fontSize: b.light ? 14.5 : 16, fontWeight: b.light ? 500 : 700, color: "#0F172A" }}>{b.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18 }}>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>4 · Founder &amp; team</div>
          {edit ? (
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="CO-FOUNDERS"><input style={inputSx} value={form.co_founders ?? ""} onChange={(e) => set("co_founders", e.target.value)} /></Field>
              <Field label="TEAM SIZE"><input type="number" style={inputSx} value={form.team_size ?? ""} onChange={(e) => set("team_size", e.target.value ? Number(e.target.value) : undefined)} /></Field>
              <Field label="STUDENT TEAM NOTE"><input style={inputSx} value={form.student_team_note ?? ""} onChange={(e) => set("student_team_note", e.target.value)} /></Field>
              <Field label="FACULTY MENTOR">
                <select style={inputSx} value={form.mentor_faculty_id ?? ""} onChange={(e) => set("mentor_faculty_id", e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Not assigned</option>
                  {(facultyDirectory.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name} — {f.department_name}</option>)}
                </select>
              </Field>
              <Field label="EXTERNAL MENTOR NAME"><input style={inputSx} value={form.external_mentor_name ?? ""} onChange={(e) => set("external_mentor_name", e.target.value)} /></Field>
              <Field label="EXTERNAL MENTOR ORG"><input style={inputSx} value={form.external_mentor_org ?? ""} onChange={(e) => set("external_mentor_org", e.target.value)} /></Field>
              <Field label="TEAM ROLES NOTE"><input style={inputSx} value={form.team_roles_note ?? ""} onChange={(e) => set("team_roles_note", e.target.value)} /></Field>
            </div>
          ) : (
            <div style={{ padding: "6px 24px 14px" }}>
              {[
                { k: humanize(row.role) ?? "Founder", v: row.student.name },
                { k: "Co-founders", v: row.co_founders ?? "—" },
                { k: "Team members", v: row.team_size !== null ? String(row.team_size) : "—" },
                { k: "Student team", v: row.student_team_note ?? "—" },
                { k: "Faculty mentor", v: row.mentor_faculty_name ?? "—" },
                { k: "External mentor", v: [row.external_mentor_name, row.external_mentor_org].filter(Boolean).join(" · ") || "—" },
                { k: "Team roles", v: row.team_roles_note ?? "—" },
              ].map((r) => (
                <div key={r.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "13px 0", borderBottom: "1px solid #EEF2F7" }}>
                  <span style={{ fontSize: 14, color: "#64748B", flex: "none" }}>{r.k}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{r.v}</span>
                </div>
              ))}
              <div style={{ padding: "13px 0 0", fontSize: 12, color: "#94A3B8" }}>Faculty mentor is assigned from the Mentors tab.</div>
            </div>
          )}
        </div>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>5 · Startup progress</div>
          {edit ? (
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "idea_developed" as const, label: "Idea developed" },
                { key: "prototype_developed" as const, label: "Prototype developed" },
                { key: "mvp_launched" as const, label: "MVP launched" },
                { key: "product_launched" as const, label: "Product / service launched" },
              ].map((f) => (
                <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  <input type="checkbox" checked={Boolean(form[f.key])} onChange={(e) => set(f.key, e.target.checked)} /> {f.label}
                </label>
              ))}
              <Field label="CUSTOMERS / USERS"><input type="number" style={inputSx} value={form.customers_count ?? ""} onChange={(e) => set("customers_count", e.target.value ? Number(e.target.value) : undefined)} /></Field>
              <Field label="GROWTH STAGE"><input style={inputSx} value={form.growth_stage ?? ""} onChange={(e) => set("growth_stage", e.target.value)} /></Field>
            </div>
          ) : (
            <div style={{ padding: "6px 24px 14px" }}>
              {[
                { k: "Idea developed", v: yesNo(row.idea_developed) },
                { k: "Prototype developed", v: yesNo(row.prototype_developed) },
                { k: "MVP launched", v: yesNo(row.mvp_launched) },
                { k: "Product / service launched", v: yesNo(row.product_launched) },
                { k: "Customers / users", v: row.customers_count !== null ? String(row.customers_count) : "—" },
                { k: "Monthly · annual revenue", v: row.monthly_revenue !== null ? `${money(row.monthly_revenue)} · ${money(row.monthly_revenue * 12)}` : "—" },
                { k: "Current growth stage", v: row.growth_stage ?? row.stage ?? "—" },
              ].map((r) => (
                <div key={r.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "13px 0", borderBottom: "1px solid #EEF2F7" }}>
                  <span style={{ fontSize: 14, color: "#64748B" }}>{r.k}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>6 · Funding</div>
        {edit ? (
          <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
            <Field label="FUNDING REQUIRED (₹)"><input type="number" style={inputSx} value={form.funding_required ?? ""} onChange={(e) => set("funding_required", e.target.value ? Number(e.target.value) : undefined)} /></Field>
            <Field label="FUNDING STATUS"><input style={inputSx} value={form.funding_status ?? ""} onChange={(e) => set("funding_status", e.target.value)} /></Field>
            <Field label="FUNDING RECEIVED (₹)"><input type="number" style={inputSx} value={form.funding_received ?? ""} onChange={(e) => set("funding_received", e.target.value ? Number(e.target.value) : undefined)} /></Field>
            <Field label="FUNDING SOURCE"><input style={inputSx} value={form.funding_source ?? ""} onChange={(e) => set("funding_source", e.target.value)} /></Field>
            <Field label="GOVERNMENT GRANT / SCHEME"><input style={inputSx} value={form.govt_grant_scheme ?? ""} onChange={(e) => set("govt_grant_scheme", e.target.value)} /></Field>
            <Field label="INCUBATOR SUPPORT"><input style={inputSx} value={form.incubator_support ?? ""} onChange={(e) => set("incubator_support", e.target.value)} /></Field>
            <Field label="ACCELERATOR SUPPORT"><input style={inputSx} value={form.accelerator_support ?? ""} onChange={(e) => set("accelerator_support", e.target.value)} /></Field>
            <Field label="LEGAL / REGISTRATION TYPE">
              <select style={inputSx} value={form.registration_type ?? ""} onChange={(e) => set("registration_type", (e.target.value || undefined) as UpdateEdcVentureInput["registration_type"])}>
                {REGISTRATION_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          </div>
        ) : (
          <div style={{ padding: "6px 24px 16px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "0 32px" }}>
            {[
              { k: "Funding status", v: row.funding_status ?? "—" },
              { k: "Funding received", v: money(row.funding_received) },
              { k: "Funding source", v: row.funding_source ?? "—" },
              { k: "Government grant / scheme", v: row.govt_grant_scheme ?? "Not availed" },
              { k: "Incubator support", v: row.incubator_support ?? "Not enrolled" },
              { k: "Accelerator support", v: row.accelerator_support ?? "Not enrolled" },
            ].map((r) => (
              <div key={r.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "13px 0", borderBottom: "1px solid #EEF2F7" }}>
                <span style={{ fontSize: 14, color: "#64748B" }}>{r.k}</span>
                <span style={{ fontSize: 14, fontWeight: 700, textAlign: "right" }}>{r.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
