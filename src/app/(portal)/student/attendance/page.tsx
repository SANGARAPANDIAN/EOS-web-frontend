"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SegmentedTabs, ProgressBar, EmptyState, IconButton, Icon } from "@/components/ui";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";
import { useMyAttendance } from "@/modules/student/api/attendance";
import { useMyTimetableForDay, displayPeriodNumbers } from "@/modules/student/api/timetable";
import { ATTENDANCE_THRESHOLD_PERCENT } from "@/lib/config";
import { getMonthGrid, monthLabel, todayDateOnly, formatLongDate, formatTime12h } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type SortMode = "risk" | "alpha";
type DayStatus = "present" | "absent" | "on_duty" | "holiday";

const DAY_STATUS_CLASSES: Record<DayStatus, string> = {
  present: "border-surface-tint bg-surface text-ink",
  absent: "bg-danger-bg text-danger-fg border-danger-border",
  on_duty: "bg-on-duty-bg text-primary border-on-duty-border",
  holiday: "bg-surface-input text-faint border-surface-input",
};

const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  present: "Present",
  absent: "Absent",
  on_duty: "On duty",
  holiday: "Holiday",
};

const LEGEND: { status: DayStatus; swatch: string }[] = [
  { status: "present", swatch: "bg-surface border-disabled" },
  { status: "absent", swatch: "bg-danger-bg border-danger-border" },
  { status: "on_duty", swatch: "bg-on-duty-bg border-on-duty-border" },
  { status: "holiday", swatch: "bg-surface-input border-surface-input" },
];

