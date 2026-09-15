"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Banner, Card, DataTable, EmptyState, Icon, IconButton, Select, StatCard, type DataTableColumn } from "@/components/ui";

import type { BadgeTone } from "@/components/ui/Badge";
import {
  useHrFacultyAttendance,
  useMarkHrFacultyAttendance,
  type HrFacultyAttendanceDay,
  type HrFacultyAttendanceMonth,
  type HrFacultyAttendanceStats,
  type HrFacultyAttendanceStatus,
} from "@/modules/hr/api/facultyAttendance";
import { useHrFacultyById } from "@/modules/hr/api/facultyDirectory";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const STATUS_LABEL: Record<HrFacultyAttendanceStatus, string> = {
  full_day: "Full day",
  half_day: "Half day",
  absent: "Absent",
  on_duty: "On duty",
  on_leave: "On leave",
  weekly_off: "Weekly off",
  holiday: "Holiday",
};

const STATUS_TONE: Record<HrFacultyAttendanceStatus, BadgeTone> = {
  full_day: "accent",
  half_day: "neutral",
  absent: "danger",
  on_duty: "accentDark",
  on_leave: "neutral",
  weekly_off: "neutral",
  holiday: "neutral",
};

const STATUS_OPTIONS: HrFacultyAttendanceStatus[] = ["full_day", "half_day", "absent", "on_duty", "on_leave", "weekly_off", "holiday"];

function StatsGrid({ stats }: { stats: HrFacultyAttendanceStats }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Attendance %" value={`${stats.attendance_percentage}%`} icon="percent" barPercent={stats.attendance_percentage} thresholdPercent={75} />
      <StatCard label="Full day" value={stats.full_days} icon="check_circle" />
      <StatCard label="Half day" value={stats.half_days} icon="schedule" />
      <StatCard label="Absent" value={stats.absent} icon="event_busy" />
      <StatCard label="On leave" value={stats.on_leave} icon="flight_takeoff" sub="counts against %" />
      <StatCard label="On duty" value={stats.on_duty} icon="badge" sub="excused" />
      <StatCard label="On vacation" value={stats.on_vacation} icon="beach_access" sub="excused" />
    </div>
  );
}

function MonthSection({ month, facultyId, defaultExpanded }: { month: HrFacultyAttendanceMonth; facultyId: number; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [overrides, setOverrides] = useState<Record<string, HrFacultyAttendanceStatus>>({});
  const markAttendance = useMarkHrFacultyAttendance();

  function draftFor(day: HrFacultyAttendanceDay): HrFacultyAttendanceStatus {
    return overrides[day.date] ?? day.status;
  }

  function saveOverride(day: HrFacultyAttendanceDay) {
    const status = draftFor(day);
    markAttendance.mutate(
      { id: facultyId, date: day.date, input: { status } },
      {
        onSuccess: () =>
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[day.date];
            return next;
          }),
      },
    );
  }

  const columns: DataTableColumn<HrFacultyAttendanceDay>[] = [
    { key: "date", header: "Date", render: (day) => formatDisplayDate(day.date) },
    { key: "day", header: "Day", render: (day) => day.day },
    { key: "punch_in", header: "Punch in", render: (day) => <span className="font-mono text-[12.5px]">{day.punch_in ?? "—"}</span> },
    { key: "punch_out", header: "Punch out", render: (day) => <span className="font-mono text-[12.5px]">{day.punch_out ?? "—"}</span> },
    { key: "status", header: "Status", align: "center", render: (day) => <Badge tone={STATUS_TONE[day.status]}>{STATUS_LABEL[day.status]}</Badge> },
    {
      key: "override",
      header: "Correct",
      width: "220px",
      align: "right",
      render: (day) => {
        const isSavingThisDay = markAttendance.isPending && markAttendance.variables?.date === day.date;
        const draft = draftFor(day);
        return (
          <div className="flex justify-end gap-2">
            <Select
              value={draft}
              onChange={(e) =>
                setOverrides((prev) => ({ ...prev, [day.date]: e.target.value as HrFacultyAttendanceStatus }))
              }
              className="w-auto py-1.5 text-[12.5px]"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
            <IconButton
              icon="save"
              size={34}
              iconSize={16}
              disabled={draft === day.status || isSavingThisDay}
              className="disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => saveOverride(day)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left transition-colors hover:bg-surface-muted"
      >
        <div>
          <div className="text-[15px] font-extrabold text-ink">{month.label}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">
            {month.full_days} full · {month.half_days} half · {month.absent} absent · {month.attendance_percentage}% attendance
          </div>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-subtle transition-transform duration-200" style={{ transform: expanded ? "rotate(180deg)" : "none" }}>
          <Icon name="expand_more" size={20} />
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
            {month.days.length === 0 ? (
              <EmptyState message="No days recorded for this month." />
            ) : (
              <DataTable columns={columns} data={month.days} rowKey={(day) => day.date} />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function HrFacultyAttendanceDetailPage({ params }: { params: Promise<{ facultyId: string }> }) {
  const { facultyId } = use(params);
  const router = useRouter();
  const id = Number(facultyId);

  const faculty = useHrFacultyById(id);
  const attendance = useHrFacultyAttendance(id);

  const f = faculty.data;
  const summary = attendance.data;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button onClick={() => router.push("/hr/faculty-attendance")} className="flex items-center gap-2 self-start text-[13px] font-bold text-primary">
        <Icon name="arrow_back" size={16} />
        Faculty attendance
      </button>

      {attendance.isError && (
        <Banner>{attendance.error instanceof ApiError ? attendance.error.message : "Could not load attendance for this faculty member."}</Banner>
      )}

      {!f || !summary ? (
        <Card>
          <EmptyState loading={faculty.isLoading || attendance.isLoading} message="Faculty or attendance record not found." />
        </Card>
      ) : (
        <>
          <Card className="flex items-center gap-4">
            <Avatar name={`${f.first_name} ${f.last_name}`} imageUrl={f.profile_url} size={56} />
            <div className="min-w-0">
              <h1 className="text-[24px] font-extrabold tracking-[-.02em] text-ink">
                {f.first_name} {f.last_name}
              </h1>
              <p className="mt-1 text-[13px] text-muted">{[f.designation, f.department?.name].filter(Boolean).join(" · ")}</p>
            </div>
          </Card>

          <StatsGrid stats={summary.overall} />

          <div className="flex flex-col gap-3">
            {summary.months.length === 0 ? (
              <Card>
                <EmptyState message="No monthly attendance recorded yet." />
              </Card>
            ) : (
              summary.months.map((month, i) => (
                <MonthSection key={month.month} month={month} facultyId={id} defaultExpanded={i === 0} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
