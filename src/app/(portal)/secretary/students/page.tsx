"use client";

import { useMemo, useState } from "react";
import { useBatchesLookup, useDepartmentsLookup } from "@/modules/secretary/api/announcements";
import { useStudentsSearch, useClassMentors, type StudentRow } from "@/modules/secretary/api/overview";

// Pixel-exact layout port of the `isStudents` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 553-636.
//
// REAL BACKEND WIRING — ZERO fake data. Roster reads through
// EOSbackend1's real `GET /principal-students` (Secretary-granted,
// institution-wide — same posture as Dashboard/Reports). Honest
// departures from the design (never faked):
//   - "Class rep" has NO backing anywhere in the schema (confirmed: no
//     class_rep column/table) — dropped, not fabricated.
//   - "Mentor" IS real — `class_mentors` already models one mentor per
//     section per academic year; it was previously only ever queried for
//     a faculty's OWN mentee classes. Exposed institution-wide via
//     `GET /principal-departments/class-mentors` and joined in below.
//   - "With arrears"/"Placed"/"Not placed" lenses have no real per-student
//     field anywhere (arrears only exists as an institution-wide
//     aggregate count, not per student; no placement flag on this row
//     shape) — replaced with lenses that ARE real: attendance below 75%
//     (a real query param) and fees due (a real `fee_status` field).
//   - "Open escalations" has zero backing anywhere in the schema (grepped
//     escalation/issue/complaint/grievance — only hostel-domain
//     complaints exist, wrong audience). Replaced with a real "students
//     below 75% attendance" panel, reusing the same real data the lens
//     filter already fetches — not an invented feature.

const LENSES = ["All students", "Attendance below 75%", "CGPA above 8.5", "Fees due"] as const;

