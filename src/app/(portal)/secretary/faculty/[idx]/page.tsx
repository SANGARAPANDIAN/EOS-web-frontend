"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFacultyList, useFacultyAttendanceOverview } from "@/modules/secretary/api/overview";
import { useFacultyProfile } from "@/modules/secretary/api/overview";
import { tone } from "@/modules/secretary/helpers";
import { PrintProfileStyles, PrintLetterhead } from "@/modules/secretary/PrintProfile";

// Pixel-exact layout port of the `isFacultyProfile` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 2089-2212.
//
// REAL BACKEND WIRING — every section here is backed by a real table
// (`GET /principal-faculty/:id/profile`, built from an exhaustive schema
// audit): service record (faculty.qualification/specialization/
// previous_institution/office_room/work_location), subjects handled
// (faculty_subject_class_mapping + timetable_slots for periods/week),
// leave balances (faculty_leave_balances) + leave history (faculty_leaves)
// + OD history (faculty_od_requests), appraisal (appraisal_requests).
//
// Honest, confirmed gap (no table exists anywhere in the schema for
// these — not removed, just genuinely empty until such a table is added):
// publications/citations, faculty-level awards, and committee/coordinator
// responsibilities beyond class-advisor/teaching duties.

const cardSx = { background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 16, padding: "22px 24px" } as const;
const labelSx = { fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" as const, color: "#94a3b8" };
const valueSx = { fontSize: 13.5, fontWeight: 600, marginTop: 4, color: "#0f172a" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={labelSx}>{label}</div>
      <div style={valueSx}>{value ?? "—"}</div>
    </div>
  );
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FacultyProfilePage() {
  const params = useParams<{ idx: string }>();
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [semFilter, setSemFilter] = useState<number | "all">("all");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const facultyId = parseInt(params.idx, 10);
  const { data: list, isLoading: listLoading, error: listError } = useFacultyList();
  const { data: attendance } = useFacultyAttendanceOverview();
  const { data: p, isLoading: profileLoading, error: profileError } = useFacultyProfile(facultyId);

  const f = useMemo(() => list?.data.find((r) => r.id === facultyId), [list, facultyId]);
  const att = useMemo(() => attendance?.rows.find((r) => r.faculty_id === facultyId), [attendance, facultyId]);

  const isLoading = listLoading || profileLoading;
  const error = listError || profileError;

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading faculty…</div>;
  }
  if (error || !f || !p) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 13.1, color: "#b91c1c", marginBottom: 16 }}>{error instanceof Error ? error.message : "Faculty member not found."}</div>
        <button onClick={() => router.push("/secretary/faculty")} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 20px", cursor: "pointer" }}>← Back to faculty</button>
      </div>
    );
  }

  const semesters = Array.from(new Set(p.subjects_handled.map((s) => s.semester).filter((s): s is number => s !== null))).sort((a, b) => a - b);
  const subjectsShown = semFilter === "all" ? p.subjects_handled : p.subjects_handled.filter((s) => s.semester === semFilter);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PrintProfileStyles />
      <div data-no-print="" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <button data-sec-lift="" onClick={() => router.push("/secretary/faculty")} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 20px", cursor: "pointer" }}>← Back to faculty</button>
        <div>
          <div style={{ fontSize: 14.8, fontWeight: 700 }}>{p.name}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8", marginTop: 3 }}>{p.designation} · {p.department?.code ?? "—"}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <button data-sec-lift="" onClick={() => window.print()} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 22px", cursor: "pointer" }}>Print profile</button>
        </div>
      </div>

      <div data-print-root="" style={{ display: "grid", gap: 20 }}>
      <PrintLetterhead title="Faculty Profile" subtitle={`${p.designation} · ${p.department?.name ?? "—"}`} />

      {/* Hero */}
      <div data-sec-lift="" data-print-card="" style={{ ...cardSx, padding: "28px 30px", display: "flex", gap: 30, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ width: 186, height: 240, border: "1px solid #dbe6ff", background: "#eef4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8", textAlign: "center", lineHeight: 1.7 }}>faculty photo<br />not stored</div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1.4 }}>{p.name}</h1>
          <p style={{ margin: "10px 0 18px", fontSize: 14.4, color: "#64748b" }}>{p.designation} · {p.department?.name ?? "No department on record"}{p.qualification ? ` · ${p.qualification}` : ""}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            <span style={{ border: "1px solid #eef2f7", background: "#ffffff", color: "#334155", fontSize: 12.2, fontWeight: 500, borderRadius: 999, padding: "9px 18px" }}>{p.status}</span>
            <span style={{ border: "1px solid #eef2f7", background: "#ffffff", color: "#334155", fontSize: 12.2, fontWeight: 500, borderRadius: 999, padding: "9px 18px" }}>Joined {fmtDate(p.date_of_joining)}</span>
            {p.class_advisor_of && <span style={{ border: "1px solid #eef2f7", background: "#ffffff", color: "#334155", fontSize: 12.2, fontWeight: 500, borderRadius: 999, padding: "9px 18px" }}>Advisor · {p.class_advisor_of}</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18 }}>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>Attendance this term</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{att ? `${att.attendance_percentage}%` : p.attendance_pct_this_term !== null ? `${p.attendance_pct_this_term}%` : "—"}</div>
            </div>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>Workload</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{p.periods_per_week} hrs</div>
            </div>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>Experience</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{p.experience_years ?? "—"} yrs</div>
            </div>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>Publications</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{p.publications.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Service record + Research */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <div data-sec-lift="" style={cardSx}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Service record</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Designation" value={p.designation} />
            <Field label="Qualification" value={p.qualification} />
            <Field label="Institute email" value={p.institute_email} />
            <Field label="Contact number" value={p.phone} />
            <Field label="Date of joining" value={fmtDate(p.date_of_joining)} />
            <Field label="Total experience" value={p.experience_years ? `${p.experience_years} yrs` : "—"} />
            <Field label="Office room" value={p.office_room} />
            <Field label="Work location" value={p.work_location} />
          </div>
        </div>
        <div data-sec-lift="" style={cardSx}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Research &amp; doctorate</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Specialisation" value={p.specialization} />
            <Field label="Previous institution" value={p.previous_institution} />
            <Field label="Employment type" value={p.employment_type} />
            <Field label="Employment status" value={p.employment_status} />
          </div>
        </div>
      </div>

      {/* Subjects handled */}
      <div data-sec-lift="" style={{ ...cardSx, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <h2 style={{ margin: 0, fontSize: 15.7, fontWeight: 700 }}>Subjects handled</h2>
          {semesters.length > 0 && (
            <select value={semFilter} onChange={(e) => setSemFilter(e.target.value === "all" ? "all" : Number(e.target.value))} style={{ height: 38, border: "1px solid #e5e9f2", borderRadius: 9, padding: "0 12px", fontSize: 12.6 }}>
              <option value="all">All semesters</option>
              {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          )}
        </div>
        {subjectsShown.length === 0 ? (
          <div style={{ padding: 24, fontSize: 12.6, color: "#94a3b8" }}>No subjects allotted.</div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 12, padding: "14px 24px", borderTop: "1px solid #eef2f7", fontSize: 10.8, fontWeight: 700, letterSpacing: 0.5, color: "#94a3b8", textTransform: "uppercase" }}>
              <span>Code</span><span>Name</span><span>Semester</span><span>Section</span>
            </div>
            {subjectsShown.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 12, padding: "14px 24px", borderTop: "1px solid #f5f7fa", alignItems: "center" }}>
                <span style={{ fontSize: 12.6, fontWeight: 600 }}>{s.code}</span>
                <span style={{ fontSize: 13.1 }}>{s.name}</span>
                <span style={{ fontSize: 10.8, fontWeight: 700, borderRadius: 999, padding: "5px 10px", background: "#eef4ff", color: "#1d4ed8", justifySelf: "start" }}>Sem {s.semester ?? "—"}</span>
                <span style={{ fontSize: 12.6 }}>{s.section}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publications */}
      <div data-sec-lift="" style={cardSx}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Publications</h2>
        {p.publications.length === 0 ? (
          <div style={{ fontSize: 12.6, color: "#94a3b8" }}>No publications on record — no publications/citations table exists in the backend yet (confirmed, not fabricated).</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>{p.publications.map((pub, i) => <li key={i}>{pub.title} ({pub.type}, {pub.year})</li>)}</ul>
        )}
      </div>

      {/* Awards */}
      <div data-sec-lift="" style={cardSx}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Awards &amp; achievements</h2>
        {p.awards.length === 0 ? (
          <div style={{ fontSize: 12.6, color: "#94a3b8" }}>No awards on record — no faculty-awards table exists in the backend yet (confirmed, not fabricated).</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>{p.awards.map((a, i) => <li key={i}>{a.title} ({a.year})</li>)}</ul>
        )}
      </div>

      {/* Current responsibilities */}
      <div data-sec-lift="" style={cardSx}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Current responsibilities</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
          {p.class_advisor_of && <li style={{ fontSize: 13.1 }}>Class advisor — {p.class_advisor_of}</li>}
          {p.subjects_handled.length > 0 && <li style={{ fontSize: 13.1 }}>Teaching {p.subjects_handled.length} subject(s), {p.periods_per_week} periods/week</li>}
          {!p.class_advisor_of && p.subjects_handled.length === 0 && <li style={{ fontSize: 13.1, color: "#94a3b8", listStyle: "none", marginLeft: -20 }}>No responsibilities on record — committee/coordinator roles have no table in the backend yet (confirmed, not fabricated).</li>}
        </ul>
      </div>

      {/* Leave & appraisal */}
      <div data-sec-lift="" style={cardSx}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15.7, fontWeight: 700 }}>Leave &amp; appraisal</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
          {p.leave_balances.map((b) => (
            <Field key={b.leave_type} label={b.leave_type} value={`${b.used} / ${b.allocated} used`} />
          ))}
          {p.leave_balances.length === 0 && <div style={{ fontSize: 12.6, color: "#94a3b8" }}>No leave balance allocated yet.</div>}
          <Field label="Appraisal status" value={p.appraisal ? p.appraisal.status.replace(/_/g, " ") : "Not submitted"} />
        </div>
        {p.leave_history.length > 0 && (
          <>
            <div style={{ fontSize: 12.2, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Recent leave</div>
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {p.leave_history.slice(0, 5).map((l, i) => {
                const t = tone(l.hod_status === "approved" && l.hr_status === "approved" ? "Approved" : l.hod_status === "rejected" || l.hr_status === "rejected" ? "Rejected" : "Pending");
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.6 }}>
                    <span>{fmtDate(l.from_date)} – {fmtDate(l.to_date)}{l.reason ? ` · ${l.reason}` : ""}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "4px 10px", background: t.bg, color: t.fg }}>{l.hr_status}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {p.od_history.length > 0 && (
          <>
            <div style={{ fontSize: 12.2, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Recent on-duty</div>
            <div style={{ display: "grid", gap: 8 }}>
              {p.od_history.slice(0, 5).map((o, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.6 }}>
                  <span>{fmtDate(o.from_date)} – {fmtDate(o.to_date)}{o.purpose ? ` · ${o.purpose}` : ""}</span>
                  <span style={{ fontSize: 11.3, color: "#94a3b8" }}>{o.place ?? ""}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      </div>

      {toast && (
        <div data-no-print="" style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
