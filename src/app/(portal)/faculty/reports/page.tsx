"use client";

import { useHandledClasses } from "@/modules/advisor/api/classes";
import { useSubjectRecords, useSubjectRecordDetail } from "@/modules/advisor/api/subject-records";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";

// CONNECTED FOR REAL — this page was previously 100% fabricated design
// sample data (REPORT_KPIS/ATTENDANCE_BARS/PASS_RATES/CLASS_SUMMARY
// constants), never wired to any endpoint. There is no dedicated "reports"
// backend endpoint, so this composes from GET /me/handled-classes and
// GET /me/subject-records (+ per-mapping detail for grade distribution),
// plus the mentee roster when the faculty is a class advisor. Anything the
// backend genuinely has no source for (a weekly attendance trend, a raw
// numeric CIA average) is omitted rather than invented — real subject
// records only expose grade-distribution counts, not per-exam averages.

export default function AdvisorReportsPage() {
  const handled = useHandledClasses();
  const { isAdvisor, classes: menteeClasses } = useIsClassAdvisor();
  const primaryMentee = menteeClasses[0];

  const records = useSubjectRecords();
  const mappings = (records.data ?? []).slice(0, 4);
  // Fixed 4 hook slots (never a variable-length loop, per Rules of Hooks).
  const d0 = useSubjectRecordDetail(mappings[0]?.exam_subject_mapping_id);
  const d1 = useSubjectRecordDetail(mappings[1]?.exam_subject_mapping_id);
  const d2 = useSubjectRecordDetail(mappings[2]?.exam_subject_mapping_id);
  const d3 = useSubjectRecordDetail(mappings[3]?.exam_subject_mapping_id);
  const details = [d0, d1, d2, d3].slice(0, mappings.length);

  const handledCount = new Set((handled.data ?? []).map((c) => `${c.class_id}-${c.subject_id}`)).size;
  const distinctSubjects = new Set((handled.data ?? []).map((c) => c.subject_id)).size;
  const totalEntered = mappings.reduce((s, m) => s + m.entered_count, 0);

  function passPctOf(detail: ReturnType<typeof useSubjectRecordDetail>["data"]) {
    if (!detail || detail.total_students === 0) return null;
    const passed = detail.grade_distribution.filter((g) => g.grade !== "RA").reduce((s, g) => s + g.count, 0);
    return Math.round((passed / detail.total_students) * 1000) / 10;
  }

  const overallPassPct = (() => {
    const withData = details.map((d) => d.data).filter(Boolean) as NonNullable<ReturnType<typeof useSubjectRecordDetail>["data"]>[];
    const totalStudents = withData.reduce((s, d) => s + d.total_students, 0);
    if (totalStudents === 0) return null;
    const totalPassed = withData.reduce((s, d) => s + d.grade_distribution.filter((g) => g.grade !== "RA").reduce((a, g) => a + g.count, 0), 0);
    return Math.round((totalPassed / totalStudents) * 1000) / 10;
  })();

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Reports &amp; Analytics</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        Across the classes you handle{primaryMentee ? ` · ${primaryMentee.label}` : ""}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginTop: 22 }}>
        {[
          { label: "Classes handled", value: String(handledCount), sub: `${distinctSubjects} subject${distinctSubjects === 1 ? "" : "s"}` },
          { label: "Exam records entered", value: String(totalEntered), sub: `across ${mappings.length} exam record${mappings.length === 1 ? "" : "s"}` },
          { label: "Overall pass percentage", value: overallPassPct !== null ? `${overallPassPct}%` : "—", sub: "from published/entered marks" },
          { label: "Class advisor", value: isAdvisor ? "Yes" : "No", sub: primaryMentee?.label ?? "not assigned to a class" },
        ].map((k) => (
          <div key={k.label} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#7C8899", fontWeight: 500, marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Grade distribution by exam</div>
          <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 500, marginTop: 4 }}>
            No weekly attendance-trend endpoint exists yet — this chart shows real grade distribution per exam record instead.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
            {mappings.map((m, i) => {
              const detail = details[i]?.data;
              return (
                <div key={m.exam_subject_mapping_id}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {m.class.label} · {m.subject.subject_code} · {m.exam.type}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {detail ? (
                      detail.grade_distribution.map((g) => (
                        <div
                          key={g.grade}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 800,
                            background: g.grade === "RA" ? "#FEF2F2" : "#EFF6FF",
                            border: `1px solid ${g.grade === "RA" ? "#FECACA" : "#DBEAFE"}`,
                            color: g.grade === "RA" ? "#DC2626" : "#1D4ED8",
                          }}
                        >
                          {g.grade}: {g.count}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>Loading…</div>
                    )}
                  </div>
                </div>
              );
            })}
            {mappings.length === 0 && !records.isLoading && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>No exam records yet for the subjects you handle.</div>
            )}
          </div>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Pass percentage by exam</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
            {mappings.map((m, i) => {
              const pct = passPctOf(details[i]?.data);
              return (
                <div key={m.exam_subject_mapping_id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                    <div>{m.class.label} · {m.subject.subject_code}</div>
                    <div style={{ color: "#1D4ED8" }}>{pct !== null ? `${pct}%` : "—"}</div>
                  </div>
                  <div style={{ height: 8, borderRadius: 8, background: "#EDF1F7", marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct ?? 0}%`, background: "#1D4ED8", borderRadius: 8 }} />
                  </div>
                </div>
              );
            })}
            {mappings.length === 0 && !records.isLoading && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>No exam records yet.</div>
            )}
          </div>
        </div>
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Class-wise summary</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            padding: "14px 0 12px",
            borderBottom: "1px solid #EEF1F6",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#94A3B8",
          }}
        >
          <div>CLASS &amp; SUBJECT</div>
          <div>STRENGTH</div>
          <div>ENTERED</div>
          <div>PASS %</div>
        </div>
        {mappings.map((m, i) => {
          const detail = details[i]?.data;
          const pct = passPctOf(detail);
          return (
            <div
              key={m.exam_subject_mapping_id}
              data-advisor-lift=""
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                padding: "15px 0",
                borderBottom: "1px solid #F4F6FA",
                fontSize: 13.5,
                fontWeight: 600,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 700 }}>{m.class.label} · {m.subject.subject_code} {m.subject.name}</div>
              <div style={{ color: "#475569" }}>{detail ? detail.total_students : "—"}</div>
              <div style={{ color: "#475569" }}>{m.entered_count}</div>
              <div style={{ color: "#475569" }}>{pct !== null ? `${pct}%` : "—"}</div>
            </div>
          );
        })}
        {mappings.length === 0 && !records.isLoading && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No exam records to summarize yet.</div>
        )}
      </div>
    </div>
  );
}
