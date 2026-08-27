"use client";

import { useMemo, useState } from "react";
import { useSubjectRecords, useSubjectRecordDetail, usePublishSubjectRecord } from "@/modules/advisor/api/subject-records";
import { useExamMarkRoster, useEnterExamMarks, useUpdateExamMark } from "@/modules/advisor/api/exam-marks";

// Subject Records = the ENTRY page. Every faculty who teaches a subject
// enters marks for it here, for every class they teach that subject in —
// scoped by the real backend to subjects on their own faculty_subject_class_mapping
// (GET /me/subject-records), never other faculty's subjects. Two real
// actions: "Save" enters/updates marks via POST /me/exams/:id/marks and
// PATCH /me/exam-marks/:id (marks now exist, is_published stays false);
// "Publish" calls POST /me/subject-records/:id/publish, which is the exact
// moment those marks become visible elsewhere (Examination & Results, the
// student's own results, etc.) — this screen only ever publishes what was
// actually saved, never a synthetic action.
// Per instruction, all per-student marks entry now lives HERE, not on
// Examination & Results (that screen is now pure view-only).

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

function gradeOf(pct: number | null) {
  if (pct === null) return null;
  if (pct >= 91) return "O";
  if (pct >= 81) return "A+";
  if (pct >= 71) return "A";
  if (pct >= 61) return "B+";
  if (pct >= 50) return "B";
  return "RA";
}

