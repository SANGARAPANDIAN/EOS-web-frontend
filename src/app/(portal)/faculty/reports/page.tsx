"use client";

import { useMemo, useState } from "react";
import { useHandledClasses } from "@/modules/advisor/api/classes";
import { useSubjectRecords, useSubjectRecordDetail } from "@/modules/advisor/api/subject-records";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";
import { useWeeklyAttendanceTrend } from "@/modules/advisor/api/reports";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { HoverDownloadButton } from "@/components/ui/HoverDownloadButton";
import { exportToPdf } from "@/lib/utils/pdf-export";

// CONNECTED FOR REAL — this page was previously 100% fabricated design
// sample data (REPORT_KPIS/ATTENDANCE_BARS/PASS_RATES/CLASS_SUMMARY
// constants), never wired to any endpoint. Composes from GET
// /me/handled-classes, GET /me/subject-records (+ per-mapping detail), the
// mentee roster when the faculty is a class advisor, and GET
// /me/reports/weekly-attendance (a real dedicated endpoint, not a
// client-side composition): attendance_records for every student in every
// class this faculty handles, grouped by ISO week.
//
// Date range: the weekly-attendance chart is filtered server-side (real
// attendance_date column). The two exam-based cards are filtered
// client-side by each exam's real start_date/end_date — there's no
// separate "report period" concept in this schema, so an exam counts as
// "in range" when its own dates overlap the chosen window.

