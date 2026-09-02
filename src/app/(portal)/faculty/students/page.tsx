"use client";

import { useEffect, useMemo, useState } from "react";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";
import { useMenteeRoster, type MenteeRosterStudent } from "@/modules/advisor/api/dashboard";
import { useMenteeProfile, useMenteeReport, useMenteeDocuments, useMenteeAcademicRecord, useMenteePlacements } from "@/modules/advisor/api/mentees";
import { useMenteeNoDueStudents } from "@/modules/advisor/api/no-due";
import { AdvisorIcon } from "@/modules/advisor/icons";
import { SubjectMarksTable } from "@/modules/shared/marks/SubjectMarksTable";
import { CertificateStatusGrid } from "@/modules/shared/certificates/CertificateStatusGrid";

// Design-exact layout preserved in full (every card/section/chart below
// matches the reference pixel-for-pixel). GET /me/mentees/:id/academic-record
// (added this session) now backs semester-wise GPA, monthly attendance,
// semester subjects, hostel/warden, scholarship, student status, discipline
// (malpractice_incidents) and achievements (sports_achievements) — all were
// previously empty design shells under the mistaken assumption no source
// existed for any of them. Only "School record before admission" (Class
// X/XII marks) and "Library ID" remain genuine "—" shells: no admission-time
// school-marks table or per-student library-membership model exists
// anywhere in schema.prisma (student_test_scores, the only similarly-named
// table, holds CGPA-snapshot/Aptitude test rows for placement eligibility,
// not school records).

