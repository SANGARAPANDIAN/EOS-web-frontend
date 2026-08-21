"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Banner, Card, DataTable, SearchBar, Select, StatCard, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useHrFacultyAttendanceOverview,
  type HrFacultyAttendanceOverviewRow,
  type HrFacultyAttendanceStatus,
} from "@/modules/hr/api/facultyAttendance";
import { useHrDepartments } from "@/modules/hr/api/departments";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
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

function attendanceTone(percent: number): BadgeTone {
  if (percent >= 86) return "accent";
  if (percent >= 70) return "neutral";
  return "danger";
}

function facultyName(row: HrFacultyAttendanceOverviewRow): string {
  return [row.prefix, row.first_name, row.last_name].filter(Boolean).join(" ");
}

export default function HrFacultyAttendanceOverviewPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const departments = useHrDepartments();
  const overview = useHrFacultyAttendanceOverview({
    department_id: departmentId ? Number(departmentId) : undefined,
    search: debouncedSearch || undefined,
  });

  const today = overview.data?.today;
  const rows = overview.data?.rows ?? [];

  const columns: DataTableColumn<HrFacultyAttendanceOverviewRow>[] = [
    {
      key: "faculty",
      header: "Faculty",
      width: "1.6fr",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={facultyName(row)} imageUrl={row.profile_url} size={32} />
          <div className="min-w-0 truncate font-bold text-ink">{facultyName(row)}</div>
        </div>
      ),
    },
    { key: "department", header: "Department", render: (row) => row.department?.name ?? "—" },
    {
      key: "today_status",
      header: "Today",
      align: "center",
      render: (row) =>
        row.today_status ? (
          <Badge tone={STATUS_TONE[row.today_status]}>{STATUS_LABEL[row.today_status]}</Badge>
        ) : (
          <Badge tone="neutral">Not marked</Badge>
        ),
    },
    {
      key: "attendance_percentage",
      header: "Attendance %",
      align: "center",
      render: (row) => <Badge tone={attendanceTone(row.attendance_percentage)}>{row.attendance_percentage}%</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Faculty attendance</h1>
        <p className="mt-1 text-[13px] text-muted">
          Auto-captured from biometric punch logs where available — one punch counts as a half day, two as a full day.
        </p>
      </div>

      {overview.isError && (
        <Banner>{overview.error instanceof ApiError ? overview.error.message : "Could not load the attendance overview."}</Banner>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Attendance % — today"
          value={today ? `${today.attendance_percentage}%` : "—"}
          icon="percent"
          barPercent={today?.attendance_percentage ?? 0}
          thresholdPercent={75}
        />
        <StatCard label="Full day" value={today?.full_days ?? "—"} icon="check_circle" />
        <StatCard label="Half day" value={today?.half_days ?? "—"} icon="schedule" />
        <StatCard label="Absent" value={today?.absent ?? "—"} icon="event_busy" />
        <StatCard label="On leave" value={today?.on_leave ?? "—"} icon="flight_takeoff" sub="counts against %" />
        <StatCard label="On duty" value={today?.on_duty ?? "—"} icon="badge" sub="excused" />
        <StatCard label="On vacation" value={today?.on_vacation ?? "—"} icon="beach_access" sub="excused" />
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <SearchBar placeholder="Search faculty…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-auto min-w-[200px]">
          <option value="">All departments</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.faculty_id}
        loading={overview.isLoading}
        emptyMessage="No faculty match these filters."
        hoverableRows
        onRowClick={(row) => router.push(`/hr/faculty-attendance/${row.faculty_id}`)}
      />
    </div>
  );
}
