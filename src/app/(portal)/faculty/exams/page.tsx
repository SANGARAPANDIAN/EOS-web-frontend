"use client";

import { useEffect, useMemo, useState } from "react";
import { useSubjectRecords, useSubjectRecordDetail } from "@/modules/advisor/api/subject-records";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";

// Examination & Results = VIEW-ONLY for the advisor's class(es). Marks
// entry now lives entirely on Subject Records — this screen has no POST of
// any kind. Per instruction: "the advisor can view all the exam marks that
// students scored" for the class(es) they mentor, and unpublished marks
// must never appear here.
//
// CONFIRMED REAL BACKEND LIMIT, not a frontend choice: the only endpoint
// that lets a faculty read exam records at all (GET /me/subject-records) is
// scoped to subjects THAT FACULTY personally teaches
// (faculty_subject_class_mapping) — there is no endpoint anywhere that lets
// an advisor read a class's marks for a subject taught by a DIFFERENT
// faculty (e.g. an AI&DS class advisor viewing the ML subject's marks when
// a different lecturer teaches ML). This view therefore shows every
// published exam record for the advisor's own mentee class(es) — which is
// correct and complete for any subject the advisor also teaches — and
// surfaces this exact gap in the UI when a mentee class has no visible
// records, rather than inventing other faculty's subjects. Extending this
// to cross-faculty class-wide results would need a new backend endpoint
// scoped by class_mentors instead of faculty_subject_class_mapping.

function gradePill(grade: string) {
  const isFail = grade === "RA";
  return {
    padding: "5px 12px",
    borderRadius: 20,
    background: isFail ? "#FEF2F2" : "#EFF6FF",
    border: `1px solid ${isFail ? "#FECACA" : "#DBEAFE"}`,
    color: isFail ? "#DC2626" : "#1D4ED8",
    fontSize: 11.5,
    fontWeight: 800,
  } as const;
}

export default function AdvisorExamsPage() {
  const { isAdvisor, classes: menteeClasses, isLoading: advisorLoading } = useIsClassAdvisor();
  const menteeClassIds = new Set(menteeClasses.map((c) => c.class_id));

  const records = useSubjectRecords();
  const published = (records.data ?? []).filter((r) => r.is_published && menteeClassIds.has(r.class.id));

  const semesters = useMemo(() => Array.from(new Set(published.map((r) => r.exam.semester))).sort((a, b) => a - b), [published]);
  const [sem, setSem] = useState<number | null>(null);
  useEffect(() => {
    if (sem === null && semesters.length) setSem(semesters[semesters.length - 1]);
  }, [sem, semesters]);

  const inSemester = published.filter((r) => r.exam.semester === sem);
  const [mappingId, setMappingId] = useState<number | null>(null);
  useEffect(() => {
    if (inSemester.length && !inSemester.some((r) => r.exam_subject_mapping_id === mappingId)) {
      setMappingId(inSemester[0].exam_subject_mapping_id);
    }
  }, [inSemester, mappingId]);

  const active = inSemester.find((r) => r.exam_subject_mapping_id === mappingId);
  const detail = useSubjectRecordDetail(mappingId ?? undefined);

  if (!advisorLoading && !isAdvisor) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>
        You are not a class advisor for any class — Examination &amp; Results is only available to class advisors.
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Examination &amp; Results</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        Published results for {menteeClasses.map((c) => c.label).join(", ") || "your class"} · view only
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px", marginTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>SEMESTER</div>
            <select
              value={sem ?? ""}
              onChange={(e) => {
                setSem(Number(e.target.value));
                setMappingId(null);
              }}
              style={{ width: "100%", marginTop: 9, height: 44, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, color: "#0F172A", background: "#F8FAFC" }}
            >
              {semesters.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>CLASS · SUBJECT · EXAM</div>
            <select
              value={mappingId ?? ""}
              onChange={(e) => setMappingId(Number(e.target.value))}
              style={{ width: "100%", marginTop: 9, height: 44, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, color: "#0F172A", background: "#F8FAFC" }}
            >
              {inSemester.map((o) => (
                <option key={o.exam_subject_mapping_id} value={o.exam_subject_mapping_id}>
                  {o.class.label} · {o.subject.subject_code} {o.subject.name} · {o.exam.type}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F4F9", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569" }}>{inSemester.length} published record{inSemester.length === 1 ? "" : "s"} this semester</div>
        </div>
      </div>

      {published.length === 0 && !records.isLoading && (
        <div style={{ marginTop: 20, padding: 40, textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14, lineHeight: 1.6 }}>
          No published exam records yet for {menteeClasses.map((c) => c.label).join(", ") || "your class"}.
          <br />
          Only subjects you also teach can be shown here — the backend has no endpoint yet for an advisor to view a subject taught by a different faculty.
        </div>
      )}

      {active && (
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 20, overflow: "hidden" }}>
          <div style={{ padding: "22px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>RESULT</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }}>
              {active.class.label} · {active.subject.subject_code} {active.subject.name}
            </div>
            <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 600, marginTop: 4 }}>{active.exam.type} · {active.exam.academic_year}</div>

            {detail.data && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginTop: 18 }}>
                <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 11, padding: "13px 14px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: "#94A3B8" }}>STRENGTH</div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 5 }}>{detail.data.total_students}</div>
                </div>
                <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 11, padding: "13px 14px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: "#94A3B8" }}>ENTERED</div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 5 }}>{active.entered_count}</div>
                </div>
                <div data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 11, padding: "13px 14px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: "#94A3B8" }}>ARREARS</div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 5 }}>{detail.data.grade_distribution.find((g) => g.grade === "RA")?.count ?? 0}</div>
                </div>
              </div>
            )}
          </div>

          {detail.data && (
            <>
              <div style={{ padding: "0 24px 22px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 10 }}>GRADE DISTRIBUTION</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {detail.data.grade_distribution.map((g) => (
                    <div key={g.grade} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={gradePill(g.grade)}>{g.grade}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "0.6fr 2.4fr 1.2fr 1fr",
                  padding: "13px 24px",
                  background: "#F8FAFC",
                  borderTop: "1px solid #EEF1F6",
                  borderBottom: "1px solid #EEF1F6",
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: "0.09em",
                  color: "#94A3B8",
                }}
              >
                <div>RANK</div>
                <div>STUDENT</div>
                <div>ROLL NO</div>
                <div>SCORE</div>
              </div>
              {detail.data.toppers.map((t) => (
                <div key={t.rank} style={{ display: "grid", gridTemplateColumns: "0.6fr 2.4fr 1.2fr 1fr", padding: "13px 24px", borderBottom: "1px solid #F4F6FA", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1D4ED8" }}>#{t.rank}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{t.roll_no}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.score}</div>
                </div>
              ))}
              {detail.data.toppers.length === 0 && (
                <div style={{ padding: "20px 24px", fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>No marks entered yet.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