// Real enum values (dayscholar_mode, student_type) come back as raw
// snake_case strings (e.g. "own_vehicle") — humanized for display only,
// the underlying value is untouched.
function humanize(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initialsOf(name: string | null | undefined) {
  const p = (name ?? "").split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

const FILTERS = ["All students", "Attendance < 75%", "Fees pending", "Has arrears", "CGPA 8.5+", "CGPA below 7"] as const;

export default function AdvisorStudentsPage() {
  const { isAdvisor, classes } = useIsClassAdvisor();
  const primaryClass = classes[0];
  const roster = useMenteeRoster(primaryClass?.class_id);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All students");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const students: MenteeRosterStudent[] = roster.data?.students ?? [];

  // Real per-student fee/library dues — same source the No Due page uses
  // (GET /me/mentee-no-due/students), fetched once for both buckets so this
  // page can show a real Fees column/filter instead of a permanent dash.
  const cleared = useMenteeNoDueStudents({ status: "cleared" });
  const pending = useMenteeNoDueStudents({ status: "pending" });
  const noDueById = new Map([...(cleared.data ?? []), ...(pending.data ?? [])].map((r) => [r.id, r]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (q && !(s.name.toLowerCase().includes(q) || (s.roll_no ?? "").toLowerCase().includes(q) || s.student_id_no.toLowerCase().includes(q))) return false;
      if (filter === "Attendance < 75%") return (s.attendance_percent ?? 100) < 75;
      if (filter === "Fees pending") return (noDueById.get(s.id)?.total_pending ?? 0) > 0;
      if (filter === "Has arrears") return s.arrears > 0;
      if (filter === "CGPA 8.5+") return (s.cgpa ?? 0) >= 8.5;
      if (filter === "CGPA below 7") return (s.cgpa ?? 0) < 7;
      return true;
    });
  }, [students, query, filter, cleared.data, pending.data]);

  const meanCgpa = students.length ? Math.round((students.reduce((s, r) => s + (r.cgpa ?? 0), 0) / students.length) * 100) / 100 : null;
  const meanAttendance = students.length ? Math.round((students.reduce((s, r) => s + (r.attendance_percent ?? 0), 0) / students.length) * 10) / 10 : null;
  const withArrears = students.filter((s) => s.arrears > 0).length;
  const passPct = students.length ? Math.round(((students.length - withArrears) / students.length) * 1000) / 10 : null;

  const student = students.find((s) => s.id === selectedId);
  const profile = useMenteeProfile(selectedId ?? undefined);
  const report = useMenteeReport(selectedId ?? undefined);
  const documents = useMenteeDocuments(selectedId ?? undefined);
  const academicRecord = useMenteeAcademicRecord(selectedId ?? undefined);
  const placements = useMenteePlacements(selectedId ?? undefined);
  useEffect(() => {
    if (selectedId) report.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!isAdvisor) {
    return <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>You are not a class advisor for any class.</div>;
  }

  if (student) {
    const p = profile.data;
    return (
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div
            data-advisor-lift=""
            onClick={() => setSelectedId(null)}
            style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 16px", background: "#fff", border: "1px solid #E6EAF0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}
          >
            <span style={{ fontSize: 15 }}>←</span>
            <span>Back to students</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>{student.name}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 3, fontFamily: "ui-monospace, monospace" }}>
              {student.student_id_no} · {primaryClass?.department.code ?? "—"}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div data-advisor-lift="" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "11px 17px", background: "#fff", border: "1px solid #E6EAF0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
            Print profile
          </div>
          <div data-advisor-lift="" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "11px 17px", background: "#1D4ED8", border: "1px solid #1D4ED8", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            Contact guardian
          </div>
        </div>

        {!p && profile.isLoading && <div style={{ marginTop: 20, color: "#94A3B8", fontWeight: 600 }}>Loading profile…</div>}

        {p && (
          <>
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 16, padding: 24, marginTop: 18 }}>
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "0 0 132px" }}>
                  <div
                    style={{
                      width: 132,
                      height: 168,
                      border: "1px solid #DBEAFE",
                      borderRadius: 12,
                      background: "#F2F6FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94A3B8",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    student photo
                    <br />
                    35 × 45 mm
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 320 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.035em" }}>{p.name}</div>
                  <div style={{ marginTop: 7, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
                    {p.class ? p.class.department.name : "—"} · Section {p.class?.section ?? "—"} · Batch {p.batch.start_year}–{p.batch.end_year}
                  </div>
                  <div style={{ display: "flex", gap: 9, marginTop: 15, flexWrap: "wrap" }}>
                    {[
                      `Reg ${p.register_no ?? "—"}`,
                      `Roll ${p.roll_no ?? p.student_id_no}`,
                      p.student_type,
                      p.community,
                      p.blood_group,
                    ]
                      .filter((c): c is string => Boolean(c))
                      .map((c, i) => (
                      <div key={i} data-advisor-lift="" style={{ padding: "6px 13px", borderRadius: 20, background: "#EFF6FF", border: "1px solid #DBEAFE", fontSize: 11.5, fontWeight: 800, color: "#1D4ED8" }}>
                        {c}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginTop: 20 }}>
                    <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 15 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7C8899" }}>Attendance</div>
                      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 6 }}>{student.attendance_percent ?? "—"}%</div>
                      <div style={{ height: 6, borderRadius: 6, background: "#EDF1F7", marginTop: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${student.attendance_percent ?? 0}%`, background: "#1D4ED8", borderRadius: 6 }} />
                      </div>
                    </div>
                    <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 15 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7C8899" }}>CGPA</div>
                      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 6 }}>{student.cgpa?.toFixed(2) ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 10 }}>—</div>
                    </div>
                    <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 15 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7C8899" }}>Fees</div>
                      {(() => {
                        const pendingAmt = noDueById.get(student.id)?.total_pending ?? null;
                        return (
                          <>
                            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 6 }}>
                              {pendingAmt == null ? "—" : pendingAmt > 0 ? `₹${pendingAmt.toLocaleString("en-IN")}` : "Paid"}
                            </div>
                            <div style={{ fontSize: 11, color: pendingAmt && pendingAmt > 0 ? "#DC2626" : "#94A3B8", fontWeight: 700, marginTop: 10 }}>
                              {pendingAmt && pendingAmt > 0 ? "Pending" : "—"}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 15 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7C8899" }}>Arrears</div>
                      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 6 }}>{student.arrears}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 10 }}>{student.arrears > 0 ? `${student.arrears} arrear paper(s)` : "No arrears"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 16, alignItems: "start" }}>
              {[
                {
                  title: "Personal details",
                  rows: [
                    ["Date of birth", p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"],
                    ["Gender", p.gender ?? "—"],
                    ["Blood group", p.blood_group ?? "—"],
                    ["Mother tongue", p.mother_tongue ?? "—"],
                    ["Community", p.community ?? "—"],
                    ["Admission quota", p.quota.name],
                    ["Admission number", p.admission_no ?? "—"],
                    ["Personal email", p.contacts?.student_email2 ?? p.email],
                    ["Aadhaar", report.data?.aadhar_number ?? "—"],
                  ],
                },
                {
                  title: "Contact & residence",
                  rows: [
                    ["Student mobile", p.phone ?? p.contacts?.student_mobile ?? "—"],
                    ["Institute email", p.email],
                    ["Address", p.addresses[0]?.address_line ?? "—"],
                    ["District", p.addresses[0]?.state ?? "—"],
                    ["Class mentor", primaryClass ? primaryClass.label : "—"],
                    ["Residence / transport", humanize(p.dayscholar_mode) ?? humanize(p.student_type) ?? "—"],
                  ],
                },
                {
                  title: "Academic details",
                  rows: [
                    ["Department", p.class?.department.name ?? "—"],
                    ["Programme", `${p.course.code} — ${p.course.name}`],
                    ["Batch / academic year", `${p.batch.start_year}–${p.batch.end_year}`],
                    ["Section", p.class?.section ?? "—"],
                    ["Current CGPA", student.cgpa ? student.cgpa.toFixed(2) : "—"],
                  ],
                },
                {
                  title: "Address details",
                  rows: p.addresses[0]
                    ? [
                        ["Permanent address", p.addresses[0].address_line ?? "—"],
                        [
                          "Communication address",
                          // Real second address row (a distinct address_type,
                          // e.g. "current") when one actually exists — was
                          // previously always hardcoded to "Same as permanent
                          // address" without checking for a second real row.
                          p.addresses.find((a) => a.address_type !== p.addresses[0].address_type)?.address_line ?? "Same as permanent address",
                        ],
                        ["City", p.addresses[0].city ?? "—"],
                        ["District", p.addresses[0].state ?? "—"],
                        ["State", p.addresses[0].state ?? "—"],
                        ["Pincode", p.addresses[0].pincode ?? "—"],
                      ]
                    : [["Address", "Not on file"]],
                },
              ].map((section) => (
                <div key={section.title} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>{section.title}</div>
                  <div style={{ marginTop: 8 }}>
                    {section.rows.map(([label, value]) => (
                      <div key={label} style={{ display: "flex", gap: 18, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                        <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1, minWidth: 0 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {p.family_details && (
              <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Parents &amp; guardian</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 18 }}>
                  {[
                    {
                      role: "FATHER",
                      name: p.family_details.father_name,
                      work: p.family_details.father_occupation,
                      mobile: p.family_details.father_mobile,
                      email: p.family_details.father_email,
                      tag: null as string | null,
                    },
                    {
                      role: "MOTHER",
                      name: p.family_details.mother_name,
                      work: p.family_details.mother_occupation,
                      mobile: p.family_details.mother_mobile,
                      email: p.family_details.mother_email,
                      tag: p.family_details.mother_annual_income ? `Annual family income · ₹${p.family_details.mother_annual_income} per annum` : null,
                    },
                  ]
                    .filter((r) => r.name)
                    .map((r) => (
                      <div key={r.role} data-advisor-lift="" style={{ display: "flex", gap: 16, background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 16 }}>
                        <div
                          style={{
                            width: 78,
                            height: 96,
                            flex: "0 0 78px",
                            border: "1px solid #DBEAFE",
                            borderRadius: 10,
                            background: "#F2F6FF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: "#94A3B8",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          {r.role.toLowerCase()} photo
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>{r.role}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{r.name}</div>
                          {r.work && <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginTop: 4 }}>{r.work}</div>}
                          {r.mobile && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, fontFamily: "ui-monospace, monospace" }}>{r.mobile}</div>}
                          {r.email && <div style={{ fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginTop: 3 }}>{r.email}</div>}
                          {r.tag && (
                            <div style={{ display: "inline-block", marginTop: 9, padding: "4px 11px", borderRadius: 20, background: "#EFF6FF", border: "1px solid #DBEAFE", color: "#1D4ED8", fontSize: 10.5, fontWeight: 800 }}>
                              {r.tag}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 0, marginTop: 18, paddingTop: 16, borderTop: "1px solid #F1F4F9" }}>
                  {(() => {
                    // student.guardian_name/guardian_relation are already
                    // fetched via useMenteeRoster (ClassMentorsService's own
                    // resolveGuardian: father_name else mother_name) — this
                    // was previously always a literal "—" despite that real
                    // field already being in scope on `student`.
                    const isMother = student.guardian_relation === "Mother";
                    return [
                      { label: "Guardian", value: student.guardian_name ?? "—" },
                      { label: "Guardian mobile", value: (isMother ? p.family_details.mother_mobile : p.family_details.father_mobile) ?? "—" },
                      { label: "Guardian email", value: (isMother ? p.family_details.mother_email : p.family_details.father_email) ?? "—" },
                    ];
                  })().map((g) => (
                    <div key={g.label}>
                      <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{g.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 5 }}>{g.value}</div>
                    </div>
                  ))}
                </div>

                {/* No school-record-before-admission table exists yet — empty design shell. */}
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #F1F4F9" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>School record before admission</div>
                  <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 500, marginTop: 5 }}>Verified against original mark sheets held in the admissions office</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 18 }}>
                    <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>CLASS X</div>
                          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 5 }}>—</div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7C8899", marginTop: 4 }}>—</div>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#1D4ED8" }}>—</div>
                      </div>
                    </div>
                    <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>CLASS XII</div>
                          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 5 }}>—</div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7C8899", marginTop: 4 }}>—</div>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#1D4ED8" }}>—</div>
                      </div>
                      <div style={{ display: "flex", gap: 20, marginTop: 14, paddingTop: 12, borderTop: "1px solid #EEF1F6" }}>
                        {["Maths", "Physics", "Chemistry"].map((k) => (
                          <div key={k}>
                            <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{k}</div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>—</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Real GET /me/mentees/:id/academic-record — semester GPA
                (exam_marks grouped by exams.semester, same grading bands
                Subject Records already publishes with) and monthly
                attendance (attendance_records grouped by calendar month). */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 16, alignItems: "start" }}>
              <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Semester-wise GPA</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                  {(academicRecord.data?.semesters ?? []).map((sem) => {
                    const arrears = sem.subjects.filter((s) => s.grade === "RA").length;
                    return (
                      <div key={sem.semester} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 46, fontSize: 13, fontWeight: 700 }}>Sem {sem.semester}</div>
                        <div style={{ width: 44, fontSize: 13.5, fontWeight: 800 }}>{sem.gpa !== null ? sem.gpa.toFixed(2) : "—"}</div>
                        <div style={{ flex: 1, height: 8, borderRadius: 8, background: "#EDF1F7", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${sem.gpa !== null ? (sem.gpa / 10) * 100 : 0}%`, background: "#1D4ED8", borderRadius: 8 }} />
                        </div>
                        <div style={{ width: 70, fontSize: 12, color: "#94A3B8", fontWeight: 600, textAlign: "right" }}>
                          {sem.subjects.length} subject{sem.subjects.length === 1 ? "" : "s"}
                        </div>
                        <div style={{ width: 70, fontSize: 12, fontWeight: 700, color: arrears > 0 ? "#DC2626" : "#94A3B8", textAlign: "right" }}>
                          {arrears > 0 ? `${arrears} arrear${arrears === 1 ? "" : "s"}` : "All clear"}
                        </div>
                      </div>
                    );
                  })}
                  {(academicRecord.data?.semesters ?? []).length === 0 && !academicRecord.isLoading && (
                    <div style={{ padding: "12px 0", color: "#94A3B8", fontWeight: 600, fontSize: 13 }}>No published exam results yet.</div>
                  )}
                </div>
              </div>
              <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Monthly attendance</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 160, marginTop: 20, overflowX: "auto" }}>
                  {(academicRecord.data?.monthly_attendance ?? []).slice(-12).map((m) => {
                    const [y, mo] = m.month.split("-").map(Number);
                    const label = new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-IN", { month: "short" });
                    return (
                      <div key={m.month} style={{ flex: "0 0 34px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>{m.present_percent}%</div>
                        <div style={{ width: "70%", height: `${m.present_percent}%`, background: "#93C5FD", borderRadius: "6px 6px 0 0" }} />
                        <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{label}</div>
                      </div>
                    );
                  })}
                  {(academicRecord.data?.monthly_attendance ?? []).length === 0 && !academicRecord.isLoading && (
                    <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>No attendance records yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Shared SubjectMarksTable — same component and data source
                (GET /exam-marks?student_id=) as Admin/HoD/Principal/Secretary,
                replacing the old per-semester internal/end-sem average pulled
                from /me/mentees/:id/academic-record. */}
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Examinations & results</div>
              <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 500, marginTop: 5 }}>CIA1, CIA2, Quiz and Internal marks per subject; End Sem shows a grade once published</div>
              <div style={{ marginTop: 16 }}>
                <SubjectMarksTable studentId={student.id} />
              </div>
            </div>

            {/* Fee ledger now real — GET /me/mentee-no-due/students (same
                source the No Due page uses), fetched once above for the
                whole roster. Hostel warden/scholarship/student status/
                discipline are also real now, via GET .../academic-record —
                only "Library ID" stays an honest "—" shell (no per-student
                library-membership model exists anywhere in schema.prisma).
                Hostel/day-scholar and Transport/bus-route use the real
                dayscholar_mode/vehicle_number fields already fetched into `p`. */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
              <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Fee ledger</div>
                  {(() => {
                    const due = noDueById.get(student.id);
                    if (!due) return <div style={{ fontSize: 12.5, color: "#94A3B8", fontWeight: 600 }}>—</div>;
                    const totalDemand = due.fees.reduce((s, f) => s + f.pending_amount, 0) + due.library.pending_amount;
                    return (
                      <div style={{ fontSize: 12.5, color: "#94A3B8", fontWeight: 600 }}>
                        Balance {totalDemand > 0 ? `₹${totalDemand.toLocaleString("en-IN")} pending` : "₹0 · fully cleared"}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ marginTop: 12 }}>
                  {(() => {
                    const due = noDueById.get(student.id);
                    if (!due) return <div style={{ padding: "24px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13 }}>—</div>;
                    const items = [...due.fees.map((f) => ({ item: f.category, amount: f.pending_amount, cleared: f.cleared })), { item: "Library", amount: due.library.pending_amount, cleared: due.library.cleared }];
                    return items.map((f) => (
                      <div key={f.item} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{f.item}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, width: 90, textAlign: "right" }}>{f.cleared ? "—" : `₹${f.amount.toLocaleString("en-IN")}`}</div>
                        <div style={{ padding: "4px 11px", borderRadius: 20, background: f.cleared ? "#EFF6FF" : "#FEF2F2", border: `1px solid ${f.cleared ? "#DBEAFE" : "#FECACA"}`, color: f.cleared ? "#1D4ED8" : "#DC2626", fontSize: 11, fontWeight: 800 }}>
                          {f.cleared ? "Cleared" : "Pending"}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>College / ERP record</div>
                <div style={{ marginTop: 10 }}>
                  {[
                    // student_type_enum (hosteller/dayscholar) is the actual
                    // accommodation classification this label promises —
                    // dayscholar_mode_enum (transport/own_vehicle) is a
                    // day-scholar's commute mode, a different concept, and
                    // was wrongly prioritized here (it's non-null for most
                    // day scholars, so this almost never reached
                    // student_type at all). Commute mode has its own row
                    // directly below ("Transport / bus route").
                    ["Hostel / day scholar", humanize(p.student_type) ?? "—"],
                    ["Transport / bus route", p.vehicle_number ?? "—"],
                    [
                      "Hostel warden",
                      academicRecord.data?.hostel
                        ? `${academicRecord.data.hostel.warden_name ?? "—"} · ${academicRecord.data.hostel.hostel_name} ${academicRecord.data.hostel.room_number}`
                        : "—",
                    ],
                    // No per-student library-membership model exists anywhere
                    // in this schema (library_racks/library_settings are
                    // library-wide config, not a per-student ID) — stays "—".
                    ["Library ID", "—"],
                    [
                      "Scholarship",
                      academicRecord.data?.scholarships.length
                        ? academicRecord.data.scholarships.map((s) => `${s.name} (${s.academic_year})`).join(", ")
                        : "—",
                    ],
                    ["Student status", academicRecord.data ? humanize(academicRecord.data.student_status) : "—"],
                    [
                      "Placement",
                      (() => {
                        const apps = placements.data ?? [];
                        const placed = apps.find((a) => a.application_status === "placed");
                        if (placed) return `Placed${placed.company_name ? ` · ${placed.company_name}` : ""}`;
                        if (apps.length > 0) return `In progress · ${apps.length} application${apps.length === 1 ? "" : "s"}`;
                        return "—";
                      })(),
                    ],
                    [
                      "Discipline",
                      // Real GET .../academic-record — malpractice_incidents
                      // (exam-malpractice records), the only genuine
                      // "discipline"-shaped data in this schema.
                      academicRecord.data?.discipline.length
                        ? `${academicRecord.data.discipline.length} incident${academicRecord.data.discipline.length === 1 ? "" : "s"} on file`
                        : "No incidents on file",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", gap: 18, padding: "10px 0", borderBottom: "1px solid #F4F6FA" }}>
                      <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8", marginTop: 14 }}>ACHIEVEMENTS</div>
                <div style={{ marginTop: 6 }}>
                  {/* Real GET .../academic-record — sports_achievements
                      (athlete_student_id), not department_achievements
                      (a Media-Room department news feed with no student_id). */}
                  {(academicRecord.data?.achievements.length ?? 0) > 0 ? (
                    academicRecord.data!.achievements.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #F4F6FA" }}>
                        <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>
                          {a.event_name}
                          {a.level ? ` · ${a.level}` : ""}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8" }}>{a.result}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "10px 0", color: "#94A3B8", fontWeight: 600, fontSize: 13 }}>No achievements on file</div>
                  )}
                </div>
              </div>
            </div>

            {/* Real GET /me/mentees/:id/documents — student_certificates
                rows, admin-set is_available/file_url. This table existed
                in schema.prisma with zero endpoints reading it anywhere
                before this session. */}
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>Important documents</div>
              <CertificateStatusGrid
                items={(documents.data ?? []).map((doc) => ({
                  id: doc.certificate_type_id,
                  name: doc.name,
                  is_available: doc.is_available,
                  file_url: doc.file_url,
                }))}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Student Records</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>Your mentoring class · results and student details</div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px", marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 42px" }}>
          <AdvisorIcon kind="results" width={20} height={20} style={{ color: "#1D4ED8" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.015em" }}>{primaryClass ? `${primaryClass.department.name} — ${primaryClass.section}` : "—"}</div>
          <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 600, marginTop: 3 }}>
            {primaryClass?.academic_year ?? "—"} · {students.length} student{students.length === 1 ? "" : "s"} · Class Mentor
          </div>
        </div>
        <div style={{ padding: "7px 13px", background: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: 8, fontSize: 11.5, fontWeight: 800, color: "#1D4ED8", letterSpacing: "0.05em" }}>
          MY CLASS
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginTop: 16 }}>
        {[
          { label: "Class GPA", value: meanCgpa !== null ? meanCgpa.toFixed(2) : "—", sub: `${students.length} student${students.length === 1 ? "" : "s"}` },
          { label: "Pass percentage", value: passPct !== null ? `${passPct}%` : "—", sub: `${students.length - withArrears} of ${students.length || 0} all-clear` },
          { label: "Students with arrears", value: String(withArrears), sub: withArrears === 1 ? "1 student" : `${withArrears} students` },
          { label: "Mean attendance", value: meanAttendance !== null ? `${meanAttendance}%` : "—", sub: "term to date" },
        ].map((s) => (
          <div key={s.label} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#7C8899", fontWeight: 500, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "14px 16px", marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 220, display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#F8FAFC" }}>
          <AdvisorIcon kind="search" width={15} height={15} style={{ color: "#94A3B8", flex: "0 0 15px" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Register number, name or roll number"
            style={{ flex: "1 1 0", minWidth: 0, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "#0F172A" }}
          />
        </div>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <div
              key={f}
              data-advisor-lift=""
              onClick={() => setFilter(f)}
              style={{ padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: active ? "#1D4ED8" : "#fff", border: `1px solid ${active ? "#1D4ED8" : "#E2E8F0"}`, color: active ? "#fff" : "#475569", whiteSpace: "nowrap" }}
            >
              {f}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div style={{ flex: 1, minWidth: 0, background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 0.7fr 0.7fr 0.8fr 0.9fr 1fr", padding: "15px 22px", borderBottom: "1px solid #EEF1F6", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>
            <div>STUDENT</div>
            <div>ROLL NO</div>
            <div>GPA</div>
            <div>CGPA</div>
            <div>ARREARS</div>
            <div>ATTENDANCE</div>
            <div>FEES</div>
          </div>
          {filtered.map((r) => (
            <div
              key={r.id}
              data-advisor-lift=""
              onClick={() => setSelectedId(r.id)}
              style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 0.7fr 0.7fr 0.8fr 0.9fr 1fr", padding: "13px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
                  {initialsOf(r.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{r.student_id_no}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{r.roll_no ?? "—"}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.current_semester_gpa !== null ? r.current_semester_gpa.toFixed(2) : "—"}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.cgpa !== null ? r.cgpa.toFixed(2) : "—"}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: r.arrears > 0 ? "#DC2626" : "#94A3B8" }}>{r.arrears > 0 ? r.arrears : "—"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>{r.attendance_percent !== null ? `${r.attendance_percent}%` : "—"}</div>
              <div>
                {(() => {
                  const due = noDueById.get(r.id);
                  const pendingAmt = due?.total_pending ?? null;
                  return (
                    <span
                      style={{
                        padding: "4px 11px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 800,
                        background: pendingAmt === null ? "#F1F5F9" : pendingAmt > 0 ? "#FEF2F2" : "#EFF6FF",
                        border: `1px solid ${pendingAmt === null ? "#E2E8F0" : pendingAmt > 0 ? "#FECACA" : "#DBEAFE"}`,
                        color: pendingAmt === null ? "#94A3B8" : pendingAmt > 0 ? "#DC2626" : "#1D4ED8",
                      }}
                    >
                      {pendingAmt === null ? "—" : pendingAmt > 0 ? `₹${pendingAmt.toLocaleString("en-IN")} due` : "Paid"}
                    </span>
                  );
                })()}
              </div>
            </div>
          ))}
          {filtered.length === 0 && !roster.isLoading && (
            <div style={{ padding: "54px 22px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <AdvisorIcon kind="results" width={28} height={28} style={{ color: "#CBD5E1" }} />
              </div>
              <div style={{ fontSize: 14, color: "#94A3B8", fontWeight: 600, marginTop: 14 }}>No students match this filter</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
