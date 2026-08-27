"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { exportToPdf } from "@/lib/utils/pdf-export";
import {
  useStudentAttendanceOverview,
  useRollCount,
  useFacultyOverview,
  useExamsOverview,
  usePlacementsOverview,
  useStudentsSearch,
  useFacultyList,
  useFacultyAttendanceOverview,
} from "@/modules/secretary/api/overview";
import { useMyIdentity } from "@/modules/student/api/profile";

// Pixel-exact port of the `isReports` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1333-1473
// (row logic lines 3502-3535, 3106-3130).
//
// REAL BACKEND WIRING — ZERO fake data. See `src/modules/secretary/api/
// overview.ts` for the exact routes/shapes. Honest substitutions/omissions
// made where the design's own numbers have no real backend equivalent
// (each documented at the exact spot below, never invented):
//   - CGPA distribution / attendance bands: the backend has no aggregate
//     bucket-count endpoint (only a >8.5 "high CGPA" count and a <75%
//     "below_75" count exist as full-population aggregates). Bands are
//     computed from a real, capped 100-row sample (`useStudentsSearch`,
//     server max limit is 100) — subtitle is honest about sample size
//     ("sample of N of TOTAL students"), never claims to be the full roll.
//   - "With arrears" lens: there is no per-student arrears field anywhere
//     in the schema — only an institution-wide aggregate
//     (`students_with_arrears`/`arrear_papers`). Selecting this lens shows
//     that real aggregate instead of a fabricated per-student list.
//   - Roll/Section columns: `principal-students` search returns no
//     "section" field (only department + semester) — Section column
//     replaced with real Department + Semester columns.
//   - Faculty summary: "Load"/"Result %" per-faculty pass rate still have
//     no real per-faculty source (no faculty→result join anywhere) —
//     dropped, not faked. Publications now real (`faculty_publications`,
//     added by this session's migration) but this table's own dedicated
//     Faculty Profile screen is the right place for it, not a summary-
//     table column here.
//   - Downloadable reports: no server-side PDF/export service exists, but
//     jsPDF (already used elsewhere in the app) genuinely renders a real
//     downloadable file from the exact live figures on this page — a
//     different rendering path, not fabricated content.

const STUDENT_LENSES = ["Attendance below 75%", "CGPA above 8.5", "CGPA below 7", "With arrears"] as const;
const FACULTY_LENSES = ["All faculty", "Attendance below 95%"] as const;

const REPORT_DESCRIPTORS = [
  { name: "Monthly attendance summary", desc: "Present/absent counts for your department." },
  { name: "Faculty workload report", desc: "Duties and attendance per faculty member." },
  { name: "Pass percentage snapshot", desc: "Department-wise pass rate and arrears." },
  { name: "Placement summary", desc: "Season stats and department-wise placement %." },
];

