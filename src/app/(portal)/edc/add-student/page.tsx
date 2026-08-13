"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useSearchStudentsForEdc,
  useCreateEdcVenture,
  type StudentSearchResult,
  type CreateEdcVentureInput,
} from "@/modules/edc/api/entrepreneurship";

// Real backend connection — GET /me/edc-entrepreneurship/search-students
// (typo-tolerant pg_trgm search over real students, added this session —
// no such endpoint existed for any coordinator-type role before), POST
// /me/edc-entrepreneurship (also new — the module was read-only before).
//
// Two-step flow, matching the actual data ownership split (see
// edc-add-student-fields memory): Step 1 finds a REAL, already-enrolled
// student (admin-entered identity data, read-only here) — EDC never
// creates or edits student identity. Step 2 collects only the fields EDC
// actually owns (venture name, sector, funding, team, progress) and
// creates the one-and-only student_entrepreneurship row for them
// (student_id is @unique — a student who already has a venture is shown
// disabled in search results, not offered again).

const REGISTRATION_TYPES = [
  { value: "", label: "Not registered yet" },
  { value: "private_limited", label: "Private Limited" },
  { value: "llp", label: "LLP" },
  { value: "proprietorship", label: "Proprietorship" },
  { value: "unregistered", label: "Unregistered" },
] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>{label}</label>
      {children}
    </div>
  );
}

