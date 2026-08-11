"use client";

import { Fragment, useMemo, useState } from "react";
import { Card, SegmentedTabs, EmptyState, Badge } from "@/components/ui";
import { useMyTimetableForDay, useMyFullWeekTimetable, type TimetableSlot } from "@/modules/student/api/timetable";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";
import { todayBackendDayOfWeek, formatLongDate, formatTime12h } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type Tab = "today" | "week";

const DAY_CHIP_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
// The design reference's weekly grid only ever shows Mon-Fri (Saturdays follow
// a declared, non-recurring pattern per the academic calendar rather than a
// fixed weekly slot) — Saturday is still fully reachable via the day chips above.
const FULL_WEEK_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function isLabCourse(courseType: string | null): boolean {
  return courseType === "PRACTICAL" || courseType === "THEORY_WITH_PRACTICAL";
}

function durationHours(slots: TimetableSlot[]): number {
  const totalMinutes = slots.reduce((sum, s) => {
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    return sum + (eh * 60 + em - (sh * 60 + sm));
  }, 0);
  return Math.round((totalMinutes / 60) * 10) / 10;
}

function weekDatesStartingMonday(): Date[] {
  const today = new Date();
  const jsDay = today.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function PeriodRow({ slot }: { slot: TimetableSlot }) {
  return (
    <div className="flex items-center gap-4 rounded-[13px] border border-border-default bg-surface px-[18px] py-[15px] transition-colors hover:border-border-accent">
      <div className="w-[78px] shrink-0">
        <div className="font-mono text-[13.5px] font-extrabold whitespace-nowrap text-primary">{formatTime12h(slot.start_time)}</div>
        <div className="mt-0.5 text-[11px] font-bold text-subtle">P{slot.period_number}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold text-ink">{slot.subject.name}</div>
        <div className="mt-0.5 truncate text-[12.5px] text-subtle">{slot.faculty.name}</div>
      </div>
      <Badge tone="accent">{slot.subject.subject_code}</Badge>
    </div>
  );
}

export default function TimetablePage() {
  const [tab, setTab] = useState<Tab>("today");
  const academicCalendar = useMyAcademicCalendar();
  const todayDay = todayBackendDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<number>(todayDay ?? 1);
  const dayTimetable = useMyTimetableForDay(tab === "today" ? selectedDay : null);
  const weekTimetable = useMyFullWeekTimetable();
  const weekDates = useMemo(() => weekDatesStartingMonday(), []);

  const classInfo = dayTimetable.data?.class ?? weekTimetable.data?.class;
  const subtitle = [
    classInfo?.department_code,
    academicCalendar.data?.semester ? `Semester ${academicCalendar.data.semester}` : null,
    classInfo?.section ? `Section ${classInfo.section}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const weekByDay = useMemo(() => {
    const map = new Map<number, TimetableSlot[]>();
    for (const d of weekTimetable.data?.days ?? []) map.set(d.day_of_week, d.slots);
    return map;
  }, [weekTimetable.data]);

  const periodColumns = useMemo(() => {
    const map = new Map<number, string>();
    for (let dow = 1; dow <= 5; dow++) {
      for (const s of weekByDay.get(dow) ?? []) {
        if (!map.has(s.period_number)) map.set(s.period_number, s.start_time);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [weekByDay]);

  const sessions = useMemo(() => {
    const slots = dayTimetable.data?.slots ?? [];
    return [
      { label: "FORENOON", periods: slots.filter((s) => s.start_time < "12:00") },
      { label: "AFTERNOON", periods: slots.filter((s) => s.start_time >= "12:00") },
    ].filter((s) => s.periods.length > 0);
  }, [dayTimetable.data]);

  const labCount = useMemo(
    () => (dayTimetable.data?.slots ?? []).filter((s) => isLabCourse(s.subject.course_type)).length,
    [dayTimetable.data],
  );

  return (
    <div className="flex flex-col gap-[18px] animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Timetable</h1>
          <div className="mt-1 text-[13.5px] text-muted">{subtitle || " "}</div>
        </div>
        <SegmentedTabs
          options={[
            { key: "today", label: "Today" },
            { key: "week", label: "Full week" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "today" ? (
        <>
          <div className="rounded-hero bg-primary p-5">
            <div className="text-[13px] font-bold text-accent-200">{formatLongDate(weekDates[selectedDay - 1], true)}</div>
            <div className="mt-3.5 grid grid-cols-6 gap-2.5">
              {weekDates.map((date, i) => {
                const dow = i + 1;
                const selected = dow === selectedDay;
                return (
                  <button
                    key={dow}
                    onClick={() => setSelectedDay(dow)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-[12px] py-2.5 transition-colors",
                      selected ? "bg-surface text-primary" : "bg-white/15 text-accent-100",
                    )}
                  >
                    <span className="text-[10.5px] font-extrabold tracking-[.09em]">{DAY_CHIP_LABELS[i]}</span>
                    <span className="mt-0.5 text-[19px] font-extrabold tracking-[-.02em]">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <Card>
              <div className="text-[10.5px] font-extrabold tracking-[.1em] text-subtle">CLASSES</div>
              <div className="mt-1 text-[26px] font-extrabold tracking-[-.03em] text-ink">{dayTimetable.data?.slots.length ?? "—"}</div>
            </Card>
            <Card>
              <div className="text-[10.5px] font-extrabold tracking-[.1em] text-subtle">LABS</div>
              <div className="mt-1 text-[26px] font-extrabold tracking-[-.03em] text-ink">{dayTimetable.data ? labCount : "—"}</div>
            </Card>
            <Card>
              <div className="text-[10.5px] font-extrabold tracking-[.1em] text-subtle">HOURS</div>
              <div className="mt-1 text-[26px] font-extrabold tracking-[-.03em] text-ink">
                {dayTimetable.data ? durationHours(dayTimetable.data.slots) : "—"}
              </div>
            </Card>
          </div>

          {todayDay === null ? (
            <Card>
              <EmptyState message="No classes scheduled on Sunday." />
            </Card>
          ) : dayTimetable.isLoading ? (
            <Card>
              <EmptyState message="Loading…" />
            </Card>
          ) : sessions.length === 0 ? (
            <Card>
              <EmptyState message="No periods scheduled." />
            </Card>
          ) : (
            sessions.map((sess) => (
              <div key={sess.label} className="flex flex-col gap-2.5">
                <div className="pl-0.5 text-[10.5px] font-extrabold tracking-[.11em] text-subtle">{sess.label}</div>
                <div className="flex flex-col gap-2.5">
                  {sess.periods.map((slot) => (
                    <PeriodRow key={slot.period_number} slot={slot} />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      ) : (
        <Card className="overflow-x-auto">
          {periodColumns.length === 0 ? (
            <EmptyState message={weekTimetable.isLoading ? "Loading…" : "No timetable published yet."} />
          ) : (
            <div
              className="grid gap-2"
              style={{ minWidth: 900, gridTemplateColumns: `96px repeat(${periodColumns.length}, 1fr)` }}
            >
              <div />
              {periodColumns.map(([period, time]) => (
                <div key={period} className="text-center font-mono text-[10.5px] font-semibold text-subtle">
                  {formatTime12h(time)}
                </div>
              ))}
              {FULL_WEEK_DAY_LABELS.map((label, i) => {
                const dow = i + 1;
                const slots = weekByDay.get(dow) ?? [];
                const byPeriod = new Map(slots.map((s) => [s.period_number, s]));
                return (
                  <Fragment key={dow}>
                    <div className="flex items-center text-[13px] font-extrabold text-ink-soft">{label}</div>
                    {periodColumns.map(([period]) => {
                      const slot = byPeriod.get(period);
                      return (
                        <div
                          key={`${dow}-${period}`}
                          className={cn(
                            "min-h-[56px] rounded-[10px] p-2.5 text-[12px]",
                            slot
                              ? "border border-border-accent bg-accent-50"
                              : "border border-dashed border-border-default bg-surface-input text-subtle",
                          )}
                        >
                          {slot ? (
                            <>
                              <div className="leading-[1.25] font-bold text-primary-dark">{slot.subject.name}</div>
                              <div className="mt-0.5 font-mono text-[10px] text-primary">{slot.subject.subject_code}</div>
                            </>
                          ) : (
                            "Break"
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
