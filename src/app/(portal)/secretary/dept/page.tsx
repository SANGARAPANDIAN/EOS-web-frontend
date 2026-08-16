"use client";

import { useMemo } from "react";
import { useDepartmentsOverview } from "@/modules/secretary/api/overview";

// Pixel-exact layout port of the `isDept` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1540-1610.
// Entirely read-only in the source (no onClick handlers), so this page
// has none either.
//
// REAL BACKEND WIRING — ZERO fake data. Reads from EOSbackend1's real
// `GET /principal-departments/overview` (Secretary added to its role
// guard; `established_at`/`courses_offered`/`courses` were added to the
// service specifically for this screen — real columns/joins, no schema
// migration). Honest omissions (never faked): "Laboratories" (no lab/
// infrastructure table anywhere in the schema), "NBA status"/"MoUs
// signed"/"Research funding"/"Office location & contact" (no such
// columns exist on `departments` or anywhere else) — these sections are
// removed rather than invented. "Programmes offered" now lists the
// department's REAL courses (`courses` table); the old fake
// per-programme "accreditation status" chips have no backend
// equivalent and are dropped along with them.

function fmtYear(iso: string): string {
  return new Date(iso).getFullYear().toString();
}

export default function SecretaryDeptPage() {
  const { data, isLoading, error } = useDepartmentsOverview();

  const cse = useMemo(() => {
    const depts = data?.departments ?? [];
    return depts.find((d) => d.code?.toUpperCase() === "CSE") ?? depts[0];
  }, [data]);

  if (isLoading) return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading department overview…</div>;
  if (error) return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load department overview."}</div>;
  if (!cse) return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>No departments found.</div>;

  const stats = [
    { label: "Students on roll", value: String(cse.students), foot: `${cse.courses_offered} programmes offered` },
    { label: "Faculty & staff", value: String(cse.faculty), foot: cse.students > 0 && cse.faculty > 0 ? `1:${Math.round(cse.students / cse.faculty)} faculty-student ratio` : "—" },
    { label: "Mean attendance", value: cse.attendance_pct !== null ? `${cse.attendance_pct.toFixed(1)}%` : "—", foot: "institution-wide today, live" },
    { label: "Placement %", value: cse.placement_pct !== null ? `${cse.placement_pct.toFixed(1)}%` : "—", foot: `${cse.placement_applicants} applicants` },
  ];

  const profile = [
    { label: "Head of the Department", value: cse.hod_name ?? "—" },
    { label: "Department code", value: cse.code },
    { label: "Established", value: fmtYear(cse.established_at) },
    { label: "Programmes offered", value: String(cse.courses_offered) },
  ];

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Department Details</h1>
      <p style={{ margin: "9px 0 26px", fontSize: 13.5, color: "#64748b" }}>{cse.name} · established {fmtYear(cse.established_at)} · {cse.students} students on roll</p>

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
          {cse.courses.map((p) => (
            <div key={p.id} style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: "15px 18px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8" }}>{p.code}</span>
              </div>
              <div style={{ fontSize: 11.7, color: "#64748b", marginTop: 6 }}>{p.duration_years}-year programme</div>
            </div>
          ))}
          {cse.courses.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No courses on record for this department.</div>}
        </div>
      </div>
    </div>
  );
}
