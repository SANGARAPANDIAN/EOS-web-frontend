"use client";

import { useState } from "react";
import { Card, Avatar, Button, Select, SkeletonFilterBar, SkeletonStatTiles, SkeletonRows } from "@/components/ui";
import {
  useHodMyClassAttendance,
  useMarkHodMyClassAttendance,
  type HodAttendanceStatus,
  type HodMyClassAttendanceOverview,
  type HodMyClassHandledClass,
} from "@/modules/hod/api/myClassAttendance";
import { formatTime12h } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

function formatLongDateStr(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export default function HodMyClassAttendancePage() {
  const [classKey, setClassKey] = useState<string | null>(null);
  const [classId, subjectId] = classKey ? classKey.split(":").map(Number) : [undefined, undefined];
  const overview = useHodMyClassAttendance(classId, subjectId);

  const o = overview.data;
  const handled = o?.handled_classes ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Attendance</h1>
        <p className="mt-1 text-[13px] text-muted">
          Mark attendance for any class you handle{o?.date ? ` · ${formatLongDateStr(o.date)}` : ""}
        </p>
      </div>

      {overview.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load attendance data — please try again.
        </div>
      )}

      {overview.isLoading ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 rounded-card border border-border-default bg-surface p-5">
            <SkeletonFilterBar className="border-0 p-0" />
            <SkeletonStatTiles count={4} />
          </div>
          <SkeletonRows count={5} />
        </div>
      ) : overview.isError ? null : handled.length === 0 || !o?.selected_class ? (
        <Card>
          <div className="text-[13px] text-subtle">You are not mapped to teach any class/subject yet.</div>
        </Card>
      ) : (
        <AttendanceBoard
          key={`${o.selected_class.class_id}-${o.selected_class.subject_id}`}
          overview={o}
          handled={handled}
          classKey={classKey ?? `${handled[0].class_id}:${handled[0].subject_id}`}
          onClassChange={setClassKey}
        />
      )}
    </div>
  );
}