const thSx = { fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" as const, color: "#94a3b8" };

export default function SecretaryReportsPage() {
  const router = useRouter();
  const [lens, setLens] = useState<(typeof STUDENT_LENSES)[number]>("Attendance below 75%");
  const [facLens, setFacLens] = useState<(typeof FACULTY_LENSES)[number]>("Attendance below 95%");
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: attOverview } = useStudentAttendanceOverview();
  const { data: rollCount } = useRollCount();
  const { data: facOverview } = useFacultyOverview();
  const { data: examsOverview } = useExamsOverview();
  const { data: placementsOverview } = usePlacementsOverview();
  const { data: sample } = useStudentsSearch({ limit: 100 });
  const { data: below75 } = useStudentsSearch({ below_75: true, limit: 100 });
  const { data: facultyList } = useFacultyList({ limit: 100 });
  const { data: facAttendance } = useFacultyAttendanceOverview();
  const { data: identity } = useMyIdentity();
  const deptName = identity?.department ?? "your department";

  const kpis = useMemo(
    () => [
      { label: "Students on roll", value: rollCount ? String(rollCount.count) : "—", foot: sample ? `sample of ${sample.students.length} of ${sample.total}` : "—" },
      { label: "Faculty & staff", value: facOverview ? String(facOverview.total_employees) : "—", foot: facOverview ? `${facOverview.teaching_count} teaching · ${facOverview.non_teaching_count} non-teaching` : "—" },
      { label: "Mean attendance", value: attOverview?.mean_attendance_pct !== null && attOverview?.mean_attendance_pct !== undefined ? `${attOverview.mean_attendance_pct.toFixed(1)}%` : "—", foot: attOverview ? `${attOverview.below_75_count} students below 75%` : "—" },
      { label: "Pass percentage", value: examsOverview?.pass_percentage !== null && examsOverview?.pass_percentage !== undefined ? `${examsOverview.pass_percentage.toFixed(1)}%` : "—", foot: examsOverview ? `${examsOverview.students_with_arrears} students with arrears · ${examsOverview.arrear_papers} papers` : "—" },
    ],
    [rollCount, sample, facOverview, attOverview, examsOverview]
  );

  const cgpaBands = useMemo(() => {
    const rows = (sample?.students ?? []).filter((s) => s.cgpa !== null);
    const total = rows.length;
    const bands = [
      { label: "CGPA above 8.5", count: rows.filter((s) => s.cgpa! >= 8.5).length, color: "#047857" },
      { label: "CGPA 7.5 – 8.5", count: rows.filter((s) => s.cgpa! >= 7.5 && s.cgpa! < 8.5).length, color: "#1d4ed8" },
      { label: "CGPA 7.0 – 7.5", count: rows.filter((s) => s.cgpa! >= 7 && s.cgpa! < 7.5).length, color: "#b45309" },
      { label: "CGPA below 7.0", count: rows.filter((s) => s.cgpa! < 7).length, color: "#b91c1c" },
    ];
    return bands.map((b) => ({ ...b, share: total > 0 ? `${Math.round((b.count / total) * 100)}%` : "0%" }));
  }, [sample]);

  const attBands = useMemo(() => {
    const rows = (sample?.students ?? []).filter((s) => s.attendance_pct !== null);
    const total = rows.length;
    const bands = [
      { label: "Above 90%", count: rows.filter((s) => s.attendance_pct! >= 90).length, color: "#047857" },
      { label: "75% – 90%", count: rows.filter((s) => s.attendance_pct! >= 75 && s.attendance_pct! < 90).length, color: "#1d4ed8" },
      { label: "65% – 75% · condonation", count: rows.filter((s) => s.attendance_pct! >= 65 && s.attendance_pct! < 75).length, color: "#b45309" },
      { label: "Below 65% · not eligible", count: rows.filter((s) => s.attendance_pct! < 65).length, color: "#b91c1c" },
    ];
    return bands.map((b) => ({ ...b, share: total > 0 ? `${Math.round((b.count / total) * 100)}%` : "0%" }));
  }, [sample]);

  const lensRows = useMemo(() => {
    if (lens === "Attendance below 75%") return below75?.students ?? [];
    const rows = sample?.students ?? [];
    if (lens === "CGPA above 8.5") return rows.filter((s) => s.cgpa !== null && s.cgpa >= 8.5);
    if (lens === "CGPA below 7") return rows.filter((s) => s.cgpa !== null && s.cgpa < 7);
    return []; // "With arrears" — no per-student field exists, see aggregate callout below instead
  }, [lens, below75, sample]);

  const facAttendanceById = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of facAttendance?.rows ?? []) map.set(r.faculty_id, r.attendance_percentage);
    return map;
  }, [facAttendance]);

  const facRows = useMemo(() => {
    const rows = (facultyList?.data ?? []).map((f) => ({ ...f, attendance_percentage: facAttendanceById.get(f.id) ?? null }));
    if (facLens === "Attendance below 95%") return rows.filter((f) => f.attendance_percentage !== null && f.attendance_percentage < 95);
    return rows;
  }, [facultyList, facAttendanceById, facLens]);

  // Real client-side PDF generation from the exact live data already on
  // this page — no server-side export service exists, but jsPDF genuinely
  // renders a real downloadable file from real numbers, so this is not
  // fabricated content, just a different (client-side) render path.
  const today = () => new Date().toISOString().slice(0, 10);

  async function onGenerate(name: string) {
    try {
      if (name === "Monthly attendance summary") {
        await exportToPdf({
          title: "Monthly Attendance Summary",
          subtitle: `${deptName}, live from EOSbackend1`,
          meta: [["Mean attendance", kpis[2].value], ["Below 75%", String(attOverview?.below_75_count ?? "—")]],
          sections: [
            {
              type: "table",
              title: "Attendance bands (sample)",
              columns: [{ header: "Band", key: "label" }, { header: "Count", key: "count" }, { header: "Share", key: "share" }],
              rows: attBands.map((b) => ({ label: b.label, count: b.count, share: b.share })),
            },
          ],
          filename: `monthly-attendance-summary-${today()}.pdf`,
        });
      } else if (name === "Faculty workload report") {
        await exportToPdf({
          title: "Faculty Workload Report",
          subtitle: "Duties and attendance per faculty member — live from EOSbackend1",
          meta: [["Faculty listed", String(facRows.length)]],
          sections: [
            {
              type: "table",
              columns: [{ header: "Faculty", key: "name" }, { header: "Designation", key: "designation" }, { header: "Department", key: "dept" }, { header: "Attendance", key: "att" }, { header: "Email", key: "email" }],
              rows: facRows.map((f) => ({
                name: `${f.first_name} ${f.last_name}`,
                designation: f.designation,
                dept: f.department?.code ?? "—",
                att: f.attendance_percentage !== null ? `${f.attendance_percentage}%` : "—",
                email: f.email,
              })),
            },
          ],
          filename: `faculty-workload-report-${today()}.pdf`,
        });
      } else if (name === "Pass percentage snapshot") {
        await exportToPdf({
          title: "Pass Percentage Snapshot",
          subtitle: `${deptName}, live from EOSbackend1`,
          meta: [["Pass percentage", kpis[3].value], ["Students with arrears", String(examsOverview?.students_with_arrears ?? "—")], ["Arrear papers", String(examsOverview?.arrear_papers ?? "—")]],
          sections: [
            {
              type: "table",
              title: "CGPA distribution (sample)",
              columns: [{ header: "Band", key: "label" }, { header: "Count", key: "count" }, { header: "Share", key: "share" }],
              rows: cgpaBands.map((b) => ({ label: b.label, count: b.count, share: b.share })),
            },
          ],
          filename: `pass-percentage-snapshot-${today()}.pdf`,
        });
      } else if (name === "Placement summary") {
        await exportToPdf({
          title: "Placement Summary",
          subtitle: "Season stats — live from EOSbackend1",
          meta: [
            ["Students placed", String(placementsOverview?.students_placed ?? "—")],
            ["Applicants", String(placementsOverview?.applicants ?? "—")],
            ["Placement %", placementsOverview?.placement_pct !== null && placementsOverview?.placement_pct !== undefined ? `${placementsOverview.placement_pct.toFixed(1)}%` : "—"],
            ["Companies", String(placementsOverview?.companies ?? "—")],
          ],
          sections: [
            {
              type: "table",
              title: "Department-wise placement",
              columns: [{ header: "Department", key: "dept" }, { header: "%", key: "pct" }],
              rows: (placementsOverview?.departments ?? []).map((d) => ({
                dept: d.code,
                pct: d.placement_pct !== null ? `${d.placement_pct.toFixed(1)}%` : "—",
              })),
            },
          ],
          filename: `placement-summary-${today()}.pdf`,
        });
      }
      flash(`${name} downloaded.`);
    } catch (err) {
      flash(err instanceof Error ? `Could not generate the PDF: ${err.message}` : "Could not generate the PDF.");
    }
  }

  async function onExportFullReport() {
    try {
      await exportToPdf({
        title: `${deptName} Report — Full Summary`,
        subtitle: "Students, faculty, results and placements — live from EOSbackend1",
        meta: kpis.map((k) => [k.label, k.value] as [string, string]),
        sections: [
          {
            type: "table",
            title: "CGPA distribution (sample)",
            columns: [{ header: "Band", key: "label" }, { header: "Count", key: "count" }, { header: "Share", key: "share" }],
            rows: cgpaBands.map((b) => ({ label: b.label, count: b.count, share: b.share })),
          },
          {
            type: "table",
            title: "Attendance bands (sample)",
            columns: [{ header: "Band", key: "label" }, { header: "Count", key: "count" }, { header: "Share", key: "share" }],
            rows: attBands.map((b) => ({ label: b.label, count: b.count, share: b.share })),
          },
          {
            type: "table",
            title: "Faculty summary",
            columns: [{ header: "Faculty", key: "name" }, { header: "Designation", key: "designation" }, { header: "Department", key: "dept" }, { header: "Attendance", key: "att" }],
            rows: facRows.map((f) => ({ name: `${f.first_name} ${f.last_name}`, designation: f.designation, dept: f.department?.code ?? "—", att: f.attendance_percentage !== null ? `${f.attendance_percentage}%` : "—" })),
          },
        ],
        filename: `institution-report-${today()}.pdf`,
      });
      flash("Full report downloaded.");
    } catch (err) {
      flash(err instanceof Error ? `Could not generate the PDF: ${err.message}` : "Could not generate the PDF.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Reports &amp; Analytics</h1>
          <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#64748b" }}>{deptName} picture — students, faculty, results and placements, live from EOSbackend1</p>
        </div>
        <button onClick={onExportFullReport} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.5, fontWeight: 600, borderRadius: 12, padding: "16px 28px", cursor: "pointer" }}>Export full report</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 20, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 13.1, color: "#475569" }}>{k.label}</div>
            <div style={{ fontSize: 29.6, fontWeight: 700, letterSpacing: -1.2, margin: "8px 0 4px" }}>{k.value}</div>
            <div style={{ fontSize: 11.7, color: "#94a3b8" }}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 15.7, fontWeight: 700 }}>CGPA distribution</h2>
          <p style={{ margin: "0 0 18px", fontSize: 11.7, color: "#94a3b8" }}>Sample of {sample?.students.length ?? 0} of {sample?.total ?? "—"} students on roll</p>
          {cgpaBands.map((b) => (
            <div key={b.label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.6 }}>
                <span style={{ fontWeight: 500, color: "#334155" }}>{b.label}</span>
                <span style={{ fontWeight: 700 }}>{b.count} <span style={{ fontWeight: 500, color: "#94a3b8" }}>· {b.share}</span></span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "#eef2f7", marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 999, background: b.color, width: b.share }} />
              </div>
            </div>
          ))}
        </div>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 15.7, fontWeight: 700 }}>Attendance bands</h2>
          <p style={{ margin: "0 0 18px", fontSize: 11.7, color: "#94a3b8" }}>Condonation applies below 75% · CIA eligibility below 65%</p>
          {attBands.map((b) => (
            <div key={b.label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.6 }}>
                <span style={{ fontWeight: 500, color: "#334155" }}>{b.label}</span>
                <span style={{ fontWeight: 700 }}>{b.count} <span style={{ fontWeight: 500, color: "#94a3b8" }}>· {b.share}</span></span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "#eef2f7", marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 999, background: b.color, width: b.share }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <div data-sec-row="" style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid #eef2f7", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 15.7, fontWeight: 700 }}>Students needing attention</h2>
          <div style={{ display: "flex", gap: 8, marginLeft: 20 }}>
            {STUDENT_LENSES.map((l) => (
              <button key={l} data-sec-nav-item="" onClick={() => setLens(l)} style={{ border: lens === l ? "1px solid #c7d7fe" : "1px solid #e5e9f2", background: lens === l ? "#eef4ff" : "#ffffff", color: lens === l ? "#1e3a8a" : "#475569", fontSize: 11.7, fontWeight: lens === l ? 600 : 500, borderRadius: 999, padding: "8px 16px", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <span style={{ marginLeft: "auto", fontSize: 11.7, color: "#64748b" }}>{lens === "With arrears" ? `${examsOverview?.students_with_arrears ?? 0} students (${deptName} total)` : `${lensRows.length} students listed`}</span>
        </div>
        {lens === "With arrears" ? (
          <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#64748b", lineHeight: 1.6 }}>
            No per-student arrears field exists in the backend — only a {deptName} total is available:<br />
            <strong>{examsOverview?.students_with_arrears ?? "—"} students</strong> with <strong>{examsOverview?.arrear_papers ?? "—"} arrear papers</strong> combined.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr 1fr 0.8fr 0.9fr 0.9fr 1.2fr", gap: 12, padding: "13px 24px", background: "#ffffff", borderBottom: "1px solid #eef2f7" }}>
              <span style={thSx}>Student ID</span><span style={thSx}>Student</span><span style={thSx}>Department</span><span style={thSx}>Sem.</span><span style={thSx}>Attendance</span><span style={thSx}>CGPA</span><span style={{ ...thSx, textAlign: "right" }}>Action</span>
            </div>
            {lensRows.map((r) => {
              const attFg = r.attendance_pct === null ? "#94a3b8" : r.attendance_pct < 75 ? "#b91c1c" : r.attendance_pct < 85 ? "#b45309" : "#047857";
              const cgpaFg = r.cgpa === null ? "#94a3b8" : r.cgpa < 7 ? "#b91c1c" : r.cgpa >= 8.5 ? "#047857" : "#334155";
              return (
                <div key={r.id} data-sec-row="" style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr 1fr 0.8fr 0.9fr 0.9fr 1.2fr", gap: 12, alignItems: "center", padding: "0 24px", borderBottom: "1px solid #f5f7fa" }}>
                  <button data-sec-fade="" onClick={() => router.push(`/secretary/students/${r.register_no}`)} style={{ gridColumn: "1 / 7", display: "grid", gridTemplateColumns: "1.2fr 1.8fr 1fr 0.8fr 0.9fr 0.9fr", gap: 12, alignItems: "center", textAlign: "left", border: 0, background: "transparent", padding: "14px 0", cursor: "pointer" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#475569" }}>{r.student_id_no}</span>
                    <span style={{ fontSize: 12.6, fontWeight: 500, color: "#1d4ed8" }}>{r.name}</span>
                    <span style={{ fontSize: 12.2, color: "#475569" }}>{r.department_code}</span>
                    <span style={{ fontSize: 12.2, color: "#475569" }}>{r.semester ?? "—"}</span>
                    <span style={{ fontSize: 12.2, fontWeight: 600, color: attFg }}>{r.attendance_pct !== null ? `${r.attendance_pct}%` : "—"}</span>
                    <span style={{ fontSize: 12.2, fontWeight: 600, color: cgpaFg }}>{r.cgpa !== null ? r.cgpa.toFixed(2) : "—"}</span>
                  </button>
                  <button data-sec-soft="" onClick={() => router.push(`/secretary/students/${r.register_no}`)} style={{ justifySelf: "end", border: "1px solid #dbe6ff", background: "#ffffff", color: "#1e3a8a", fontSize: 11.3, fontWeight: 600, borderRadius: 9, padding: "8px 14px", cursor: "pointer" }}>View profile</button>
                </div>
              );
            })}
            {lensRows.length === 0 && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No student falls in this band.</div>}
          </>
        )}
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid #eef2f7", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 15.7, fontWeight: 700 }}>Faculty summary</h2>
          <div style={{ display: "flex", gap: 8, marginLeft: 20 }}>
            {FACULTY_LENSES.map((l) => (
              <button key={l} data-sec-nav-item="" onClick={() => setFacLens(l)} style={{ border: facLens === l ? "1px solid #c7d7fe" : "1px solid #e5e9f2", background: facLens === l ? "#eef4ff" : "#ffffff", color: facLens === l ? "#1e3a8a" : "#475569", fontSize: 11.7, fontWeight: facLens === l ? 600 : 500, borderRadius: 999, padding: "8px 16px", whiteSpace: "nowrap", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <span style={{ marginLeft: "auto", fontSize: 11.7, color: "#64748b" }}>{facRows.length} faculty listed</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1fr 1fr 1.6fr", gap: 12, padding: "13px 24px", background: "#ffffff", borderBottom: "1px solid #eef2f7" }}>
          <span style={thSx}>Faculty</span><span style={thSx}>Designation</span><span style={thSx}>Department</span><span style={thSx}>Attendance</span><span style={thSx}>Email</span>
        </div>
        {facRows.map((f) => {
          const attFg = f.attendance_percentage === null ? "#94a3b8" : f.attendance_percentage < 95 ? "#b45309" : "#047857";
          return (
            <button key={f.id} data-sec-row="" onClick={() => router.push(`/secretary/faculty/${f.id}`)} style={{ display: "grid", width: "100%", textAlign: "left", gridTemplateColumns: "1.6fr 1.2fr 1fr 1fr 1.6fr", gap: 12, alignItems: "center", padding: "14px 24px", border: 0, borderBottom: "1px solid #f5f7fa", background: "#ffffff", cursor: "pointer" }}>
              <span style={{ fontSize: 12.6, fontWeight: 500, color: "#1d4ed8" }}>{f.first_name} {f.last_name}</span>
              <span style={{ fontSize: 12.2, color: "#475569" }}>{f.designation}</span>
              <span style={{ fontSize: 12.2, color: "#475569" }}>{f.department?.code ?? "—"}</span>
              <span style={{ fontSize: 12.2, fontWeight: 600, color: attFg }}>{f.attendance_percentage !== null ? `${f.attendance_percentage}%` : "—"}</span>
              <span style={{ fontSize: 12.2, color: "#475569" }}>{f.email}</span>
            </button>
          );
        })}
        {facRows.length === 0 && <div style={{ padding: "30px 24px", fontSize: 13.1, color: "#94a3b8" }}>No faculty match this filter.</div>}
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 15.7, fontWeight: 700 }}>Downloadable reports</h2>
        <p style={{ margin: "0 0 14px", fontSize: 11.7, color: "#94a3b8" }}>Generates a real PDF client-side from the exact live figures above — no server-side export service exists, this renders directly from the same data on screen.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {REPORT_DESCRIPTORS.map((r) => (
            <div key={r.name} style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13.1, fontWeight: 600 }}>{r.name}</span>
              </div>
              <div style={{ fontSize: 11.7, color: "#64748b", lineHeight: 1.5, marginTop: 6 }}>{r.desc}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                <button data-sec-soft="" onClick={() => onGenerate(r.name)} style={{ marginLeft: "auto", border: "1px solid #dbe6ff", background: "#ffffff", color: "#1e3a8a", fontSize: 11.3, fontWeight: 600, borderRadius: 9, padding: "8px 14px", cursor: "pointer" }}>Generate</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
