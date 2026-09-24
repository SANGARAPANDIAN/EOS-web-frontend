"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, StatCard, Avatar, Input, Select, SkeletonTable, SkeletonStatTiles } from "@/components/ui";
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

const DESIGNATION_SHORT_LABEL: Record<string, string> = {
  "Assistant Professor": "Asst Prof",
  "Associate Professor": "Assoc Prof",
  "Professor & Head": "Prof & Head",
  Professor: "Prof",
  lab_assistant: "Lab Assistant",
  housekeeping: "Housekeeping",
  security: "Security",
  office: "Office",
};

function designationShortLabel(designation: string): string {
  return DESIGNATION_SHORT_LABEL[designation] ?? designation;
}

// Raw today_status values from the backend (FacultyAttendanceService) are
// snake_case enum strings, not display text — mapped here once and reused
// by both the Status column and the Attendance column's "Today" view.
const STATUS_DISPLAY: Record<string, string> = {
  full_day: "Present",
  half_day: "Half day",
  absent: "Absent",
  on_leave: "On leave",
  on_duty: "On duty",
  on_vacation: "On vacation",
};

type AttendanceView = "term" | "today";

export default function HodFacultyStaffPage() {
  const overview = useHodFacultyStaffOverview();
  const [tab, setTab] = useState<HodFacultyStaffType>("all");
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState<string | null>(null);
  const [attendanceView, setAttendanceView] = useState<AttendanceView>("term");
  const list = useHodFacultyStaffList(tab, search, designation);
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
                {designationShortLabel(row.designation)} · {row.department_code}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "attendance",
        header: attendanceView === "today" ? "Today" : "This Term",
        width: "120px",
        render: (row) =>
          attendanceView === "today" ? (
            <span className="text-[13px] font-bold text-ink">
              {row.status_label ? (STATUS_DISPLAY[row.status_label] ?? row.status_label) : "Not marked"}
            </span>
          ) : (
            <span className="text-[13.5px] font-extrabold text-[#15803d]">
              {row.attendance_percent != null ? `${row.attendance_percent}%` : "—"}
            </span>
          ),
      },
      {
        key: "cl",
        header: "CL",
        width: "90px",
        render: (row) =>
          row.cl_days_this_term === null ? (
            <span className="text-[13px] text-subtle">—</span>
          ) : attendanceView === "today" ? (
            <span className="text-[13px] font-semibold text-ink">{row.on_cl_today ? "Yes" : "—"}</span>
          ) : (
            <span className="text-[13px] text-ink">{row.cl_days_this_term}</span>
          ),
      },
      {
        key: "sl",
        header: "SL",
        width: "90px",
        render: (row) =>
          row.sl_days_this_term === null ? (
            <span className="text-[13px] text-subtle">—</span>
          ) : attendanceView === "today" ? (
            <span className="text-[13px] font-semibold text-ink">{row.on_sl_today ? "Yes" : "—"}</span>
          ) : (
            <span className="text-[13px] text-ink">{row.sl_days_this_term}</span>
          ),
      },
      {
        key: "leave_available",
        header: "Leave Available",
        width: "130px",
        render: (row) => (
          <span className="text-[13px] text-ink">
            {row.total_leave_available === null ? (
              <span className="text-subtle">—</span>
            ) : (
              `${row.total_leave_available} days`
            )}
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
                  (row.status_label === "on_duty" ? "bg-[#15803d]" : "bg-subtle")
                }
              />
              {STATUS_DISPLAY[row.status_label] ?? row.status_label}
            </span>
          ) : (
            <span className="text-[13px] text-subtle">—</span>
          ),
      },
    ],
    [attendanceView],
  );

  function handleRowClick(row: HodFacultyStaffRow) {
    router.push(
      row.kind === "faculty"
        ? `/hod/faculty-staff/faculty/${row.id}`
        : `/hod/faculty-staff/staff/${row.id}`,
    );
  }

  const o = overview.data;
  const anyError = overview.isError || list.isError;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {anyError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load faculty &amp; staff data — please try again.
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Faculty &amp; Staff</h1>
          <p className="mt-1 text-[13px] text-muted">
            {o ? `${o.employee_count} employees · ${o.teaching_count} teaching, ${o.non_teaching_count} non-teaching` : ""}
          </p>
        </div>
        <SegmentedTabs
          value={attendanceView}
          onChange={(k) => setAttendanceView(k as AttendanceView)}
          options={[
            { key: "today", label: "Today" },
            { key: "term", label: "This Term" },
          ]}
        />
      </div>

      {overview.isLoading ? (
        <SkeletonStatTiles count={4} />
      ) : overview.isError ? null : (
        <div className="grid grid-cols-4 gap-4">
          <Card className="hod-hover-card">
            <div className="text-[13px] font-bold text-body">
              {attendanceView === "term" ? "Faculty attendance this term" : "Faculty attendance today"}
            </div>
            {attendanceView === "term" ? (
              <>
                <div className="mt-2.5 text-[32px] font-extrabold tracking-[-.03em] text-ink">
                  {o ? (o.faculty_attendance_term.faculty_with_records === 0 ? "0%" : `${o.faculty_attendance_term.percentage}%`) : "—"}
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  {o
                    ? o.faculty_attendance_term.faculty_with_records === 0
                      ? "No attendance recorded this term yet"
                      : `${o.faculty_attendance_term.faculty_with_records} reported of ${o.faculty_attendance_term.on_roll} on rolls`
                    : ""}
                </div>
                {o && o.faculty_attendance_term.faculty_with_records > 0 && (
                  <ProgressBar percent={o.faculty_attendance_term.percentage} className="mt-3.5" />
                )}
                {o && o.faculty_attendance_term.faculty_with_records > 0 && (
                  <div className="mt-2 text-[12px] text-subtle">
                    {`${o.faculty_attendance_term.on_leave_days} on-leave days · ${o.faculty_attendance_term.on_duty_days} on-duty days`}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mt-2.5 text-[32px] font-extrabold tracking-[-.03em] text-ink">
                  {o ? (o.faculty_attendance.reported === 0 ? "0%" : `${o.faculty_attendance.percentage}%`) : "—"}
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  {o
                    ? o.faculty_attendance.reported === 0
                      ? "No attendance recorded for today yet"
                      : `${o.faculty_attendance.reported} reported of ${o.faculty_attendance.on_roll} on rolls`
                    : ""}
                </div>
                {o && o.faculty_attendance.reported > 0 && (
                  <ProgressBar percent={o.faculty_attendance.percentage} className="mt-3.5" />
                )}
                {o && o.faculty_attendance.reported > 0 && (
                  <div className="mt-2 text-[12px] text-subtle">
                    {`${o.faculty_attendance.on_leave} on approved leave · ${o.faculty_attendance.on_duty} on OD`}
                  </div>
                )}
              </>
            )}
          </Card>
          <StatCard
            className="hod-hover-card"
            label={attendanceView === "term" ? "On-duty days this term" : "On duty today"}
            value={o ? (attendanceView === "term" ? o.faculty_attendance_term.on_duty_days : o.on_duty_today.count) : "—"}
            sub={
              o
                ? attendanceView === "term"
                  ? `${o.faculty_attendance_term.on_leave_days} on-leave days`
                  : `${o.on_duty_today.on_approved_leave} on approved leave`
                : ""
            }
          />
          <StatCard
            className="hod-hover-card"
            href="/hod/leave-requests"
            label="Leave requests"
            value={o ? o.leave_requests_pending : "—"}
            sub="awaiting your approval"
          />
          <StatCard
            className="hod-hover-card"
            href="/hod/appraisal-requests"
            label="Appraisals closed"
            value={o ? `${o.appraisal.closed}/${o.appraisal.total}` : "—"}
            sub={o?.appraisal.cycle_end_date ? `cycle ends ${formatDisplayDate(o.appraisal.cycle_end_date)}` : ""}
          />
        </div>
      )}

      {o && o.leave_type_breakdown.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {o.leave_type_breakdown.map((b) => (
            <StatCard
              key={b.leave_type}
              className="hod-hover-card"
              href="/hod/leave-requests"
              label={attendanceView === "term" ? `${b.leave_type} this term` : `On ${b.leave_type} today`}
              value={attendanceView === "term" ? b.term_days : b.today_count}
              sub={attendanceView === "term" ? "days taken this term" : "faculty on leave today"}
            />
          ))}
        </div>
      )}

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

      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or designation"
          className="flex-1"
        />
        <Select
          value={designation ?? "all"}
          onChange={(e) => setDesignation(e.target.value === "all" ? null : e.target.value)}
          className="max-w-[200px] font-bold"
        >
          <option value="all">All designations</option>
          {(o?.designations ?? []).map((d) => (
            <option key={d} value={d}>
              {designationShortLabel(d)}
            </option>
          ))}
        </Select>
      </div>

      {list.isLoading ? (
        <SkeletonTable rows={8} />
      ) : list.isError ? null : (
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
