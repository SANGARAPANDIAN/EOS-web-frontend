"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Select, EmptyState } from "@/components/ui";
import { useMyExamSchedule, type ExamScheduleRow } from "@/modules/student/api/examSchedule";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";

const SESSION_LABEL: Record<ExamScheduleRow["session"], string> = { FN: "Forenoon", AN: "Afternoon" };
const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1);

// Fixed, always-shown buckets matching the design reference's "Internal 1 /
// Internal 2 / Semester" buttons, mapped onto the real exam_types.name
// values (the full "Internal Assessment I" etc. strings, not these short
// labels). A real exam type outside this map — e.g. "Model Examination" —
// still gets its own button, appended after the fixed three, rather than
// being silently hidden.
const FIXED_EXAM_TYPE_BUCKETS: { label: string; realType: string }[] = [
  { label: "Internal 1", realType: "Internal Assessment I" },
  { label: "Internal 2", realType: "Internal Assessment II" },
  { label: "Semester", realType: "University Semester Examination" },
];

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function ExamSchedulePage() {
  const examSchedule = useMyExamSchedule();
  const academicCalendar = useMyAcademicCalendar();

  const [semesterOverride, setSemesterOverride] = useState<number | null>(null);
  const [examType, setExamType] = useState<string>(FIXED_EXAM_TYPE_BUCKETS[0].realType);

  // Defaults to the student's real current semester once it's known, but a
  // manual pick always wins — same pattern as the Performance page's own
  // semester selector.
  const semester = semesterOverride ?? academicCalendar.data?.semester ?? 5;

  const examTypeButtons = useMemo(() => {
    const fixedRealTypes = new Set(FIXED_EXAM_TYPE_BUCKETS.map((b) => b.realType));
    const extra = new Set<string>();
    for (const r of examSchedule.data ?? []) {
      if (r.semester === semester && !fixedRealTypes.has(r.exam_type)) extra.add(r.exam_type);
    }
    return [...FIXED_EXAM_TYPE_BUCKETS, ...Array.from(extra).map((realType) => ({ label: realType, realType }))];
  }, [examSchedule.data, semester]);

  const filtered = useMemo(() => {
    const rows = examSchedule.data ?? [];
    return rows.filter((r) => r.semester === semester && r.exam_type === examType);
  }, [examSchedule.data, semester, examType]);

  // Real per-row start/end times, so the footnote reflects whichever
  // session windows actually appear in the current filter rather than a
  // hardcoded figure — a session is only shown once every row that uses it
  // agrees on the same start/end, so a mixed filter never states a time
  // that's wrong for some rows.
  const sessionWindow = useMemo(() => {
    const windows: Partial<Record<ExamScheduleRow["session"], { start: string; end: string } | "mixed">> = {};
    for (const r of filtered) {
      const existing = windows[r.session];
      if (!existing) windows[r.session] = { start: r.start_time, end: r.end_time };
      else if (existing !== "mixed" && (existing.start !== r.start_time || existing.end !== r.end_time)) {
        windows[r.session] = "mixed";
      }
    }
    return windows;
  }, [filtered]);

  const footnote = (["FN", "AN"] as const)
    .filter((s) => sessionWindow[s] && sessionWindow[s] !== "mixed")
    .map((s) => {
      const w = sessionWindow[s] as { start: string; end: string };
      return `${SESSION_LABEL[s]} ${w.start}–${w.end}`;
    })
    .join(" · ");

  const gridCols = "1fr 2.6fr 1fr 1fr";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Exam schedule</h1>
        <p className="mt-1 text-[13.5px] text-muted">Internal assessments and end-semester examinations</p>
      </div>

      <Card className="flex flex-wrap items-end gap-[22px]">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-bold text-muted">Semester</label>
          <Select value={semester} onChange={(e) => setSemesterOverride(Number(e.target.value))} className="w-auto min-w-[220px]">
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {examTypeButtons.map((t) => {
            const active = t.realType === examType;
            return (
              <button
                key={t.realType}
                onClick={() => setExamType(t.realType)}
                className={`rounded-[10px] border px-[26px] py-[11px] text-[14px] font-bold transition-colors ${
                  active ? "border-accent-300 bg-accent-100 text-primary" : "border-border-default bg-surface text-body hover:bg-nav-hover"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </Card>

      {examSchedule.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div
            className="grid gap-2 bg-surface-muted px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div>DATE</div>
            <div>COURSE</div>
            <div>SESSION</div>
            <div className="text-right">HALL</div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState message="No published exam schedule yet." className="px-5" />
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="grid items-center gap-2 border-t border-divider px-5 py-3.5" style={{ gridTemplateColumns: gridCols }}>
                <div className="text-[13.5px] font-extrabold text-primary">{shortDate(r.exam_date)}</div>
                <div>
                  <div className="text-[14px] font-bold text-ink">{r.subject_name}</div>
                  <div className="font-mono text-[11px] text-subtle">{r.subject_code}</div>
                </div>
                <div>
                  <Badge tone="accent">{SESSION_LABEL[r.session]}</Badge>
                </div>
                <div className="text-right text-[13px] text-muted">{r.venue_name ?? "NA"}</div>
              </div>
            ))
          )}
          {footnote && (
            <p className="border-t border-divider px-5 py-3.5 text-[11.5px] leading-[1.55] text-subtle">
              {footnote}. Bring your hall ticket and ID card.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
