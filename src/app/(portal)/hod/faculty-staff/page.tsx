"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, StatCard, Avatar, Input, SkeletonTable } from "@/components/ui";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  useHodFacultyStaffOverview,
  useHodFacultyStaffList,
  type HodFacultyStaffRow,
  type HodFacultyStaffType,
} from "@/modules/hod/api/facultyStaff";
import { formatDisplayDate } from "@/lib/utils/date";

export default function HodFacultyStaffPage() {
  const overview = useHodFacultyStaffOverview();
  const [tab, setTab] = useState<HodFacultyStaffType>("all");
  const [search, setSearch] = useState("");
  const list = useHodFacultyStaffList(tab, search);
  const router = useRouter();

  const columns: DataTableColumn<HodFacultyStaffRow>[] = useMemo(
    () => [
      {
        key: "staff",
        header: "Staff Member",
        width: "2.4fr",
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.name} imageUrl={row.photo_url} size={38} />
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-bold text-ink">{row.name}</div>
              <div className="truncate text-[11.5px] text-muted">
                {row.designation} · {row.department_code}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "attendance",
        header: "Attendance",
        width: "110px",
        render: (row) => (
          <span className="text-[13.5px] font-extrabold text-[#15803d]">
            {row.attendance_percent != null ? `${row.attendance_percent}%` : "—"}
          </span>
        ),
      },
      {
        key: "load",
        header: "Load",
        width: "110px",
        render: (row) => (
          <span className="text-[13px] text-ink">
            {row.load_hours != null ? `${row.load_hours} hours` : "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "130px",
        render: (row) =>
          row.status_label ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <span
                className={
                  "size-1.5 rounded-full " +
                  (row.status_label === "On duty" ? "bg-[#15803d]" : "bg-subtle")
                }
              />
              {row.status_label}
            </span>
          ) : (
            <span className="text-[13px] text-subtle">—</span>
          ),
      },
    ],
    [],
  );

  function handleRowClick(row: HodFacultyStaffRow) {
    router.push(
      row.kind === "faculty"
        ? `/hod/faculty-staff/faculty/${row.id}`
        : `/hod/faculty-staff/staff/${row.id}`,
    );
  }

  const o = overview.data;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Faculty &amp; Staff</h1>
        <p className="mt-1 text-[13px] text-muted">
          {o ? `${o.employee_count} employees · ${o.teaching_count} teaching, ${o.non_teaching_count} non-teaching` : ""}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="hod-hover-card">
          <div className="text-[13px] font-bold text-body">Faculty attendance today</div>
          <div className="mt-2.5 text-[32px] font-extrabold tracking-[-.03em] text-ink">
            {o ? `${o.faculty_attendance.percentage}%` : "—"}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted">
            {o ? `${o.faculty_attendance.reported} reported of ${o.faculty_attendance.on_roll} on rolls` : ""}
          </div>
          {o && <ProgressBar percent={o.faculty_attendance.percentage} className="mt-3.5" />}
          <div className="mt-2 text-[12px] text-subtle">
            {o
              ? `${o.faculty_attendance.on_leave} on approved leave · ${o.faculty_attendance.on_duty} on OD`
              : ""}
          </div>
        </Card>
        <StatCard
          className="hod-hover-card"
          label="On duty today"
          value={o ? o.on_duty_today.count : "—"}
          sub={o ? `${o.on_duty_today.on_approved_leave} on approved leave` : ""}
        />
        <StatCard
          className="hod-hover-card"
          label="Leave requests"
          value={o ? o.leave_requests_pending : "—"}
          sub="awaiting your approval"
        />
        <StatCard
          className="hod-hover-card"
          label="Appraisals closed"
          value={o ? `${o.appraisal.closed}/${o.appraisal.total}` : "—"}
          sub={o?.appraisal.cycle_end_date ? `cycle ends ${formatDisplayDate(o.appraisal.cycle_end_date)}` : ""}
        />
      </div>

      <div className="flex items-center gap-3">
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as HodFacultyStaffType)}
          options={[
            { key: "all", label: `All staff (${o?.employee_count ?? 0})` },
            { key: "teaching", label: `Teaching (${o?.teaching_count ?? 0})` },
            { key: "non_teaching", label: `Non-teaching (${o?.non_teaching_count ?? 0})` },
          ]}
        />
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, designation, qualification or subject"
      />

      {list.isLoading ? (
        <SkeletonTable rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={list.data?.rows ?? []}
          rowKey={(r) => `${r.kind}-${r.id}`}
          rowClassName="hod-hover-row"
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