const inputSx = { height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none", width: "100%" } as const;
const textareaSx = { ...inputSx, height: 80, padding: "10px 13px", resize: "vertical" as const };

function initialsOf(name: string) {
  const p = name.split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export default function EdcAddStudentPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CreateEdcVentureInput>>({});

  const search = useSearchStudentsForEdc(query);
  const create = useCreateEdcVenture();

  function set<K extends keyof CreateEdcVentureInput>(key: K, value: CreateEdcVentureInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    if (!selected) return;
    if (!form.business_name?.trim()) {
      setError("Venture / business name is required.");
      return;
    }
    setError(null);
    create.mutate(
      { ...form, student_id: selected.id, business_name: form.business_name },
      {
        onSuccess: (row) => router.push(`/edc/entrepreneurs/${row.id}`),
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to add student."),
      },
    );
  }

  if (!selected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1100 }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Add Student</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Search for an already-enrolled student by roll number, register number or name, then add their venture details.</p>
        </div>

        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ height: 46, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff" }}>
            <span className="ms" style={{ color: "#94A3B8", fontSize: 20 }}>search</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by roll number, register number or name…"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "#0F172A" }}
            />
          </div>
        </div>

        {query.trim().length >= 2 && search.isError && (
          <div style={{ padding: "14px 18px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, color: "#DC2626", fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>{search.error instanceof Error ? search.error.message : "Search failed — could not reach the server."}</span>
            <span onClick={() => search.refetch()} style={{ cursor: "pointer", textDecoration: "underline", flex: "0 0 auto" }}>Retry</span>
          </div>
        )}

        {query.trim().length >= 2 && !search.isError && (
          <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.9fr 0.8fr 0.9fr", gap: 16, padding: "12px 24px", background: "#fff", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
              <span>STUDENT</span>
              <span>DEPT · SECTION</span>
              <span>BATCH</span>
              <span>ROLL NO</span>
              <span style={{ textAlign: "right" }}>STATUS</span>
            </div>
            {search.isLoading && (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>Searching…</div>
            )}
            {(search.data ?? []).map((r) => (
              <div
                key={r.id}
                data-edc-row=""
                onClick={() => !r.has_venture && setSelected(r)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 0.9fr 0.8fr 0.9fr",
                  gap: 16,
                  alignItems: "center",
                  padding: "14px 24px",
                  borderBottom: "1px solid #EEF2F7",
                  cursor: r.has_venture ? "default" : "pointer",
                  opacity: r.has_venture ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
                    {initialsOf(r.name)}
                  </div>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.name}>{r.name}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>{r.student_id_no}</div>
                  </div>
                </div>
                <span style={{ fontSize: 13.5, color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[r.department?.code, r.section].filter(Boolean).join(" · ") || "—"}</span>
                <span style={{ fontSize: 13.5, color: "#475569", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.batch_name ?? "—"}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: "#475569" }}>{r.roll_no ?? "—"}</span>
                <span style={{ textAlign: "right" }}>
                  {r.has_venture ? (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B", background: "#EEF2F7", borderRadius: 99, padding: "4px 11px" }}>Already added</span>
                  ) : (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1D4ED8", background: "#EFF6FF", borderRadius: 99, padding: "4px 11px" }}>Add →</span>
                  )}
                </span>
              </div>
            ))}
            {search.data && search.data.length === 0 && !search.isLoading && !search.isError && (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No students match this search.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1100 }}>
      <div onClick={() => setSelected(null)} data-edc-back="" style={{ fontSize: 13, fontWeight: 600, color: "#64748B", cursor: "pointer", width: "fit-content" }}>
        ← Search again
      </div>

      <div data-edc-lift="" style={{ background: "#F4F8FF", border: "1px solid #CFE0F7", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1D4ED8", color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 44px" }}>
          {initialsOf(selected.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={selected.name}>{selected.name}</div>
          <div style={{ fontSize: 13, color: "#3B6FD4", fontWeight: 600, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected.student_id_no} · {[selected.department?.name, selected.section, selected.batch_name].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Identity data — read-only, entered by Admission</div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>1 · Business identity</div>
        <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
          <Field label="VENTURE / BUSINESS NAME *"><input style={inputSx} value={form.business_name ?? ""} onChange={(e) => set("business_name", e.target.value)} placeholder="RouteWise Mobility" /></Field>
          <Field label="SECTOR / DOMAIN"><input style={inputSx} value={form.sector ?? ""} onChange={(e) => set("sector", e.target.value)} placeholder="Logistics technology" /></Field>
          <Field label="BUSINESS CATEGORY"><input style={inputSx} value={form.business_category ?? ""} onChange={(e) => set("business_category", e.target.value)} placeholder="B2B SaaS" /></Field>
          <Field label="LOCATION"><input style={inputSx} value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Coimbatore" /></Field>
          <Field label="YEAR STARTED"><input type="number" style={inputSx} value={form.year_started ?? ""} onChange={(e) => set("year_started", e.target.value ? Number(e.target.value) : undefined)} placeholder="2025" /></Field>
          <Field label="WEBSITE"><input style={inputSx} value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="www.example.com" /></Field>
          <Field label="LINKEDIN"><input style={inputSx} value={form.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="linkedin.com/company/..." /></Field>
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>2 · Business details</div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="BUSINESS DESCRIPTION"><textarea style={textareaSx} value={form.business_description ?? ""} onChange={(e) => set("business_description", e.target.value)} /></Field>
          <Field label="PROBLEM STATEMENT"><textarea style={textareaSx} value={form.problem_statement ?? ""} onChange={(e) => set("problem_statement", e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
            <Field label="BUSINESS MODEL"><input style={inputSx} value={form.business_model ?? ""} onChange={(e) => set("business_model", e.target.value)} placeholder="Monthly subscription" /></Field>
            <Field label="TARGET CUSTOMERS"><input style={inputSx} value={form.target_customers ?? ""} onChange={(e) => set("target_customers", e.target.value)} /></Field>
          </div>
          <Field label="REMARKS"><textarea style={textareaSx} value={form.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} /></Field>
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>3 · Stage &amp; status</div>
        <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
          <Field label="STAGE"><input style={inputSx} value={form.stage ?? ""} onChange={(e) => set("stage", e.target.value)} placeholder="Idea / Prototype / Registered Startup" /></Field>
          <Field label="GROWTH STAGE"><input style={inputSx} value={form.growth_stage ?? ""} onChange={(e) => set("growth_stage", e.target.value)} /></Field>
          <Field label="LEGAL / REGISTRATION TYPE">
            <select style={inputSx} value={form.registration_type ?? ""} onChange={(e) => set("registration_type", (e.target.value || undefined) as CreateEdcVentureInput["registration_type"])}>
              {REGISTRATION_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="CURRENT STATUS NOTE"><input style={inputSx} value={form.current_status_note ?? ""} onChange={(e) => set("current_status_note", e.target.value)} /></Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155" }}>
            <input type="checkbox" checked={form.is_incubated ?? false} onChange={(e) => set("is_incubated", e.target.checked)} /> Inside incubation centre
          </label>
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>4 · Progress</div>
        <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
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
          <Field label="MONTHLY REVENUE (₹)"><input type="number" style={inputSx} value={form.monthly_revenue ?? ""} onChange={(e) => set("monthly_revenue", e.target.value ? Number(e.target.value) : undefined)} /></Field>
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>5 · Founder &amp; team</div>
        <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
          <Field label="ROLE"><input style={inputSx} value={form.role ?? ""} onChange={(e) => set("role", e.target.value)} placeholder="Founder / Co-Founder" /></Field>
          <Field label="TEAM SIZE"><input type="number" style={inputSx} value={form.team_size ?? ""} onChange={(e) => set("team_size", e.target.value ? Number(e.target.value) : undefined)} /></Field>
          <Field label="CO-FOUNDERS"><input style={inputSx} value={form.co_founders ?? ""} onChange={(e) => set("co_founders", e.target.value)} /></Field>
          <Field label="STUDENT TEAM NOTE"><input style={inputSx} value={form.student_team_note ?? ""} onChange={(e) => set("student_team_note", e.target.value)} /></Field>
          <Field label="EXTERNAL MENTOR NAME"><input style={inputSx} value={form.external_mentor_name ?? ""} onChange={(e) => set("external_mentor_name", e.target.value)} /></Field>
          <Field label="EXTERNAL MENTOR ORG"><input style={inputSx} value={form.external_mentor_org ?? ""} onChange={(e) => set("external_mentor_org", e.target.value)} /></Field>
          <Field label="TEAM ROLES NOTE"><input style={inputSx} value={form.team_roles_note ?? ""} onChange={(e) => set("team_roles_note", e.target.value)} /></Field>
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 17, fontWeight: 700 }}>6 · Funding</div>
        <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
          <Field label="FUNDING REQUIRED (₹)"><input type="number" style={inputSx} value={form.funding_required ?? ""} onChange={(e) => set("funding_required", e.target.value ? Number(e.target.value) : undefined)} /></Field>
          <Field label="FUNDING STATUS"><input style={inputSx} value={form.funding_status ?? ""} onChange={(e) => set("funding_status", e.target.value)} placeholder="Applied / Funded / Self funded" /></Field>
          <Field label="FUNDING RECEIVED (₹)"><input type="number" style={inputSx} value={form.funding_received ?? ""} onChange={(e) => set("funding_received", e.target.value ? Number(e.target.value) : undefined)} /></Field>
          <Field label="FUNDING SOURCE"><input style={inputSx} value={form.funding_source ?? ""} onChange={(e) => set("funding_source", e.target.value)} /></Field>
          <Field label="GOVERNMENT GRANT / SCHEME"><input style={inputSx} value={form.govt_grant_scheme ?? ""} onChange={(e) => set("govt_grant_scheme", e.target.value)} /></Field>
          <Field label="INCUBATOR SUPPORT"><input style={inputSx} value={form.incubator_support ?? ""} onChange={(e) => set("incubator_support", e.target.value)} /></Field>
          <Field label="ACCELERATOR SUPPORT"><input style={inputSx} value={form.accelerator_support ?? ""} onChange={(e) => set("accelerator_support", e.target.value)} /></Field>
        </div>
      </div>

      {error && <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}

      <div
        onClick={submit}
        data-edc-btn-primary=""
        style={{ padding: 16, textAlign: "center", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 15, fontWeight: 700, cursor: create.isPending ? "default" : "pointer" }}
      >
        {create.isPending ? "Adding student…" : "Add student to EDC"}
      </div>
    </div>
  );
}
