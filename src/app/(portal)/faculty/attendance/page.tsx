"use client";

import { useEffect, useMemo, useState } from "react";
import { useTodaySlots } from "@/modules/advisor/api/employee";
import {
  useClassRoster,
  useMarkClassAttendance,
  useAttendanceDraft,
  usePublishClassAttendance,
  type AttendanceMarkStatus,
} from "@/modules/advisor/api/attendance";
import { ApiError } from "@/types/api";
import { AdvisorIcon } from "@/modules/advisor/icons";

// Backed by GET /me/classes/today (class+subject dropdown — only the
// periods this faculty is actually timetabled for TODAY, not every subject
// they've ever taught; a faculty with no period today sees an empty
// dropdown rather than a stale full list),
// POST /me/classes/:class_id/attendance/recognize (roster, no images sent),
// POST /me/classes/:class_id/attendance (Save — persists as a draft,
// is_published stays false), GET .../attendance/draft (re-hydrates a saved
// draft/published batch), and POST .../attendance/publish (Publish — the
// exact moment it becomes visible to students/parents/advisors in real
// time). This mirrors the Subject Records save/publish pattern exactly, per
// the explicit instruction to make attendance work "same like marks."

const ROMAN_YEAR = ["I", "II", "III", "IV", "V", "VI"];
function yearLabelForSemester(semester: number | null): string {
  if (semester == null) return "";
  const yearIndex = Math.ceil(semester / 2) - 1;
  return ROMAN_YEAR[yearIndex] ?? String(yearIndex + 1);
}

