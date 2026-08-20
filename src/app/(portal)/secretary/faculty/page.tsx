"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBatchesLookup, useDepartmentsLookup } from "@/modules/secretary/api/announcements";
import { useFacultyCoordination, useAssignFacultyDuty, type FacultyCoordinationRow } from "@/modules/secretary/api/faculty";
import { initialsOf } from "@/modules/secretary/helpers";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";

// Pixel-exact layout port of the `isFaculty` screen ("Faculty Coordination")
// from "Secretary Module - Web/Secretary Dashboard.dc.html", lines 516-551.
//
// REAL BACKEND WIRING — ZERO fake data. Every field is real, computed live
// via the new `GET /principal-faculty/coordination` endpoint:
//  - Load (hrs): real timetable_slots count for the latest academic year.
//  - Duties: real faculty_subject_class_mapping + faculty_committee_roles count.
//  - Mentees: real students.mentor_faculty_id count + class-advisor roll counts.
//  - Status (Available/On duty/On leave/Overloaded): computed from real
//    approved faculty_leaves/faculty_od_requests covering today, else a
//    real load threshold (>20 hrs/week = Overloaded).
//  - "Next" line: the real nearest upcoming invigilation_duties row for
//    that faculty — the only genuine "scheduled duty" concept in the
//    schema. Faculty with no upcoming invigilation show no "Next" line
//    (not fabricated).
// "Assign duty" writes a real row into faculty_committee_roles (added by
// this session's faculty_profile_gaps.sql migration). "Mark on duty" /
// "Mark available" have no real backing (the real status is entirely
// derived from leave/OD approvals and load, not a settable flag) — so
// those two buttons are not wired to a fake toggle; "View profile" and
// "Assign duty" are the two real actions available per card.

const STATUS_LABEL: Record<FacultyCoordinationRow["status"], string> = {
  available: "Available",
  on_duty: "On duty",
  on_leave: "On leave",
  overloaded: "Overloaded",
};
const STATUS_COLOR: Record<FacultyCoordinationRow["status"], { bg: string; fg: string }> = {
  available: { bg: "#ecfdf5", fg: "#047857" },
  on_duty: { bg: "#eef4ff", fg: "#1d4ed8" },
  on_leave: { bg: "#fffbeb", fg: "#b45309" },
  overloaded: { bg: "#fef2f2", fg: "#b91c1c" },
};

const DUTY_FIELDS: QuickFieldSpec[] = [
  { key: "committee_name", label: "Committee / duty", type: "text", placeholder: "e.g. NBA Criterion 4 review" },
  { key: "role", label: "Role (optional)", type: "text", placeholder: "e.g. Member" },
];

export default function SecretaryFacultyPage() {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [assignFor, setAssignFor] = useState<FacultyCoordinationRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);

  const { data: rows, isLoading, error } = useFacultyCoordination(cseDept?.id);
  const assignMutation = useAssignFacultyDuty();

  function openAssign(f: FacultyCoordinationRow) {
    setForm({ committee_name: "", role: "" });
    setAssignFor(f);
  }
  async function submitAssign() {
    if (!assignFor || !form.committee_name?.trim()) {
      flash("Enter the committee/duty name.");
      return;
    }
    try {
      await assignMutation.mutateAsync({ facultyId: assignFor.id, committee_name: form.committee_name, role: form.role || undefined });
      setAssignFor(null);
      flash(`Duty assigned to ${assignFor.name}.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not assign the duty.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Faculty Coordination</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Duty allocation, availability and pending confirmations across {rows?.length ?? 0} faculty</p>
        </div>
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading faculty…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load faculty."}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
        {(rows ?? []).map((f) => {
          const c = STATUS_COLOR[f.status];
          return (
            <div key={f.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 999, background: "#eef4ff", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.2, fontWeight: 700 }}>{initialsOf(f.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 11.8, color: "#64748b" }}>{f.designation}{f.department_code ? ` · ${f.department_code}` : ""}</div>
                </div>
                <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "5px 10px", background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>{STATUS_LABEL[f.status]}</span>
              </div>
              <div style={{ display: "flex", gap: 22, margin: "16px 0 12px" }}>
                <div><div style={{ fontSize: 10.8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>Load</div><div style={{ fontSize: 15.7, fontWeight: 700 }}>{f.load_hrs} hrs</div></div>
                <div><div style={{ fontSize: 10.8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>Duties</div><div style={{ fontSize: 15.7, fontWeight: 700 }}>{f.duties}</div></div>
                <div><div style={{ fontSize: 10.8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>Mentees</div><div style={{ fontSize: 15.7, fontWeight: 700 }}>{f.mentees}</div></div>
              </div>
              {f.next_duty && (
                <div style={{ fontSize: 11.3, color: "#475569", borderTop: "1px solid #f5f7fa", paddingTop: 12, marginBottom: 12 }}>
                  Next: invigilation, {new Date(f.next_duty.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {f.next_duty.session === "forenoon" ? "FN" : "AN"}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: f.next_duty ? 0 : 12 }}>
                <button onClick={() => router.push(`/secretary/faculty/${f.id}`)} style={{ flex: 1, border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 12.6, fontWeight: 600, borderRadius: 9, padding: "12px 0", cursor: "pointer" }}>View profile</button>
                <button onClick={() => openAssign(f)} style={{ flex: 1, border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 12.6, fontWeight: 600, borderRadius: 9, padding: "12px 0", cursor: "pointer" }}>Assign duty</button>
              </div>
            </div>
          );
        })}
        {!isLoading && !error && (rows ?? []).length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No faculty on record for this department.</div>
        )}
      </div>

      <QuickModal
        open={assignFor !== null}
        title={`Assign duty — ${assignFor?.name ?? ""}`}
        subtitle="Real committee/duty assignment, saved to the faculty's record"
        cta="Assign"
        fields={DUTY_FIELDS}
        values={form}
        onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
        onClose={() => setAssignFor(null)}
        onSubmit={submitAssign}
      />

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
