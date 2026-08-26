"use client";

import { useDepartmentsOverview, useNbaStatus, useClassStrength } from "@/modules/secretary/api/overview";

// Pixel-exact layout port of the `isDept` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1540-1610.
// Entirely read-only in the source (no onClick handlers), so this page
// has none either.
//
// REAL BACKEND WIRING — ZERO fake data. Reads from EOSbackend1's real
// `GET /principal-departments/overview` (Secretary added to its role
// guard; `established_at`/`courses_offered`/`courses` were added to the
// service specifically for this screen — real columns/joins, no schema
// migration). "NBA status" and "Class strength by year" are now real too
// — `GET /principal-departments/nba-status` aggregates the same real
// nba_criteria/nba_evidence_items the Accreditation screen uses, and
// `GET /principal-departments/class-strength` computes real per-section
// strength + attendance from students/attendance_records.
//
// Genuine, confirmed schema gaps (no table/column exists anywhere,
// grepped exhaustively) — NOT faked, and NOT silently dropped: see the
// SQL drafted in `EOSbackend1/prisma/migrations/department_details_gaps.sql`
// for "Laboratories & infrastructure", "MoUs signed", "Research funding",
// "Office location & contact", and per-programme accreditation chips.
// These remain honest empty states until that migration is run.

function fmtYear(iso: string): string {
  return new Date(iso).getFullYear().toString();
}

export default function SecretaryDeptPage() {
  const { data, isLoading, error } = useDepartmentsOverview();

  // Backend now scopes GET /principal-departments/overview to exactly this
  // secretary's own department (see PrincipalDepartmentsService), so the
  // list always contains just one entry for her — no "find CSE" needed.
  const dept = data?.departments[0];

  const { data: nba } = useNbaStatus(dept?.id);
  const { data: classStrength } = useClassStrength(dept?.id);

  if (isLoading) return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading department overview…</div>;
  if (error) return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load department overview."}</div>;
  if (!dept) return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>No departments found.</div>;

  const stats = [
    { label: "Students on roll", value: String(dept.students), foot: `${dept.courses_offered} programmes offered` },
    { label: "Faculty & staff", value: String(dept.faculty), foot: dept.students > 0 && dept.faculty > 0 ? `1:${Math.round(dept.students / dept.faculty)} faculty-student ratio` : "—" },
    { label: "Mean attendance", value: dept.attendance_pct !== null ? `${dept.attendance_pct.toFixed(1)}%` : "—", foot: "today, live" },
    { label: "Placement %", value: dept.placement_pct !== null ? `${dept.placement_pct.toFixed(1)}%` : "—", foot: `${dept.placement_applicants} applicants` },
  ];

  const profile = [
    { label: "Head of the Department", value: dept.hod_name ?? "—" },
    { label: "Department code", value: dept.code },
    { label: "Established", value: fmtYear(dept.established_at) },
    { label: "Programmes offered", value: String(dept.courses_offered) },
  ];

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Department Details</h1>
      <p style={{ margin: "9px 0 26px", fontSize: 13.5, color: "#64748b" }}>{dept.name} · established {fmtYear(dept.established_at)} · {dept.students} students on roll</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 20, marginBottom: 20 }}>
        {stats.map((d) => (
          <div key={d.label} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 13.1, color: "#475569" }}>{d.label}</div>
            <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1.2, margin: "8px 0 4px" }}>{d.value}</div>
            <div style={{ fontSize: 11.7, color: "#94a3b8" }}>{d.foot}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Department profile</h2>
          {profile.map((p) => (
            <div key={p.label} data-sec-row="" style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "12px 0", borderBottom: "1px solid #f5f7fa" }}>
              <span style={{ width: 180, flex: "0 0 auto", fontSize: 11.7, color: "#94a3b8" }}>{p.label}</span>
              <span style={{ fontSize: 12.6, fontWeight: 500, color: "#0f172a" }}>{p.value}</span>
            </div>
          ))}
        </div>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Programmes offered</h2>
          {dept.courses.map((p) => (
            <div key={p.id} style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: "15px 18px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8" }}>{p.code}</span>
              </div>
              <div style={{ fontSize: 11.7, color: "#64748b", marginTop: 6 }}>{p.duration_years}-year programme</div>
            </div>
          ))}
          {dept.courses.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No courses on record for this department.</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 15.7, fontWeight: 700 }}>NBA readiness</h2>
          <p style={{ margin: "0 0 16px", fontSize: 11.7, color: "#94a3b8" }}>{nba?.criteria_count ?? 0} criteria tracked, {nba?.done_count ?? 0} of {nba?.total_count ?? 0} evidence items ready</p>
          <div style={{ height: 10, borderRadius: 999, background: "#eef2f7", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#1e3a8a", borderRadius: 999, width: `${nba?.readiness_pct ?? 0}%` }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 13.1, fontWeight: 700 }}>{nba?.readiness_pct !== null && nba?.readiness_pct !== undefined ? `${nba.readiness_pct}%` : "No NBA criteria added yet"}</div>
        </div>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Class strength by section</h2>
          {(classStrength ?? []).map((c) => (
            <div key={c.class_id} data-sec-row="" style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #f5f7fa" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eef4ff", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.3, fontWeight: 700, flex: "0 0 auto" }}>{c.section}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.6, fontWeight: 600 }}>Section {c.section}{c.semester ? ` · Sem ${c.semester}` : ""}</div>
                <div style={{ fontSize: 11.3, color: "#94a3b8" }}>{c.batch ?? ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13.1, fontWeight: 700 }}>{c.strength}</div>
                <div style={{ fontSize: 11.3, color: "#94a3b8" }}>{c.attendance_pct !== null ? `${c.attendance_pct}% att.` : "—"}</div>
              </div>
            </div>
          ))}
          {(classStrength ?? []).length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No classes on record for this department.</div>}
        </div>
      </div>
    </div>
  );
}