function initialsOf(name: string | null | undefined) {
  const p = (name ?? "").split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

type Mark = AttendanceMarkStatus | null;

function markStyle(on: boolean, bg: string, border: string, color: string) {
  return {
    width: 40,
    height: 34,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12.5,
    fontWeight: 800,
    cursor: "pointer",
    background: on ? bg : "#fff",
    border: `1.5px solid ${on ? bg : border}`,
    color: on ? "#fff" : color,
  } as const;
}

const todayIso = new Date().toISOString().slice(0, 10);

// Deliberately UTC throughout (Date.UTC to parse, getUTCDate/toISOString to
// serialize) — mixing a local-time constructor (`new Date(iso+"T00:00:00")`)
// with setDate/getDate (local) and toISOString (UTC) rolls the date an extra
// day in any timezone ahead of UTC (e.g. IST, UTC+5:30: local midnight is
// already the previous UTC day), which made "previous day" jump back two
// days instead of one.
function shiftIsoDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function formatIsoDateLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function mutationErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

export default function AdvisorAttendancePage() {
  const today = useTodaySlots();
  // One dropdown entry per distinct class+subject — a lab spanning two
  // consecutive periods today would otherwise produce two identical rows.
  const classes = useMemo(() => {
    const rows = today.data ?? [];
    const seen = new Set<string>();
    return rows.filter((r) => {
      const key = `${r.class_id}:${r.subject_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [today.data]);

  const [selectedKeyOverride, setSelectedKeyOverride] = useState<string | null>(null);
  const selectedKey = selectedKeyOverride ?? (classes.length ? `${classes[0].class_id}:${classes[0].subject_id}` : null);
  const setSelectedKey = setSelectedKeyOverride;

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const isToday = selectedDate === todayIso;

  const [classId, subjectId] = selectedKey ? selectedKey.split(":").map(Number) : [undefined, undefined];
  const activeClass = classes.find((c) => c.class_id === classId && c.subject_id === subjectId);

  const roster = useClassRoster(classId, subjectId);
  const draft = useAttendanceDraft(classId, subjectId, selectedDate);
  const markMutation = useMarkClassAttendance();
  const publishMutation = usePublishClassAttendance();
  const [marks, setMarks] = useState<Record<number, Mark>>({});

  // Hydrate from whatever was already saved for today (draft or published)
  // whenever the selected class/subject or its draft data changes, so a
  // reload doesn't lose in-progress marking.
  useEffect(() => {
    if (draft.data) {
      setMarks(Object.fromEntries(draft.data.records.map((r) => [r.student_id, r.status as Mark])));
    } else if (!draft.isLoading) {
      setMarks({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, draft.data]);

  const isPublished = draft.data?.is_published ?? false;
  const students = roster.data?.students ?? [];

  // Search only narrows what's DISPLAYED — counts below and "Mark all
  // present"/"Clear" still act on the full roster, never the filtered view,
  // since attendance is recorded per the whole class regardless of what's
  // currently scrolled into view.
  const [query, setQuery] = useState("");
  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.student_id_no.toLowerCase().includes(q));
  }, [students, query]);

  const countP = Object.values(marks).filter((m) => m === "present").length;
  const countA = Object.values(marks).filter((m) => m === "absent").length;
  const countOD = Object.values(marks).filter((m) => m === "on_duty").length;
  const countLeft = students.length - countP - countA - countOD;

  function setMark(studentId: number, mark: Mark) {
    if (isPublished) return;
    setMarks((prev) => ({ ...prev, [studentId]: prev[studentId] === mark ? null : mark }));
  }

  function save() {
    if (!classId || !subjectId || isPublished) return;
    const records = Object.entries(marks)
      .filter(([, m]) => m !== null)
      .map(([studentId, status]) => ({ student_id: Number(studentId), status: status as AttendanceMarkStatus }));
    if (!records.length) return;
    markMutation.mutate({ classId, subject_id: subjectId, attendance_date: selectedDate, records, photo_url: roster.data?.photo_url ?? undefined });
  }

  function publish() {
    if (!classId || !subjectId || isPublished) return;
    publishMutation.mutate({ classId, subject_id: subjectId, attendance_date: selectedDate });
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Attendance</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        Mark attendance for any class you handle
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 18, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>CLASS &amp; SUBJECT</div>
            <select
              value={selectedKey ?? ""}
              onChange={(e) => {
                setSelectedKey(e.target.value);
                setMarks({});
              }}
              style={{ width: "100%", marginTop: 9, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#0F172A", background: "#F8FAFC" }}
            >
              {classes.length === 0 && <option value="">No class scheduled for you today</option>}
              {classes.map((c) => (
                <option key={`${c.class_id}:${c.subject_id}`} value={`${c.class_id}:${c.subject_id}`}>
                  {yearLabelForSemester(c.semester)} Year · {c.department_name} · Section {c.class_section} · {c.subject_code} {c.subject_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>DATE</div>
            <div style={{ marginTop: 9, height: 46, display: "flex", alignItems: "center", gap: 6, border: "1px solid #DDE3EC", borderRadius: 10, background: "#F8FAFC", padding: "0 6px" }}>
              <div
                onClick={() => setSelectedDate(shiftIsoDate(selectedDate, -1))}
                style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569", fontSize: 16, fontWeight: 800 }}
              >
                ‹
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", padding: "0 4px" }}>
                {isToday ? "Today" : formatIsoDateLong(selectedDate)}
              </div>
              <div
                onClick={() => !isToday && setSelectedDate(shiftIsoDate(selectedDate, 1))}
                style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: isToday ? "not-allowed" : "pointer", color: isToday ? "#CBD5E1" : "#475569", fontSize: 16, fontWeight: 800 }}
              >
                ›
              </div>
            </div>
          </div>
        </div>
        {!isToday && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>
            Viewing {formatIsoDateLong(selectedDate)}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginTop: 20 }}>
          <div style={{ background: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: 12, padding: 15, textAlign: "center" }}>
            <div style={{ fontSize: 27, fontWeight: 800, color: "#1D4ED8" }}>{countP}</div>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#64748B", marginTop: 3 }}>PRESENT</div>
          </div>
          <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 12, padding: 15, textAlign: "center" }}>
            <div style={{ fontSize: 27, fontWeight: 800, color: "#DC2626" }}>{countA}</div>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#64748B", marginTop: 3 }}>ABSENT</div>
          </div>
          <div style={{ background: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: 12, padding: 15, textAlign: "center" }}>
            <div style={{ fontSize: 27, fontWeight: 800, color: "#1E3A8A" }}>{countOD}</div>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#5B7096", marginTop: 3 }}>ON DUTY</div>
          </div>
          <div style={{ background: "#F8FAFC", border: "1px solid #E6EAF0", borderRadius: 12, padding: 15, textAlign: "center" }}>
            <div style={{ fontSize: 27, fontWeight: 800, color: "#475569" }}>{countLeft}</div>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8", marginTop: 3 }}>LEFT</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <div
            style={
              isPublished
                ? { padding: "7px 14px", borderRadius: 20, background: "#EFF6FF", border: "1px solid #DBEAFE", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800 }
                : { padding: "7px 14px", borderRadius: 20, background: "#F1F5F9", border: "1px solid #CBD5E1", color: "#475569", fontSize: 11.5, fontWeight: 800 }
            }
          >
            {isPublished ? "Published" : "Draft · not published"}
          </div>
          {isPublished && (
            <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>
              Visible to students, parents, and advisors. Locked — cannot be edited.
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div
            onClick={() => !isPublished && setMarks(Object.fromEntries(students.map((s) => [s.student_id, "present" as Mark])))}
            style={{ flex: 1, textAlign: "center", padding: 13, background: isPublished ? "#F8FAFC" : "#EFF6FF", border: `1px solid ${isPublished ? "#E6EAF0" : "#BFDBFE"}`, borderRadius: 10, fontSize: 14, fontWeight: 700, color: isPublished ? "#94A3B8" : "#1D4ED8", cursor: isPublished ? "not-allowed" : "pointer" }}
          >
            Mark all present
          </div>
          <div
            onClick={() => !isPublished && setMarks({})}
            style={{ flex: 1, textAlign: "center", padding: 13, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, fontWeight: 700, color: isPublished ? "#CBD5E1" : "#475569", cursor: isPublished ? "not-allowed" : "pointer" }}
          >
            Clear
          </div>
          <div
            onClick={save}
            style={{
              flex: 1,
              textAlign: "center",
              padding: 13,
              background: isPublished ? "#E2E8F0" : markMutation.isPending ? "#93C5FD" : "#1D4ED8",
              border: `1px solid ${isPublished ? "#E2E8F0" : "#1D4ED8"}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              color: isPublished ? "#94A3B8" : "#fff",
              cursor: isPublished ? "not-allowed" : "pointer",
            }}
          >
            {markMutation.isPending ? "Saving…" : markMutation.isSuccess && !markMutation.isPending ? "Saved ✓" : "Save"}
          </div>
          <div
            onClick={publish}
            style={{
              flex: 1,
              textAlign: "center",
              padding: 13,
              background: isPublished || Object.values(marks).every((m) => m === null) ? "#E2E8F0" : publishMutation.isPending ? "#93C5FD" : "#16A34A",
              border: "1px solid transparent",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              color: isPublished || Object.values(marks).every((m) => m === null) ? "#94A3B8" : "#fff",
              cursor: isPublished || Object.values(marks).every((m) => m === null) ? "not-allowed" : "pointer",
            }}
          >
            {publishMutation.isPending ? "Publishing…" : isPublished ? "Published ✓" : "Publish"}
          </div>
        </div>

        {markMutation.isError && (
          <div style={{ marginTop: 12, padding: "11px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#DC2626" }}>
            Couldn&apos;t save: {mutationErrorMessage(markMutation.error)}
          </div>
        )}
        {publishMutation.isError && (
          <div style={{ marginTop: 12, padding: "11px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#DC2626" }}>
            Couldn&apos;t publish: {mutationErrorMessage(publishMutation.error)}
          </div>
        )}
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.015em" }}>
            {activeClass
              ? `${yearLabelForSemester(activeClass.semester)} Year · ${activeClass.department_name} · Section ${activeClass.class_section} · ${activeClass.subject_code} ${activeClass.subject_name}`
              : ""}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 9, background: "#F8FAFC", minWidth: 200 }}>
            <AdvisorIcon kind="search" width={14} height={14} style={{ color: "#94A3B8", flex: "0 0 14px" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or roll number"
              style={{ flex: "1 1 0", minWidth: 0, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "#0F172A" }}
            />
          </div>
          <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 600, whiteSpace: "nowrap" }}>{students.length} students</div>
        </div>
        {filteredStudents.map((s) => {
          const m = marks[s.student_id] ?? null;
          return (
            <div key={s.student_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: "1px solid #F4F6FA" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initialsOf(s.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{s.student_id_no}</div>
              </div>
              <div style={{ display: "flex", gap: 8, opacity: isPublished ? 0.6 : 1 }}>
                <div data-advisor-lift="" onClick={() => setMark(s.student_id, "present")} style={{ ...markStyle(m === "present", "#1D4ED8", "#BFDBFE", "#1D4ED8"), cursor: isPublished ? "not-allowed" : "pointer" }}>
                  P
                </div>
                <div data-advisor-lift="" onClick={() => setMark(s.student_id, "absent")} style={{ ...markStyle(m === "absent", "#DC2626", "#FECACA", "#DC2626"), cursor: isPublished ? "not-allowed" : "pointer" }}>
                  A
                </div>
                <div data-advisor-lift="" onClick={() => setMark(s.student_id, "on_duty")} style={{ ...markStyle(m === "on_duty", "#1E3A8A", "#BFDBFE", "#1E3A8A"), cursor: isPublished ? "not-allowed" : "pointer" }}>
                  OD
                </div>
              </div>
            </div>
          );
        })}
        {filteredStudents.length === 0 && !roster.isLoading && (
          <div style={{ padding: "40px 22px", textAlign: "center", fontSize: 13.5, color: "#94A3B8", fontWeight: 600 }}>
            {students.length === 0 ? "No students found for this class." : "No students match this search."}
          </div>
        )}
      </div>
    </div>
  );
}
