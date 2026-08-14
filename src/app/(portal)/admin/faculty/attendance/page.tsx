"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import { Badge, Button, DataTable, Input, KpiCard, PageHeader, Select, type BadgeTone, type DataTableColumn } from "@/modules/admin/components/ui";
import { useDepartments } from "@/modules/admin/api/refData";
import { useFacultyAttendanceOverview, type FacultyAttendanceOverviewRow } from "@/modules/admin/api/faculty";
import { FacultyAvatar } from "@/modules/admin/components/faculty/FacultyAvatar";
import { exportAttendanceSummaryPdf } from "@/modules/admin/lib/faculty-report-pdfs";

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_ACADEMIC_YEAR = `${CURRENT_YEAR}-${String((CURRENT_YEAR + 1) % 100).padStart(2, "0")}`;
const ACADEMIC_YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const startYear = CURRENT_YEAR - i;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
});

function percentageTone(value: number): BadgeTone {
  if (value >= 85) return "success";
  if (value >= 70) return "warning";
  return "danger";
}

export default function FacultyAttendancePage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [academicYear, setAcademicYear] = useState(DEFAULT_ACADEMIC_YEAR);

  const { data: departments } = useDepartments();
  const { data, isLoading, error } = useFacultyAttendanceOverview({
    department_id: departmentId,
    academic_year: academicYear,
    search: debouncedQuery || undefined,
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const columns: DataTableColumn<FacultyAttendanceOverviewRow>[] = [
    {
      key: "faculty",
      header: "Faculty",
      render: (row) => (
        <div className="flex items-center gap-3">
          <FacultyAvatar
            faculty={{ id: row.faculty_id, first_name: row.first_name, last_name: row.last_name, profile_url: row.profile_url }}
            className="size-9 rounded-admin-pill text-xs"
          />
          <span className="font-semibold text-admin-ink">
            {row.first_name} {row.last_name}
          </span>
        </div>
      ),
    },
    { key: "department", header: "Department", render: (row) => row.department?.code ?? row.department?.name ?? "—" },
    { key: "full_days", header: "Full days", render: (row) => row.full_days },
    { key: "half_days", header: "Half days", render: (row) => row.half_days },
    { key: "absent", header: "Absent", render: (row) => row.absent },
    {
      key: "on_duty_leave",
      header: "On duty / leave",
      render: (row) => row.on_duty + row.on_vacation + row.on_leave,
    },
    {
      key: "percentage",
      header: "Attendance %",
      render: (row) => <Badge tone={percentageTone(row.attendance_percentage)}>{row.attendance_percentage}%</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Link
          href={`/admin/faculty/${row.faculty_id}?section=attendance`}
          className="rounded-admin-sm border border-admin-border px-3 py-1.5 text-xs font-semibold text-admin-body hover:bg-admin-tint-strong"
        >
          View full attendance
        </Link>
      ),
    },
  ];

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <Link href="/admin/faculty" className="hover:text-admin-body">
          Faculty
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Attendance</span>
      </nav>

      <PageHeader
        title="Faculty Attendance"
        description="View-only — sourced from each faculty's daily attendance record. Editing isn't available here."
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              exportAttendanceSummaryPdf(rows, {
                academicYear,
                department: departmentId ? departments?.find((d) => d.id === departmentId)?.code : undefined,
              }).catch((err) => window.alert(friendlyError(err)))
            }
          >
            <Icon name="download" size={16} /> Export
          </Button>
        }
      />

      <div className="mt-5 mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Full day — today" value={(data?.today.full_days ?? 0).toLocaleString()} icon="check_circle" />
        <KpiCard label="Half day — today" value={(data?.today.half_days ?? 0).toLocaleString()} icon="schedule" />
        <KpiCard label="Absent — today" value={(data?.today.absent ?? 0).toLocaleString()} icon="warning" />
        <KpiCard
          label="On duty / leave — today"
          value={((data?.today.on_duty ?? 0) + (data?.today.on_vacation ?? 0) + (data?.today.on_leave ?? 0)).toLocaleString()}
          icon="groups"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input leadingIcon="search" placeholder="Search faculty…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select
          aria-label="Department"
          value={departmentId ?? ""}
          onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-48"
        >
          <option value="">All Departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-36">
          {ACADEMIC_YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              AY {y}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.faculty_id}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle="No faculty match these filters"
      />
    </div>
  );
}
