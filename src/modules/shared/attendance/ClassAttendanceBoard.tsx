"use client";

import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, SearchBar, Select, SkeletonFilterBar, SkeletonRows, SkeletonStatTiles } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { useTodaySlots } from "@/modules/advisor/api/employee";
import {
  useClassRoster,
  useMarkClassAttendance,
  useAttendanceDraft,
  usePublishClassAttendance,
  type AttendanceMarkStatus,
  type RecognizeAttendanceResponse,
  type AttendanceDraft,
} from "@/modules/advisor/api/attendance";
import { ApiError } from "@/types/api";

/**
 * Shared class-attendance marking board — every faculty (or HOD, for a
 * class/subject they personally teach) marks attendance here, backed by the
 * exact same /me/classes/:class_id/attendance* endpoints regardless of
 * caller role (resolved server-side via the caller's own faculty profile,
 * not their JWT role). Used identically by the Faculty/Advisor portal and
 * HOD's "My Class" section — previously two separately-built
 * implementations, one with a real draft/published workflow (raw inline
 * styles), one missing Publish entirely (attendance went live the instant
 * it was saved, with no review step) — same history as MarkEntryPanel
 * before it was unified for marks.
 */

const ROMAN_YEAR = ["I", "II", "III", "IV", "V", "VI"];
function yearLabelForSemester(semester: number | null): string {
  if (semester == null) return "";
  const yearIndex = Math.ceil(semester / 2) - 1;
  return ROMAN_YEAR[yearIndex] ?? String(yearIndex + 1);
}

type Mark = AttendanceMarkStatus | null;

const todayIso = new Date().toISOString().slice(0, 10);

// Deliberately UTC throughout (Date.UTC to parse, getUTCDate/toISOString to
// serialize) — mixing a local-time constructor with setDate/getDate (local)
// and toISOString (UTC) rolls the date an extra day in any timezone ahead of
// UTC (e.g. IST, UTC+5:30: local midnight is already the previous UTC day).
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

const MARK_BUTTON_BASE = "flex h-9 min-w-9 items-center justify-center rounded-[9px] border px-2.5 text-[13px] font-extrabold transition-colors";