export default function AdvisorSubjectRecordsPage() {
  const records = useSubjectRecords();
  const rows = records.data ?? [];

  const semesters = useMemo(() => Array.from(new Set(rows.map((r) => r.exam.semester))).sort((a, b) => a - b), [rows]);
  // Both selections are derived rather than synced via effect (same fix as
  // the Attendance/Assignment-Status pages' selectors) — default to the
  // latest semester / first mapping in it until the user picks otherwise,
  // without a setState-in-effect.
  const [semOverride, setSemOverride] = useState<number | null>(null);
  const sem = semOverride ?? (semesters.length ? semesters[semesters.length - 1] : null);
  const setSem = setSemOverride;

  const inSemester = rows.filter((r) => r.exam.semester === sem);
  const [mappingIdOverride, setMappingIdOverride] = useState<number | null>(null);
  const mappingId = inSemester.some((r) => r.exam_subject_mapping_id === mappingIdOverride)
    ? mappingIdOverride
    : inSemester.length
      ? inSemester[0].exam_subject_mapping_id
      : null;
  const setMappingId = setMappingIdOverride;

  const active = inSemester.find((r) => r.exam_subject_mapping_id === mappingId);
  // Only internal (CIA1/2/3) exams are entered by faculty here — a
  // University End Semester exam is external, published by COE through
  // its own pipeline, and shown here read-only. The backend enforces this
  // too (POST /me/exams/:id/marks and PATCH /me/exam-marks/:id both 403
  // for a non-internal mapping), this is just the matching UI gate.
  const isInternalExam = active?.exam.category === "internal";
  const detail = useSubjectRecordDetail(mappingId ?? undefined);
  const publish = usePublishSubjectRecord();

  const roster = useExamMarkRoster(mappingId ?? undefined);
  const enterMarks = useEnterExamMarks();
  const updateMark = useUpdateExamMark();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [maxMarksInput, setMaxMarksInput] = useState("100");
  const [saveError, setSaveError] = useState<string | null>(null);

  const students = roster.data?.students ?? [];
  const maxM = roster.data?.max_marks ?? (Number(maxMarksInput) || null);
  const entered = students.map((s) => s.marks_obtained).filter((m): m is number => m !== null);
  const mean = entered.length ? Math.round((entered.reduce((a, b) => a + b, 0) / entered.length) * 10) / 10 : null;

  // Client-side bounds check against max_marks — the backend already
  // rejects an out-of-range value server-side, but previously the only
  // feedback was a generic error banner after clicking Save. Flags the
  // exact row inline instead, before a round-trip is even attempted.
  function outOfRange(draftValue: string | undefined): boolean {
    if (draftValue === undefined || draftValue === "" || maxM === null) return false;
    const n = Number(draftValue);
    return Number.isFinite(n) && (n < 0 || n > maxM);
  }
  const hasOutOfRangeDraft = students.some((s) => outOfRange(drafts[s.student_id]));

  function errorMessageOf(e: unknown): string {
    if (e instanceof Error) {
      // ApiError.message can be a joined string OR (per the backend's
      // globalValidationPipe) sometimes still carries the raw array via a
      // custom `message` field on the thrown envelope — Error only exposes
      // a string, so this is already the flattened, real backend reason.
      return e.message;
    }
    return "Failed to save marks.";
  }

  function saveMarks() {
    if (!mappingId || hasOutOfRangeDraft || !isInternalExam) return;
    setSaveError(null);
    const effectiveMaxMarks = roster.data?.max_marks || Number(maxMarksInput) || 100;
    const newEntries = students
      .filter((s) => s.mark_id === null && drafts[s.student_id] !== undefined && drafts[s.student_id] !== "")
      .map((s) => ({ student_id: s.student_id, marks_obtained: Number(drafts[s.student_id]) }))
      .filter((e) => Number.isFinite(e.marks_obtained));
    if (newEntries.length) {
      enterMarks.mutate(
        { mappingId, max_marks: effectiveMaxMarks, entries: newEntries },
        { onError: (e) => setSaveError(errorMessageOf(e)) },
      );
    }
    students
      .filter((s) => s.mark_id !== null && drafts[s.student_id] !== undefined && Number(drafts[s.student_id]) !== s.marks_obtained)
      .forEach((s) =>
        updateMark.mutate(
          { id: s.mark_id as number, marks_obtained: Number(drafts[s.student_id]) },
          { onError: (e) => setSaveError(errorMessageOf(e)) },
        ),
      );
    setDrafts({});
  }

  const passCount = detail.data ? detail.data.grade_distribution.filter((g) => g.grade !== "RA").reduce((s, g) => s + g.count, 0) : 0;
  const arrearCount = detail.data?.grade_distribution.find((g) => g.grade === "RA")?.count ?? 0;
  const passPct = detail.data && detail.data.total_students > 0 ? Math.round((passCount / detail.data.total_students) * 1000) / 10 : null;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Subject Records</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        Enter marks for every subject you teach · Save keeps a draft, Publish makes it visible
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
                setDrafts({});
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
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>SUBJECT · EXAM</div>
            <select
              value={mappingId ?? ""}
              onChange={(e) => {
                setMappingId(Number(e.target.value));
                setDrafts({});
              }}
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
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569" }}>{inSemester.length} exam record{inSemester.length === 1 ? "" : "s"} this semester</div>
        </div>
      </div>

      {rows.length === 0 && !records.isLoading && (
        <div style={{ marginTop: 20, padding: 40, textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No subject records yet.</div>
      )}

      {active && (
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 20, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>CURRENT EXAM</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }}>
                {active.class.label} · {active.subject.subject_code} {active.subject.name}
              </div>
              <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 600, marginTop: 4 }}>{active.exam.type} · {active.exam.academic_year}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, flex: 1.4, minWidth: 320 }}>
              {[
                { label: "STRENGTH", value: String(students.length) },
                { label: "MEAN", value: mean !== null ? String(mean) : "—" },
                { label: "PASS %", value: passPct !== null ? `${passPct}%` : "—" },
                { label: "ARREARS", value: String(arrearCount) },
              ].map((s) => (
                <div key={s.label} data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 11, padding: "13px 14px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: "#94A3B8" }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 5 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {saveError && (
            <div style={{ marginTop: 14, padding: "11px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
              {saveError}
            </div>
          )}
          {hasOutOfRangeDraft && (
            <div style={{ marginTop: 14, padding: "11px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
              One or more marks are negative or exceed the max marks ({maxM}) — fix the highlighted row(s) before saving.
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            <div
              style={{
                padding: "9px 16px",
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 800,
                background: active.is_published ? "#EFF6FF" : "#F8FAFC",
                border: `1px solid ${active.is_published ? "#DBEAFE" : "#E2E8F0"}`,
                color: active.is_published ? "#1D4ED8" : "#94A3B8",
              }}
            >
              {active.is_published ? "Published" : "Draft · not published"}
            </div>
            {!isInternalExam && (
              <div
                style={{
                  padding: "9px 16px",
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  color: "#64748B",
                }}
              >
                University exam · published by COE, view only
              </div>
            )}
            {!roster.data?.max_marks && !active.is_published && isInternalExam && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569" }}>Max marks</div>
                <input
                  value={maxMarksInput}
                  onChange={(e) => setMaxMarksInput(e.target.value)}
                  style={{ width: 70, height: 34, border: "1px solid #DDE3EC", borderRadius: 8, padding: "0 10px", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}
                />
              </div>
            )}
            <div style={{ flex: 1 }} />
            {!active.is_published && isInternalExam && (
              <>
                <div
                  onClick={() => !hasOutOfRangeDraft && saveMarks()}
                  style={{
                    padding: "9px 18px",
                    background: hasOutOfRangeDraft ? "#F8FAFC" : "#fff",
                    border: `1px solid ${hasOutOfRangeDraft ? "#E2E8F0" : "#93C5FD"}`,
                    color: hasOutOfRangeDraft ? "#94A3B8" : "#1D4ED8",
                    borderRadius: 9,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: hasOutOfRangeDraft ? "not-allowed" : "pointer",
                  }}
                >
                  {enterMarks.isPending || updateMark.isPending ? "Saving…" : "Save"}
                </div>
                <div
                  onClick={() => active.entered_count > 0 && publish.mutate(active.exam_subject_mapping_id)}
                  style={{
                    padding: "9px 18px",
                    background: active.entered_count > 0 ? (publish.isPending ? "#93C5FD" : "#1D4ED8") : "#C7D2E0",
                    color: "#fff",
                    borderRadius: 9,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: active.entered_count > 0 ? "pointer" : "not-allowed",
                  }}
                >
                  {publish.isPending ? "Publishing…" : "Publish"}
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: 20, border: "1px solid #EEF1F6", borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2.4fr 1.2fr 1fr",
                padding: "13px 18px",
                background: "#F8FAFC",
                borderBottom: "1px solid #EEF1F6",
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: "0.09em",
                color: "#94A3B8",
              }}
            >
              <div>STUDENT</div>
              <div>MARKS OBTAINED</div>
              <div>GRADE</div>
            </div>
            {students.map((s, i) => {
              const draft = drafts[s.student_id];
              const value = draft !== undefined ? draft : s.marks_obtained !== null ? String(s.marks_obtained) : "";
              const pct = s.marks_obtained !== null && maxM ? (s.marks_obtained / maxM) * 100 : null;
              const grade = gradeOf(pct);
              const invalid = outOfRange(draft);
              return (
                <div key={s.student_id} data-advisor-lift="" style={{ display: "grid", gridTemplateColumns: "2.4fr 1.2fr 1fr", padding: "13px 18px", borderBottom: "1px solid #F4F6FA", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{ width: 26, fontSize: 12, fontWeight: 800, color: "#CBD5E1" }}>{i + 1}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{s.roll_no}</div>
                    </div>
                  </div>
                  <div>
                    <input
                      value={value}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [s.student_id]: e.target.value }))}
                      disabled={!isInternalExam || active.is_published || (roster.data?.locked && s.mark_id === null)}
                      style={{
                        width: 80,
                        height: 36,
                        border: `1px solid ${invalid ? "#FCA5A5" : "#DDE3EC"}`,
                        borderRadius: 8,
                        padding: "0 10px",
                        fontFamily: "inherit",
                        fontSize: 14,
                        fontWeight: 700,
                        background: !isInternalExam || active.is_published ? "#F8FAFC" : invalid ? "#FEF2F2" : "#fff",
                        color: invalid ? "#DC2626" : "#0F172A",
                      }}
                    />
                    <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}> / {maxM ?? "—"}</span>
                  </div>
                  <div>{grade && <span style={gradePill(grade)}>{grade}</span>}</div>
                </div>
              );
            })}
            {students.length === 0 && !roster.isLoading && (
              <div style={{ padding: "40px 18px", textAlign: "center", fontSize: 13.5, color: "#94A3B8", fontWeight: 600 }}>No students found for this exam.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