export default function AttendancePage() {
  const academicCalendar = useMyAcademicCalendar();
  const today = todayDateOnly();
  const from = academicCalendar.data?.start_date ?? undefined;
  const attendance = useMyAttendance(from, from ? today : undefined);

  const [sortMode, setSortMode] = useState<SortMode>("risk");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const sortedSubjects = useMemo(() => {
    const rows = attendance.data?.by_subject ?? [];
    return [...rows].sort((a, b) =>
      sortMode === "risk" ? a.percentage - b.percentage : a.subject_name.localeCompare(b.subject_name),
    );
  }, [attendance.data, sortMode]);

  const subjectSummary = useMemo(() => {
    const rows = attendance.data?.by_subject ?? [];
    if (rows.length === 0) return undefined;
    const sem = academicCalendar.data?.semester;
    const semPart = sem ? `Semester ${sem} · ` : "";
    const atRisk = rows.filter((s) => s.percentage < ATTENDANCE_THRESHOLD_PERCENT).length;
    return atRisk === 0
      ? `${semPart}all ${rows.length} course${rows.length > 1 ? "s" : ""} above the ${ATTENDANCE_THRESHOLD_PERCENT}% requirement`
      : `${semPart}${atRisk} of ${rows.length} course${rows.length > 1 ? "s" : ""} below the ${ATTENDANCE_THRESHOLD_PERCENT}% requirement`;
  }, [attendance.data, academicCalendar.data]);

  const subjectNameById = useMemo(() => {
    const map = new Map<number, { name: string; code: string | null }>();
    for (const s of attendance.data?.by_subject ?? []) map.set(s.subject_id, { name: s.subject_name, code: s.subject_code });
    return map;
  }, [attendance.data]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, { subject_id: number | null; subject_code: string | null; status: string }[]>();
    for (const r of attendance.data?.records ?? []) {
      const list = map.get(r.attendance_date) ?? [];
      list.push({ subject_id: r.subject_id, subject_code: r.subject_code, status: r.status });
      map.set(r.attendance_date, list);
    }
    return map;
  }, [attendance.data]);

  // calendar_events (event_type "holiday") only covers declared holidays; the
  // timetable has no Sunday slots at all (see todayBackendDayOfWeek), so every
  // Sunday is a real, structural non-class day even without a calendar row.
  const holidayDates = useMemo(() => {
    const set = new Set<string>();
    for (const e of academicCalendar.data?.events ?? []) {
      if (e.event_type === "holiday") set.add(e.event_date.slice(0, 10));
    }
    return set;
  }, [academicCalendar.data]);

  function dayStatus(iso: string): DayStatus | null {
    const records = recordsByDate.get(iso);
    if (records && records.length > 0) {
      if (records.some((r) => r.status === "absent")) return "absent";
      if (records.some((r) => r.status === "on_duty")) return "on_duty";
      return "present";
    }
    const dow = new Date(iso + "T00:00:00").getDay();
    if (dow === 0 || holidayDates.has(iso)) return "holiday";
    return null;
  }

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth, "sunday"), [viewYear, viewMonth]);
  const selectedRecords = useMemo(() => recordsByDate.get(selectedDate) ?? [], [recordsByDate, selectedDate]);
  const selectedStatus = dayStatus(selectedDate);

  // Real, scheduled periods for the selected day (from the same timetable
  // the student's own Timetable page uses) — paired with whatever
  // attendance was actually recorded for that date. Most classes in this
  // institution are still marked once per day rather than per subject (see
  // recordsByDate — subject_id is usually null), so most periods below fall
  // back to that single day-level status rather than an independent one per
  // period; that's the honest ceiling of what the data actually captures,
  // not a fabricated per-hour breakdown.
  const selectedDayOfWeek = new Date(selectedDate + "T00:00:00").getDay();
  const dayTimetable = useMyTimetableForDay(selectedDayOfWeek === 0 ? null : selectedDayOfWeek);
  const wholeDayRecord = selectedRecords.find((r) => r.subject_id === null);
  const subjectRecordBySubjectId = useMemo(() => {
    const map = new Map<number, { subject_id: number | null; subject_code: string | null; status: string }>();
    for (const r of selectedRecords) if (r.subject_id !== null) map.set(r.subject_id, r);
    return map;
  }, [selectedRecords]);
  // Gapless P1..Pn display numbers for the day — see displayPeriodNumbers'
  // own doc comment (same fix as Timetable/Dashboard).
  const dayDisplayNumbers = useMemo(() => displayPeriodNumbers(dayTimetable.data?.slots ?? []), [dayTimetable.data]);
  const periodRows = useMemo(() => {
    return (dayTimetable.data?.slots ?? []).map((slot) => {
      const ownRecord = subjectRecordBySubjectId.get(slot.subject.id);
      return {
        slot,
        displayNumber: dayDisplayNumbers.get(slot.period_number) ?? slot.period_number,
        status: ownRecord?.status ?? wholeDayRecord?.status ?? null,
        fromWholeDayMark: !ownRecord && !!wholeDayRecord,
      };
    });
  }, [dayTimetable.data, subjectRecordBySubjectId, wholeDayRecord, dayDisplayNumbers]);

  const overall = attendance.data?.overall;
  const eligible = overall ? overall.percentage >= ATTENDANCE_THRESHOLD_PERCENT : undefined;
  const semester = academicCalendar.data?.semester;

  return (
    <div className="flex flex-col gap-[18px] animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Attendance</h1>
          <div className="mt-1 text-[13.5px] text-muted">{semester ? `Semester ${semester}` : " "}</div>
        </div>
        {eligible !== undefined && (
          <Badge tone={eligible ? "accent" : "accentDark"}>
            <Icon name="verified" size={18} className="mr-2 -ml-0.5" />
            {eligible ? "Eligible" : "Below threshold"} · {ATTENDANCE_THRESHOLD_PERCENT}% required to sit end-semester exams
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start gap-4">
        <Card>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[13px] font-bold text-body">Overall attendance{semester ? ` · Semester ${semester}` : ""}</div>
              <div className="mt-1 text-[46px] font-extrabold leading-[1.1] tracking-[-.04em] text-ink">
                {overall ? overall.percentage : "—"}
                <span className="text-[26px]">%</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[22px] font-extrabold text-ink">
                {overall ? overall.present : "—"}
                <span className="font-semibold text-subtle">/{overall ? overall.total_days : "—"}</span>
              </div>
              <div className="text-[12px] text-muted">days present</div>
            </div>
          </div>
          {overall ? (
            <>
              <ProgressBar percent={overall.percentage} thresholdPercent={ATTENDANCE_THRESHOLD_PERCENT} height={9} className="mt-4" />
              <div className="mt-[7px] text-[11.5px] text-subtle">Marker shows the {ATTENDANCE_THRESHOLD_PERCENT}% requirement</div>
            </>
          ) : (
            <div className="mt-4 text-[13px] text-muted">{attendance.isLoading ? "Loading…" : "No attendance data yet."}</div>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Subject-wise attendance</h2>
              <div className="mt-[3px] text-[12.5px] text-muted">{subjectSummary ?? (attendance.isLoading ? "Loading…" : "No subject-wise records yet.")}</div>
            </div>
            {sortedSubjects.length > 0 && (
              <SegmentedTabs
                options={[
                  { key: "risk", label: "At risk first" },
                  { key: "alpha", label: "A–Z" },
                ]}
                value={sortMode}
                onChange={(k) => setSortMode(k as SortMode)}
              />
            )}
          </div>
          {sortedSubjects.length > 0 && (
            <div className="mt-2 flex flex-col">
              {sortedSubjects.map((s) => (
                <div key={s.subject_id} className="flex items-center gap-3.5 border-t border-divider py-[9px] first:border-0">
                  <div className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{s.subject_name}</div>
                  <span className="text-[12px] text-muted">
                    {s.present}/{s.total}
                  </span>
                  <Badge tone={s.percentage < ATTENDANCE_THRESHOLD_PERCENT ? "accentDark" : "accent"}>{s.percentage}%</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start gap-4">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <IconButton
              icon="chevron_left"
              size={32}
              onClick={() => {
                const d = new Date(viewYear, viewMonth - 1, 1);
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
              }}
            />
            <h2 className="text-[16px] font-extrabold tracking-[-.02em] text-ink">{monthLabel(viewYear, viewMonth)}</h2>
            <IconButton
              icon="chevron_right"
              size={32}
              onClick={() => {
                const d = new Date(viewYear, viewMonth + 1, 1);
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
              }}
            />
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-subtle">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell, i) => {
              if (!cell.iso) return <div key={i} className="h-[42px]" />;
              const status = dayStatus(cell.iso);
              const selected = cell.iso === selectedDate;
              return (
                <button
                  key={cell.iso}
                  onClick={() => setSelectedDate(cell.iso!)}
                  className={cn(
                    "flex h-[42px] items-center justify-center rounded-[10px] border text-[13.5px] font-bold transition-transform",
                    status ? DAY_STATUS_CLASSES[status] : DAY_STATUS_CLASSES.present,
                    selected && "scale-[1.04] ring-[2.5px] ring-ink",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <div className="mt-[18px] flex flex-wrap gap-4 border-t border-divider pt-[14px]">
            {LEGEND.map((l) => (
              <span key={l.status} className="flex items-center gap-[7px] text-[12px] font-semibold text-body">
                <span className={cn("size-[13px] rounded-[4px] border", l.swatch)} />
                {DAY_STATUS_LABEL[l.status]}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3.5">
            <div>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">
                {formatLongDate(new Date(selectedDate + "T00:00:00"), true)}
              </h2>
              <div className="mt-0.5 text-[12.5px] text-muted">
                {selectedStatus === "holiday"
                  ? "No classes scheduled"
                  : periodRows.length > 0
                    ? periodRows.every((p) => p.status === null)
                      ? "Not marked yet"
                      : `${periodRows.filter((p) => p.status === "present" || p.status === "on_duty").length} of ${periodRows.length} periods attended`
                    : `${selectedRecords.filter((r) => r.status !== "absent").length} of ${selectedRecords.length} classes attended`}
              </div>
            </div>
            {selectedStatus && (
              <Badge tone={selectedStatus === "absent" ? "accentDark" : selectedStatus === "holiday" ? "neutral" : "accent"}>
                {DAY_STATUS_LABEL[selectedStatus]}
              </Badge>
            )}
          </div>
          <div className="mt-4 flex flex-col">
            {periodRows.length > 0 ? (
              periodRows.map(({ slot, displayNumber, status, fromWholeDayMark }) => (
                <div key={slot.period_number} className="flex items-center gap-3.5 border-t border-divider py-[11px] first:border-0">
                  <div className="w-[74px] shrink-0">
                    <div className="text-[12.5px] font-bold text-ink">{formatTime12h(slot.start_time)}</div>
                    <div className="text-[11px] text-subtle">Period {displayNumber}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold text-ink">{slot.subject.name}</div>
                    <div className="truncate text-[11.5px] text-subtle">
                      {slot.subject.subject_code} · {slot.faculty.name}
                    </div>
                  </div>
                  {status ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge tone={status === "absent" ? "accentDark" : "accent"}>{DAY_STATUS_LABEL[status as DayStatus] ?? status}</Badge>
                      {fromWholeDayMark && <span className="text-[10px] text-subtle">whole-day mark</span>}
                    </div>
                  ) : (
                    <Badge tone="neutral">Not marked</Badge>
                  )}
                </div>
              ))
            ) : selectedRecords.length === 0 ? (
              <EmptyState message="No attendance records for this date." />
            ) : (
              // Real per-subject marks (subject_id set) are shown per row —
              // genuinely new information (which subject). A subject_id-null
              // "whole day" mark is the same single fact the header above
              // already states (its own status badge + "X of Y classes
              // attended" line), so it's dropped here rather than repeated
              // as a redundant "Whole day" row with nothing else to add.
              (() => {
                const subjectRecords = selectedRecords.filter((r) => r.subject_id !== null);
                if (subjectRecords.length === 0) {
                  return <EmptyState message="Marked for the entire day — see status above." />;
                }
                return subjectRecords.map((r, i) => {
                  const subject = subjectNameById.get(r.subject_id!);
                  return (
                    <div key={i} className="flex items-center gap-3.5 border-t border-divider py-[11px] first:border-0">
                      <div className="flex-1">
                        <div className="text-[13.5px] font-bold text-ink">{subject?.name ?? "Subject"}</div>
                        {(r.subject_code ?? subject?.code) && (
                          <div className="font-mono text-[11.5px] text-subtle">{r.subject_code ?? subject?.code}</div>
                        )}
                      </div>
                      <Badge tone={r.status === "absent" ? "accentDark" : "accent"}>{DAY_STATUS_LABEL[r.status as DayStatus] ?? r.status}</Badge>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