export function ClassAttendanceBoard() {
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

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const isToday = selectedDate === todayIso;

  const [classId, subjectId] = selectedKey ? selectedKey.split(":").map(Number) : [undefined, undefined];
  const activeClass = classes.find((c) => c.class_id === classId && c.subject_id === subjectId);

  const roster = useClassRoster(classId, subjectId);
  const draft = useAttendanceDraft(classId, subjectId, selectedDate);

  if (today.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <SkeletonFilterBar />
        <SkeletonStatTiles count={4} />
        <SkeletonRows count={6} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Attendance</h1>
        <p className="mt-1.5 text-[14px] font-medium text-muted">Mark attendance for any class you handle</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Class &amp; Subject</label>
            <Select value={selectedKey ?? ""} onChange={(e) => setSelectedKeyOverride(e.target.value)} className="font-bold">
              {classes.length === 0 && <option value="">No class scheduled for you today</option>}
              {classes.map((c) => (
                <option key={`${c.class_id}:${c.subject_id}`} value={`${c.class_id}:${c.subject_id}`}>
                  {yearLabelForSemester(c.semester)} Year · {c.department_name} · Section {c.class_section} · {c.subject_code} {c.subject_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Date</label>
            <div className="flex h-[46px] items-center gap-1.5 rounded-input border border-border-default bg-surface-input px-1.5">
              <button
                type="button"
                onClick={() => setSelectedDate(shiftIsoDate(selectedDate, -1))}
                className="flex size-9 items-center justify-center rounded-[8px] text-[16px] font-extrabold text-body hover:bg-surface-tint"
              >
                ‹
              </button>
              <div className="min-w-[110px] px-1 text-center text-[13.5px] font-bold whitespace-nowrap text-ink">
                {isToday ? "Today" : formatIsoDateLong(selectedDate)}
              </div>
              <button
                type="button"
                disabled={isToday}
                onClick={() => setSelectedDate(shiftIsoDate(selectedDate, 1))}
                className="flex size-9 items-center justify-center rounded-[8px] text-[16px] font-extrabold text-body enabled:hover:bg-surface-tint disabled:cursor-not-allowed disabled:text-disabled"
              >
                ›
              </button>
            </div>
          </div>
        </div>
        {!isToday && <div className="mt-2.5 text-[12px] font-semibold text-subtle">Viewing {formatIsoDateLong(selectedDate)}</div>}
      </Card>

      {roster.isLoading || draft.isLoading ? (
        <>
          <SkeletonStatTiles count={4} />
          <SkeletonRows count={6} />
        </>
      ) : (
        <MarkingCard
          // Remounts (and re-lazy-initializes `marks` from the freshly-loaded
          // draft) whenever the class/subject/date changes — the same
          // key-forces-reinit pattern already used elsewhere in this app for
          // "external data feeds local editable state" screens, avoiding a
          // setState-in-effect sync entirely.
          key={`${selectedKey}-${selectedDate}`}
          classId={classId}
          subjectId={subjectId}
          selectedDate={selectedDate}
          activeClass={activeClass}
          roster={roster.data}
          draft={draft.data}
        />
      )}
    </div>
  );
}

function MarkingCard({
  classId,
  subjectId,
  selectedDate,
  activeClass,
  roster,
  draft,
}: {
  classId: number | undefined;
  subjectId: number | undefined;
  selectedDate: string;
  activeClass: { semester: number | null; department_name: string; class_section: string; subject_code: string; subject_name: string } | undefined;
  roster: RecognizeAttendanceResponse | undefined;
  draft: AttendanceDraft | undefined;
}) {
  const markMutation = useMarkClassAttendance();
  const publishMutation = usePublishClassAttendance();
  const students = useMemo(() => roster?.students ?? [], [roster]);
  const isPublished = draft?.is_published ?? false;

  const [marks, setMarks] = useState<Record<number, Mark>>(() => {
    const records = draft?.records ?? [];
    if (records.length > 0) {
      return Object.fromEntries(records.map((r) => [r.student_id, r.status as Mark]));
    }
    // Fresh, never-marked class/date — default everyone to Present so
    // faculty only need to tap the few Absent/OD students. Local UI state
    // only; nothing is persisted until Save or Publish is clicked.
    return Object.fromEntries(students.map((s) => [s.student_id, "present" as Mark]));
  });

  // Search only narrows what's DISPLAYED — counts and "Mark all present"/
  // "Clear" still act on the full roster, never the filtered view, since
  // attendance is recorded for the whole class regardless of what's
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
  const noMarksYet = Object.values(marks).every((m) => m === null);

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
    markMutation.mutate({ classId, subject_id: subjectId, attendance_date: selectedDate, records, photo_url: roster?.photo_url ?? undefined });
  }

  function publish() {
    if (!classId || !subjectId || isPublished) return;
    publishMutation.mutate({ classId, subject_id: subjectId, attendance_date: selectedDate });
  }

  return (
    <>
      <Card>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Present", value: countP },
            { label: "Absent", value: countA, danger: true },
            { label: "On Duty", value: countOD },
            { label: "Left", value: countLeft, neutral: true },
          ].map((s) => (
            <div
              key={s.label}
              className={cn(
                "rounded-[11px] border px-3.5 py-3.5 text-center",
                s.danger ? "border-danger-border bg-danger-bg" : s.neutral ? "border-border-default bg-surface-tint" : "border-border-accent bg-accent-50",
              )}
            >
              <div className={cn("text-[26px] font-extrabold", s.danger ? "text-danger-fg" : s.neutral ? "text-ink" : "text-primary")}>{s.value}</div>
              <div className="mt-0.5 text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={isPublished ? "accentDark" : "neutral"}>{isPublished ? "Published" : "Draft · not published"}</Badge>
          {isPublished && <span className="text-[12px] font-semibold text-subtle">Visible to students, parents, and advisors. Locked — cannot be edited.</span>}
        </div>

        {markMutation.isError && (
          <div className="mt-3.5 rounded-[9px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[12.5px] font-semibold text-danger-fg">
            Couldn&apos;t save: {mutationErrorMessage(markMutation.error)}
          </div>
        )}
        {publishMutation.isError && (
          <div className="mt-3.5 rounded-[9px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[12.5px] font-semibold text-danger-fg">
            Couldn&apos;t publish: {mutationErrorMessage(publishMutation.error)}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Button variant="secondary" className="w-full" disabled={isPublished} onClick={() => setMarks({})}>
            Clear
          </Button>
          <Button variant="secondary" className="w-full" disabled={isPublished} loading={markMutation.isPending} onClick={save}>
            Save
          </Button>
          <Button variant="primarySmall" className="w-full" disabled={isPublished || noMarksYet} loading={publishMutation.isPending} onClick={publish}>
            {isPublished ? "Published ✓" : "Publish"}
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-5 py-4">
          <div className="text-[15px] font-extrabold tracking-[-.015em] text-ink">
            {activeClass ? `${yearLabelForSemester(activeClass.semester)} Year · ${activeClass.department_name} · Section ${activeClass.class_section} · ${activeClass.subject_code} ${activeClass.subject_name}` : ""}
          </div>
          <div className="flex-1" />
          <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or roll number" className="max-w-[260px]" />
          <div className="text-[12.5px] font-semibold whitespace-nowrap text-subtle">{students.length} students</div>
        </div>

        {filteredStudents.map((s) => {
          const m = marks[s.student_id] ?? null;
          return (
            <div key={s.student_id} className="flex items-center gap-3.5 border-b border-divider px-5 py-3 last:border-b-0">
              <Avatar name={s.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-ink">{s.name}</div>
                <div className="mt-0.5 truncate text-[11.5px] font-semibold text-subtle">{s.student_id_no}</div>
              </div>
              <div className={cn("flex shrink-0 gap-2", isPublished && "opacity-60")}>
                <button
                  type="button"
                  disabled={isPublished}
                  onClick={() => setMark(s.student_id, "present")}
                  className={cn(MARK_BUTTON_BASE, m === "present" ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-primary", isPublished && "cursor-not-allowed")}
                >
                  P
                </button>
                <button
                  type="button"
                  disabled={isPublished}
                  onClick={() => setMark(s.student_id, "absent")}
                  className={cn(MARK_BUTTON_BASE, m === "absent" ? "border-danger-border bg-danger-fg text-white" : "border-border-default bg-surface text-danger-fg", isPublished && "cursor-not-allowed")}
                >
                  A
                </button>
                <button
                  type="button"
                  disabled={isPublished}
                  onClick={() => setMark(s.student_id, "on_duty")}
                  className={cn(MARK_BUTTON_BASE, m === "on_duty" ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-primary", isPublished && "cursor-not-allowed")}
                >
                  OD
                </button>
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="px-5 py-10 text-center text-[13.5px] font-semibold text-subtle">
            {students.length === 0 ? "No students found for this class." : "No students match this search."}
          </div>
        )}
      </Card>
    </>
  );
}