export default function SecretaryStudentsPage() {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("All sections");
  const [lens, setLens] = useState<(typeof LENSES)[number]>("All students");
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);

  const { data: roster, isLoading, error } = useStudentsSearch({ department_id: cseDept?.id, below_75: lens === "Attendance below 75%" ? true : undefined, limit: 100 });
  const allStudents = roster?.students ?? [];
  const { data: classMentors } = useClassMentors(cseDept?.id);
  const mentorBySection = useMemo(() => new Map((classMentors ?? []).map((m) => [m.section, m.mentor])), [classMentors]);

  const sectionOptions = useMemo(() => ["All sections", ...Array.from(new Set(allStudents.map((r) => r.section).filter((s): s is string => !!s))).sort()], [allStudents]);

  const rosterList = useMemo(() => {
    const rq = search.trim().toLowerCase();
    return allStudents.filter((r) => {
      if (rq && !(r.name + " " + r.student_id_no + " " + (r.section ?? "")).toLowerCase().includes(rq)) return false;
      if (section !== "All sections" && r.section !== section) return false;
      if (lens === "CGPA above 8.5") return (r.cgpa ?? 0) >= 8.5;
      if (lens === "Fees due") return r.fee_status === "due";
      return true;
    });
  }, [allStudents, search, section, lens]);

  function resetRoster() {
    setLens("All students");
    setSection("All sections");
    setSearch("");
    flash("Student filters reset.");
  }

  const sectionSummaries = useMemo(() => {
    const map = new Map<string, { name: string; count: number; attSum: number; attCount: number }>();
    for (const s of allStudents) {
      if (!s.section) continue;
      const row = map.get(s.section) ?? { name: s.section, count: 0, attSum: 0, attCount: 0 };
      row.count += 1;
      if (s.attendance_pct !== null) {
        row.attSum += s.attendance_pct;
        row.attCount += 1;
      }
      map.set(s.section, row);
    }
    return Array.from(map.values())
      .map((r) => ({ name: r.name, count: r.count, attendance: r.attCount > 0 ? Math.round((r.attSum / r.attCount) * 10) / 10 : null }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allStudents]);

  const below75 = useMemo(() => allStudents.filter((s) => s.attendance_pct !== null && s.attendance_pct < 75), [allStudents]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Student Coordination</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Department roster, section strength and students needing attention</p>
        </div>
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden", marginBottom: 22 }}>
        <div data-sec-row="" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px", borderBottom: "1px solid #eef2f7" }}>
          <h2 style={{ margin: 0, fontSize: 14.8, fontWeight: 700 }}>Student roster</h2>
          <input data-sec-lift="" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID or section" style={{ marginLeft: "auto", width: 320, height: 44, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 12.2 }} />
          <span style={{ fontSize: 11.3, color: "#64748b" }}>{rosterList.length} of {allStudents.length} students</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 22px", borderBottom: "1px solid #eef2f7", flexWrap: "wrap", background: "#ffffff" }}>
          <select value={section} onChange={(e) => setSection(e.target.value)} style={{ height: 40, border: "1px solid #e5e9f2", borderRadius: 999, padding: "0 14px", fontSize: 11.7, fontWeight: 600, color: "#0f172a", background: "#ffffff", cursor: "pointer" }}>
            {sectionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {LENSES.map((l) => (
            <button
              key={l}
              data-sec-nav-item=""
              onClick={() => setLens(l)}
              style={{ border: lens === l ? "1px solid #c7d7fe" : "1px solid #e5e9f2", background: lens === l ? "#eef4ff" : "#ffffff", color: lens === l ? "#1e3a8a" : "#475569", fontSize: 11.7, fontWeight: lens === l ? 600 : 500, borderRadius: 999, padding: "10px 16px", whiteSpace: "nowrap", cursor: "pointer" }}
            >
              {l}
            </button>
          ))}
          <span data-sec-nav-item="" onClick={resetRoster} style={{ marginLeft: "auto", border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 11.7, fontWeight: 600, borderRadius: 999, padding: "10px 18px", whiteSpace: "nowrap", cursor: "pointer" }}>Reset filters</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr 0.8fr 0.9fr 0.9fr 1fr", gap: 12, padding: "13px 22px", background: "#ffffff", borderBottom: "1px solid #eef2f7", fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8" }}>
          <span>ID</span><span>Student</span><span>Section</span><span>Attendance</span><span>CGPA</span><span style={{ textAlign: "right" }}>Fees</span>
        </div>
        {isLoading && <div style={{ padding: 34, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Loading roster…</div>}
        {error && <div style={{ padding: 34, textAlign: "center", fontSize: 12.2, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load the roster."}</div>}
        {rosterList.map((r: StudentRow) => {
          const attFg = (r.attendance_pct ?? 0) < 75 ? "#b91c1c" : (r.attendance_pct ?? 0) < 85 ? "#b45309" : "#047857";
          const cgpaFg = (r.cgpa ?? 0) < 7 ? "#b91c1c" : (r.cgpa ?? 0) >= 8.5 ? "#047857" : "#334155";
          return (
            <div
              key={r.id}
              data-sec-row=""
              style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr 0.8fr 0.9fr 0.9fr 1fr", gap: 12, alignItems: "center", padding: "14px 22px", borderBottom: "1px solid #f5f7fa" }}
            >
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#475569" }}>{r.student_id_no}</span>
              <span style={{ fontSize: 12.6, fontWeight: 500 }}>{r.name}</span>
              <span style={{ fontSize: 12.2, color: "#475569" }}>{r.section ?? "—"}</span>
              <span style={{ fontSize: 12.2, fontWeight: 600, color: attFg }}>{r.attendance_pct !== null ? `${r.attendance_pct}%` : "—"}</span>
              <span style={{ fontSize: 12.2, fontWeight: 600, color: cgpaFg }}>{r.cgpa !== null ? r.cgpa.toFixed(2) : "—"}</span>
              <span style={{ fontSize: 11.3, fontWeight: 600, textAlign: "right", color: r.fee_status === "due" ? "#b91c1c" : "#475569" }}>{r.fee_status}</span>
            </div>
          );
        })}
        {!isLoading && !error && rosterList.length === 0 && <div style={{ padding: 34, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No student matches that search.</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 22, alignItems: "start" }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f7", fontSize: 14.8, fontWeight: 700 }}>Sections — real strength &amp; attendance</div>
          {sectionSummaries.map((sec) => {
            const pctFg = sec.attendance === null ? "#94a3b8" : sec.attendance < 80 ? "#b91c1c" : sec.attendance < 88 ? "#b45309" : "#047857";
            return (
              <div key={sec.name} data-sec-row="" style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 20px", borderBottom: "1px solid #f5f7fa" }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, background: "#eef4ff", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.7, fontWeight: 700 }}>{sec.name}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.6, fontWeight: 600 }}>Section {sec.name}</div>
                  <div style={{ fontSize: 11.8, color: "#64748b" }}>{sec.count} students{mentorBySection.get(sec.name) ? ` · mentor ${mentorBySection.get(sec.name)}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13.1, fontWeight: 700, color: pctFg }}>{sec.attendance !== null ? `${sec.attendance}%` : "—"}</div>
                  <div style={{ fontSize: 11.3, color: "#94a3b8" }}>attendance</div>
                </div>
              </div>
            );
          })}
          {sectionSummaries.length === 0 && <div style={{ padding: 30, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No section data loaded yet.</div>}
        </div>

        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
          <div data-sec-row="" style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14.8, fontWeight: 700 }}>Students below 75% attendance</span>
            <span style={{ fontSize: 11.8, fontWeight: 600, background: "#eef4ff", color: "#1e3a8a", borderRadius: 999, padding: "5px 11px" }}>{below75.length}</span>
          </div>
          {below75.map((s) => (
            <div key={s.id} style={{ padding: "15px 20px", borderBottom: "1px solid #f5f7fa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "5px 10px", background: "#fef2f2", color: "#b91c1c" }}>{s.attendance_pct}%</span>
                <span style={{ fontSize: 11.8, color: "#64748b" }}>{s.section ?? "—"}</span>
              </div>
              <div style={{ fontSize: 12.6, fontWeight: 600, margin: "9px 0 3px" }}>{s.name}</div>
              <div style={{ fontSize: 11.3, color: "#64748b" }}>{s.student_id_no}</div>
            </div>
          ))}
          {below75.length === 0 && <div style={{ padding: 30, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No student below 75% attendance right now.</div>}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
