"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SectionCard } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import {
  useStudentAttendanceBySemester,
  useStudentAttendanceSummary,
  type StudentAttendanceTerm,
} from "@/modules/admin/api/students";
import { MetricTile, SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

function AttendanceMark({ status }: { status: "present" | "absent" }) {
  if (status === "present") {
    return (
      <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-admin-sm border border-admin-border bg-admin-tint text-[11px] font-semibold text-admin-subtle">
        P
      </span>
    );
  }
  return (
    <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-admin-sm bg-admin-danger text-[11px] font-semibold text-white">
      A
    </span>
  );
}

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function monthLabel(dateStr: string) {
  return MONTH_LABEL_FORMAT.format(new Date(`${dateStr}T00:00:00Z`));
}

/** Groups a term's days by month, collapsible per month, defaulting to only the most recent month open. Remounted
    (via `key={term.semester}` at the call site) whenever the selected semester changes, so this state resets cleanly. */
function DayRegister({ term }: { term: StudentAttendanceTerm }) {
  const usesPeriods = term.periods.length > 0;
  const columns = usesPeriods
    ? term.periods.map((p) => `Period ${p}`)
    : Array.from(new Set(term.days.flatMap((d) => d.subjects.map((s) => s.subject_name))));

  const months = Array.from(new Set(term.days.map((d) => monthKey(d.date))));
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set(months.slice(-1)));

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (term.days.length === 0) {
    return <Stub message={`No sessions recorded in Semester ${term.semester}.`} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {months.map((month) => {
        const isOpen = openMonths.has(month);
        const monthDays = term.days.filter((d) => monthKey(d.date) === month);
        const monthLost = monthDays.reduce((sum, d) => sum + d.lost, 0);

        return (
          <div key={month} className="overflow-hidden rounded-admin-md border border-admin-border">
            <button
              type="button"
              onClick={() => toggleMonth(month)}
              className="flex w-full items-center justify-between bg-admin-tint px-3 py-2 text-left"
            >
              <span className="text-sm font-medium text-admin-body">{monthLabel(monthDays[0].date)}</span>
              <span className="flex items-center gap-3 text-xs text-admin-muted">
                {monthDays.length} days{monthLost > 0 ? ` · ${monthLost} lost` : ""}
                <Icon name="expand_more" size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-admin-divider">
                      <th className="sticky left-0 z-10 bg-admin-canvas px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">
                        Date
                      </th>
                      {columns.map((name) => (
                        <th
                          key={name}
                          className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-admin-subtle uppercase"
                          title={name}
                        >
                          {name}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">Lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthDays.map((day) => (
                      <tr key={day.date} className={`border-b border-admin-divider last:border-b-0 ${day.lost > 0 ? "bg-admin-tint-strong" : ""}`}>
                        <td className="sticky left-0 z-10 bg-inherit px-2 py-2 font-medium text-admin-body">{formatDate(day.date)}</td>
                        {usesPeriods
                          ? day.period_marks.map((mark) => (
                              <td key={mark.period_number} className="px-2 py-2 text-center" title={mark.subject_name ?? undefined}>
                                {mark.status ? <AttendanceMark status={mark.status} /> : <span className="text-admin-border">—</span>}
                              </td>
                            ))
                          : columns.map((name) => {
                              const subject = day.subjects.find((s) => s.subject_name === name);
                              return (
                                <td key={name} className="px-2 py-2 text-center">
                                  {subject ? <AttendanceMark status={subject.status} /> : <span className="text-admin-border">—</span>}
                                </td>
                              );
                            })}
                        <td className="px-2 py-2 text-center font-medium text-admin-body">
                          {day.lost > 0 ? day.lost : <span className="text-admin-border">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Master (semester summary) → detail (day register + absence list). The day register uses real timetable
    periods when the class has a configured timetable (period columns), falling back to subject columns when
    it doesn't — attendance_records itself has no period-of-day column, so period-level marks are derived by
    joining to timetable_slots server-side. */
function SemesterAttendanceView({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentAttendanceBySemester(studentId, active);
  const [selected, setSelected] = useState(0);

  if (isLoading) return <Stub message="Loading…" />;
  if (!data || data.length === 0) {
    return (
      <SectionCard title="Attendance by semester">
        <Stub message="No academic-calendar terms on record for this student's batch — semester boundaries aren't set up yet." />
      </SectionCard>
    );
  }

  const index = Math.min(selected, data.length - 1);
  const term = data[index];

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Attendance by semester" actions={<span className="text-xs text-admin-subtle">Select a term to see its register and absences</span>}>
        <SimpleTable
          headers={["Semester", "Days", "Present", "Absent", "Attendance"]}
          emptyMessage="No terms on record."
          rows={data.map((t, i) => [
            <button
              key="sem"
              type="button"
              onClick={() => setSelected(i)}
              className={`text-left font-medium ${i === index ? "text-admin-primary" : "text-admin-body hover:text-admin-primary"}`}
            >
              Semester {t.semester}
              <span className="block text-xs font-normal text-admin-subtle">
                {formatDate(t.from)} – {formatDate(t.to)}
              </span>
            </button>,
            t.working_days,
            t.present,
            t.absent,
            <span key="p" className={t.percentage >= 75 ? "text-admin-success-fg" : "font-medium text-admin-danger"}>
              {t.percentage}%
            </span>,
          ])}
        />
      </SectionCard>

      <SectionCard
        title="Day-by-day register"
        actions={
          <span className="text-xs text-admin-subtle">
            {term.working_days} working days{term.periods.length > 0 ? ` · ${term.periods.length} periods/day` : ""}
          </span>
        }
      >
        <DayRegister key={term.semester} term={term} />
      </SectionCard>

      <SectionCard title="Absence history">
        <SimpleTable
          headers={["Date", "Missed", "Lost", "Cumulative"]}
          emptyMessage={`Full attendance — no periods were missed in Semester ${term.semester}.`}
          rows={term.absences.map((a) => [formatDate(a.date), a.subjects_missed.join(", "), a.lost, a.running_total])}
        />
      </SectionCard>
    </div>
  );
}

export function AttendanceSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentAttendanceSummary(studentId, active);
  if (isLoading || !data) return <Stub message="Loading…" />;

  const tone = data.overall.percentage >= 75 ? "success" : "danger";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricTile label="Overall" value={`${data.overall.percentage}%`} tone={tone} />
        <MetricTile label="Present" value={String(data.overall.present)} note={`of ${data.overall.total_days} sessions`} tone="muted" />
        <MetricTile label="Absent" value={String(data.overall.absent)} tone={data.overall.absent > 0 ? "warning" : "success"} />
        <MetricTile label="Sessions on file" value={String(data.overall.total_days)} tone="muted" />
      </div>
      <SectionCard title="By subject">
        <SimpleTable
          headers={["Subject", "Present", "Total", "Percentage"]}
          emptyMessage="No subject-tagged sessions on record."
          rows={data.by_subject.map((s) => [s.subject_name, s.present, s.total, `${s.percentage}%`])}
        />
      </SectionCard>
      <SemesterAttendanceView studentId={studentId} active={active} />
    </div>
  );
}