function inRange(dateIso: string | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!dateIso) return false;
  if (from && dateIso < from) return false;
  if (to && dateIso > to) return false;
  return true;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function AdvisorReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hoverWeekly, setHoverWeekly] = useState(false);
  const [hoverPass, setHoverPass] = useState(false);
  const [hoverSummary, setHoverSummary] = useState(false);

  const handled = useHandledClasses();
  const { isAdvisor, classes: menteeClasses } = useIsClassAdvisor();
  const primaryMentee = menteeClasses[0];

  const weeklyAttendance = useWeeklyAttendanceTrend(from, to);
  const weeks = weeklyAttendance.data?.weeks ?? [];

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

  function passPctOf(detail: ReturnType<typeof useSubjectRecordDetail>["data"]) {
    if (!detail || detail.total_students === 0) return null;
    const passed = detail.grade_distribution.filter((g) => g.grade !== "RA").reduce((s, g) => s + g.count, 0);
    return Math.round((passed / detail.total_students) * 1000) / 10;
  }

  // Zips mappings + their (fixed-slot) details into one array, then
  // date-filters by the exam's own start/end date — keeps mappings[i] and
  // details[i] aligned before anything narrows the list.
  const detailsDataKey = details.map((d) => d.data).join(",");
  const examRows = useMemo(
    () =>
      mappings
        .map((m, i) => ({ mapping: m, detail: details[i]?.data, pct: passPctOf(details[i]?.data) }))
        .filter((r) => inRange(r.mapping.exam.start_date ?? r.mapping.exam.end_date, from, to)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mappings, detailsDataKey, from, to],
  );
  const totalEntered = examRows.reduce((s, r) => s + r.mapping.entered_count, 0);

  const overallPassPct = (() => {
    const withData = examRows.map((r) => r.detail).filter(Boolean) as NonNullable<ReturnType<typeof useSubjectRecordDetail>["data"]>[];
    const totalStudents = withData.reduce((s, d) => s + d.total_students, 0);
    if (totalStudents === 0) return null;
    const totalPassed = withData.reduce((s, d) => s + d.grade_distribution.filter((g) => g.grade !== "RA").reduce((a, g) => a + g.count, 0), 0);
    return Math.round((totalPassed / totalStudents) * 1000) / 10;
  })();

  const rangeSubtitle = from || to ? `${from ? fmtDate(from) : "start"} – ${to ? fmtDate(to) : "today"}` : "All time";

  async function downloadWeeklyAttendance() {
    await exportToPdf({
      title: "Weekly Attendance Trend",
      subtitle: `Across the classes you handle${primaryMentee ? ` · ${primaryMentee.label}` : ""}`,
      meta: [["Period", rangeSubtitle]],
      sections: [
        {
          type: "table",
          columns: [
            { header: "Week starting", key: "week" },
            { header: "Present %", key: "pct" },
            { header: "Marked records", key: "count" },
          ],
          rows: weeks.map((w) => ({
            week: fmtDate(w.week_start),
            pct: `${w.present_percent}%`,
            count: w.marked_count,
          })),
        },
      ],
      filename: `weekly-attendance-${from || "all"}_${to || "all"}.pdf`,
      footerBrand: true,
    });
  }

  async function downloadPassPercentage() {
    await exportToPdf({
      title: "Pass Percentage by Exam",
      subtitle: "Across the classes you handle",
      meta: [["Period", rangeSubtitle]],
      sections: [
        {
          type: "table",
          columns: [
            { header: "Class", key: "class" },
            { header: "Subject", key: "subject" },
            { header: "Exam", key: "exam" },
            { header: "Pass %", key: "pct" },
          ],
          rows: examRows.map((r) => ({
            class: r.mapping.class.label,
            subject: r.mapping.subject.subject_code,
            exam: r.mapping.exam.type,
            pct: r.pct !== null ? `${r.pct}%` : "—",
          })),
        },
      ],
      filename: `pass-percentage-${from || "all"}_${to || "all"}.pdf`,
      footerBrand: true,
    });
  }

  async function downloadClassSummary() {
    await exportToPdf({
      title: "Class-wise Summary",
      subtitle: "Across the classes you handle",
      meta: [["Period", rangeSubtitle]],
      sections: [
        {
          type: "table",
          columns: [
            { header: "Class & Subject", key: "classSubject" },
            { header: "Strength", key: "strength" },
            { header: "Entered", key: "entered" },
            { header: "Pass %", key: "pct" },
          ],
          rows: examRows.map((r) => ({
            classSubject: `${r.mapping.class.label} · ${r.mapping.subject.subject_code} ${r.mapping.subject.name}`,
            strength: r.detail ? r.detail.total_students : "—",
            entered: r.mapping.entered_count,
            pct: r.pct !== null ? `${r.pct}%` : "—",
          })),
        },
      ],
      filename: `class-wise-summary-${from || "all"}_${to || "all"}.pdf`,
      footerBrand: true,
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Reports &amp; Analytics</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
            Across the classes you handle{primaryMentee ? ` · ${primaryMentee.label}` : ""}
          </div>
        </div>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { setFrom(""); setTo(""); }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginTop: 22 }}>
        {[
          { label: "Classes handled", value: String(handledCount), sub: `${distinctSubjects} subject${distinctSubjects === 1 ? "" : "s"}` },
          { label: "Exam records entered", value: String(totalEntered), sub: `across ${examRows.length} exam record${examRows.length === 1 ? "" : "s"}` },
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
        <div
          data-advisor-lift=""
          onMouseEnter={() => setHoverWeekly(true)}
          onMouseLeave={() => setHoverWeekly(false)}
          style={{ position: "relative", background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}
        >
          <HoverDownloadButton visible={hoverWeekly} onDownload={downloadWeeklyAttendance} title="Download weekly attendance report" />
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Weekly attendance trend</div>
          <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 500, marginTop: 4 }}>
            Real attendance across every class you handle, by week
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 200, marginTop: 22, overflowX: "auto" }}>
            {weeks.map((w) => {
              const d = new Date(w.week_start + "T00:00:00Z");
              const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" });
              return (
                <div key={w.week_start} style={{ flex: "0 0 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>{w.present_percent}%</div>
                  <div style={{ width: "62%", height: `${w.present_percent}%`, background: "#1D4ED8", borderRadius: "6px 6px 0 0" }} />
                  <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 600, textAlign: "center" }}>{label}</div>
                </div>
              );
            })}
            {weeks.length === 0 && !weeklyAttendance.isLoading && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>No attendance marked yet for the classes you handle.</div>
            )}
          </div>
        </div>

        <div
          data-advisor-lift=""
          onMouseEnter={() => setHoverPass(true)}
          onMouseLeave={() => setHoverPass(false)}
          style={{ position: "relative", background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}
        >
          <HoverDownloadButton visible={hoverPass} onDownload={downloadPassPercentage} title="Download pass percentage report" />
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Pass percentage by exam</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
            {examRows.map((r) => (
              <div key={r.mapping.exam_subject_mapping_id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                  <div>{r.mapping.class.label} · {r.mapping.subject.subject_code} · {r.mapping.exam.type}</div>
                  <div style={{ color: "#1D4ED8" }}>{r.pct !== null ? `${r.pct}%` : "—"}</div>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: "#EDF1F7", marginTop: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${r.pct ?? 0}%`, background: "#1D4ED8", borderRadius: 8 }} />
                </div>
              </div>
            ))}
            {examRows.length === 0 && !records.isLoading && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>
                {from || to ? "No exam records in this date range." : "No exam records yet."}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        data-advisor-lift=""
        onMouseEnter={() => setHoverSummary(true)}
        onMouseLeave={() => setHoverSummary(false)}
        style={{ position: "relative", background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 16 }}
      >
        <HoverDownloadButton visible={hoverSummary} onDownload={downloadClassSummary} title="Download class-wise summary report" />
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
        {examRows.map((r) => (
          <div
            key={r.mapping.exam_subject_mapping_id}
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
            <div style={{ fontWeight: 700 }}>{r.mapping.class.label} · {r.mapping.subject.subject_code} {r.mapping.subject.name}</div>
            <div style={{ color: "#475569" }}>{r.detail ? r.detail.total_students : "—"}</div>
            <div style={{ color: "#475569" }}>{r.mapping.entered_count}</div>
            <div style={{ color: "#475569" }}>{r.pct !== null ? `${r.pct}%` : "—"}</div>
          </div>
        ))}
        {examRows.length === 0 && !records.isLoading && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
            {from || to ? "No exam records to summarize in this date range." : "No exam records to summarize yet."}
          </div>
        )}
      </div>
    </div>
  );
}