function AttendanceBoard({
  overview,
  handled,
  classKey,
  onClassChange,
}: {
  overview: HodMyClassAttendanceOverview;
  handled: HodMyClassHandledClass[];
  classKey: string;
  onClassChange: (key: string) => void;
}) {
  const mark = useMarkHodMyClassAttendance();
  const students = overview.students;

  const [selections, setSelections] = useState<Record<number, HodAttendanceStatus | null>>(() => {
    const init: Record<number, HodAttendanceStatus | null> = {};
    for (const s of students) init[s.student_id] = s.status;
    return init;
  });
  const [justSaved, setJustSaved] = useState(false);

  const presentCount = students.filter((s) => selections[s.student_id] === "present").length;
  const absentCount = students.filter((s) => selections[s.student_id] === "absent").length;
  const onDutyCount = students.filter((s) => selections[s.student_id] === "on_duty").length;
  const leftCount = students.length - presentCount - absentCount - onDutyCount;

  const alreadySaved = justSaved || overview.already_saved;

  function setStatus(studentId: number, status: HodAttendanceStatus) {
    if (alreadySaved) return;
    setSelections((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllPresent() {
    if (alreadySaved) return;
    const next: Record<number, HodAttendanceStatus | null> = {};
    for (const s of students) next[s.student_id] = "present";
    setSelections(next);
  }

  function clearAll() {
    if (alreadySaved) return;
    const next: Record<number, HodAttendanceStatus | null> = {};
    for (const s of students) next[s.student_id] = null;
    setSelections(next);
  }

  async function save() {
    if (!overview.selected_class || alreadySaved) return;
    const records = students
      .filter((s) => selections[s.student_id] != null)
      .map((s) => ({ student_id: s.student_id, status: selections[s.student_id] as HodAttendanceStatus }));
    if (records.length === 0) return;
    await mark.mutateAsync({
      class_id: overview.selected_class.class_id,
      subject_id: overview.selected_class.subject_id,
      records,
    });
    setJustSaved(true);
  }

  return (
    <>
      <Card className="hod-hover-card">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
              Class &amp; Subject
            </label>
            <Select value={classKey} onChange={(e) => onClassChange(e.target.value)} className="font-bold">
              {handled.map((h) => (
                <option key={`${h.class_id}:${h.subject_id}`} value={`${h.class_id}:${h.subject_id}`}>
                  {h.section} · {h.subject_code} {h.subject_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
              Period
            </label>
            <Select disabled={overview.periods.length === 0}>
              {overview.periods.length === 0 ? (
                <option>No period scheduled today</option>
              ) : (
                overview.periods.map((p) => (
                  <option key={p.period_number} value={p.period_number}>
                    Period {p.period_number} · {formatTime12h(p.start_time)} – {formatTime12h(p.end_time)}
                  </option>
                ))
              )}
            </Select>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-4">
          <div className="rounded-[11px] bg-surface-tint px-4 py-4 text-center">
            <div className="text-[28px] font-extrabold text-primary">{presentCount}</div>
            <div className="mt-0.5 text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Present</div>
          </div>
          <div className="rounded-[11px] bg-danger-bg px-4 py-4 text-center">
            <div className="text-[28px] font-extrabold text-danger-fg">{absentCount}</div>
            <div className="mt-0.5 text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Absent</div>
          </div>
          <div className="rounded-[11px] bg-surface-tint px-4 py-4 text-center">
            <div className="text-[28px] font-extrabold text-primary">{onDutyCount}</div>
            <div className="mt-0.5 text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">On Duty</div>
          </div>
          <div className="rounded-[11px] bg-surface-tint px-4 py-4 text-center">
            <div className="text-[28px] font-extrabold text-ink">{leftCount}</div>
            <div className="mt-0.5 text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Left</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1fr_2fr] gap-3">
          <Button variant="secondary" onClick={markAllPresent} disabled={alreadySaved}>
            Mark all present
          </Button>
          <Button variant="secondary" onClick={clearAll} disabled={alreadySaved}>
            Clear
          </Button>
          <Button variant="primary" onClick={save} disabled={alreadySaved} loading={mark.isPending}>
            {alreadySaved ? "Attendance saved ✓" : "Save attendance"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold text-ink">
            {overview.selected_class
              ? `${overview.selected_class.section} · ${overview.selected_class.subject_code} ${overview.selected_class.subject_name}`
              : ""}
          </h2>
          <span className="text-[12.5px] text-subtle">
            {students.length} students{overview.date ? ` · ${formatLongDateStr(overview.date)}` : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {students.map((s) => {
            const status = selections[s.student_id] ?? null;
            return (
              <div key={s.student_id} className="hod-hover-row flex items-center gap-3.5 rounded-[11px] px-2 py-2">
                <Avatar name={s.name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-bold text-ink">{s.name}</div>
                  <div className="truncate text-[12px] text-subtle">{s.student_id_no}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus(s.student_id, "present")}
                    disabled={alreadySaved}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-[9px] border text-[13px] font-extrabold transition-colors",
                      status === "present"
                        ? "border-primary bg-primary text-white"
                        : "border-border-default bg-surface text-primary",
                      alreadySaved && "cursor-not-allowed opacity-60",
                    )}
                  >
                    P
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(s.student_id, "absent")}
                    disabled={alreadySaved}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-[9px] border text-[13px] font-extrabold transition-colors",
                      status === "absent"
                        ? "border-danger-border bg-danger-fg text-white"
                        : "border-border-default bg-surface text-danger-fg",
                      alreadySaved && "cursor-not-allowed opacity-60",
                    )}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(s.student_id, "on_duty")}
                    disabled={alreadySaved}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-[9px] border px-2.5 text-[13px] font-extrabold transition-colors",
                      status === "on_duty"
                        ? "border-primary bg-primary text-white"
                        : "border-border-default bg-surface text-primary",
                      alreadySaved && "cursor-not-allowed opacity-60",
                    )}
                  >
                    OD
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
