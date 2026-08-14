"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { apiClient } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import { Button, DataTable, Input, PageHeader, Select, useToast, type DataTableColumn } from "@/modules/admin/components/ui";
import { useDepartments } from "@/modules/admin/api/refData";
import {
  facultyKeys,
  type Faculty,
  type FacultyAttendanceOverview,
  type FacultyAttendanceSummary,
  type FacultyListResponse,
} from "@/modules/admin/api/faculty";
import type { FacultyMappingListResponse } from "@/modules/admin/api/facultyMapping";
import { fetchAllPages } from "@/modules/admin/lib/report-export";
import {
  exportAssignmentsPdf,
  exportAttendanceSummaryPdf,
  exportFacultyRosterPdf,
  exportSingleFacultyReportPdf,
} from "@/modules/admin/lib/faculty-report-pdfs";
import { formatFacultyCode, fullName } from "@/modules/admin/lib/faculty-format";
import { FacultyAvatar } from "@/modules/admin/components/faculty/FacultyAvatar";

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_ACADEMIC_YEAR = `${CURRENT_YEAR}-${String((CURRENT_YEAR + 1) % 100).padStart(2, "0")}`;
const ACADEMIC_YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const startYear = CURRENT_YEAR - i;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
});

interface ReportCardProps {
  icon: string;
  title: string;
  description: string;
  isPending: boolean;
  onDownload: () => void;
  children?: ReactNode;
}

function ReportCard({ icon, title, description, isPending, onDownload, children }: ReportCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-admin-card border border-admin-border bg-admin-canvas p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-admin-sm bg-admin-tint-strong text-admin-primary">
          <Icon name={icon} size={20} />
        </span>
        <div>
          <h3 className="font-semibold text-admin-ink">{title}</h3>
          <p className="mt-0.5 text-sm text-admin-muted">{description}</p>
        </div>
      </div>
      {children}
      <Button variant="secondary" onClick={onDownload} disabled={isPending} className="self-start">
        <Icon name="download" size={16} /> {isPending ? "Preparing…" : "Download PDF"}
      </Button>
    </div>
  );
}

export default function FacultyReportsPage() {
  const { show, showDetailed } = useToast();
  const { data: departments } = useDepartments();

  const [rosterPending, setRosterPending] = useState(false);

  const [attendanceYear, setAttendanceYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [attendanceDept, setAttendanceDept] = useState<number | undefined>(undefined);
  const [attendancePending, setAttendancePending] = useState(false);

  const [assignmentsYear, setAssignmentsYear] = useState("");
  const [assignmentsPending, setAssignmentsPending] = useState(false);

  const [frQuery, setFrQuery] = useState("");
  const debouncedFrQuery = useDebouncedValue(frQuery);
  const [frDept, setFrDept] = useState<number | undefined>(undefined);
  const [frYear, setFrYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [downloadingFacultyId, setDownloadingFacultyId] = useState<number | null>(null);

  const { data: frData, isLoading: frLoading } = useQuery({
    queryKey: facultyKeys.list({ search: debouncedFrQuery, department_id: frDept, all: true }),
    queryFn: () =>
      fetchAllPages((page, limit) =>
        apiClient.get<FacultyListResponse>("/me/faculty", {
          search: debouncedFrQuery || undefined,
          department_id: frDept,
          page,
          limit,
        }),
      ),
  });
  const frRows = frData?.rows ?? [];

  async function handleRosterDownload() {
    setRosterPending(true);
    try {
      const { rows } = await fetchAllPages((page, limit) => apiClient.get<FacultyListResponse>("/me/faculty", { page, limit }));
      await exportFacultyRosterPdf(rows);
    } catch (err) {
      show(friendlyError(err), "error");
    } finally {
      setRosterPending(false);
    }
  }

  async function handleAttendanceDownload() {
    setAttendancePending(true);
    try {
      const overview = await apiClient.get<FacultyAttendanceOverview>("/me/faculty/attendance/overview", {
        academic_year: attendanceYear,
        department_id: attendanceDept,
      });
      if (overview.rows.length === 0) {
        show("No attendance records for this academic year.", "info");
        return;
      }
      await exportAttendanceSummaryPdf(overview.rows, {
        academicYear: attendanceYear,
        department: attendanceDept ? departments?.find((d) => d.id === attendanceDept)?.code : undefined,
      });
    } catch (err) {
      show(friendlyError(err), "error");
    } finally {
      setAttendancePending(false);
    }
  }

  async function handleAssignmentsDownload() {
    if (!assignmentsYear.trim()) {
      show("Enter an academic year first — this report isn't run unfiltered.", "error");
      return;
    }
    setAssignmentsPending(true);
    try {
      const { rows, truncated } = await fetchAllPages((page, limit) =>
        apiClient.get<FacultyMappingListResponse>("/me/faculty-mapping", { academic_year: assignmentsYear.trim(), page, limit }),
      );
      if (rows.length === 0) {
        show("No assignments found for that academic year.", "info");
        return;
      }
      await exportAssignmentsPdf(rows, { academicYear: assignmentsYear.trim() });
      if (truncated) {
        showDetailed(
          "Report truncated",
          "This academic year has more assignments than one report covers — only the first 3,000 rows were exported. Narrow further if you need the rest.",
          "info",
        );
      }
    } catch (err) {
      show(friendlyError(err), "error");
    } finally {
      setAssignmentsPending(false);
    }
  }

  async function handleDownloadFacultyReport(faculty: Faculty) {
    setDownloadingFacultyId(faculty.id);
    try {
      const [attendance, mappingsRes] = await Promise.all([
        apiClient.get<FacultyAttendanceSummary>(`/me/faculty/${faculty.id}/attendance`, { academic_year: frYear }),
        apiClient.get<FacultyMappingListResponse>("/me/faculty-mapping", { faculty_id: faculty.id, academic_year: frYear, limit: 100 }),
      ]);
      await exportSingleFacultyReportPdf(faculty, frYear, attendance.overall, mappingsRes.data);
    } catch (err) {
      show(friendlyError(err), "error");
    } finally {
      setDownloadingFacultyId(null);
    }
  }

  const frColumns: DataTableColumn<Faculty>[] = [
    {
      key: "faculty",
      header: "Faculty",
      render: (f) => (
        <div className="flex items-center gap-3">
          <FacultyAvatar faculty={f} className="size-9 rounded-admin-pill text-xs" />
          <div>
            <p className="font-semibold text-admin-ink">{fullName(f)}</p>
            <p className="font-mono text-xs text-admin-muted">{formatFacultyCode(f.id)}</p>
          </div>
        </div>
      ),
    },
    { key: "designation", header: "Designation", render: (f) => f.designation },
    { key: "department", header: "Department", render: (f) => f.department?.code ?? f.department?.name ?? "—" },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (f) => (
        <button
          type="button"
          onClick={() => handleDownloadFacultyReport(f)}
          disabled={downloadingFacultyId === f.id}
          aria-label={`Download report for ${fullName(f)}`}
          title="Download report"
          className="text-admin-muted hover:text-admin-primary disabled:opacity-40"
        >
          {downloadingFacultyId === f.id ? (
            <span className="inline-block size-4 animate-spin rounded-admin-pill border-2 border-current border-t-transparent" />
          ) : (
            <Icon name="download" size={17} />
          )}
        </button>
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
        <span className="font-semibold text-admin-body">Reports</span>
      </nav>

      <PageHeader title="Reports" description="Download data exports for offline use or sharing." />

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          icon="groups"
          title="Faculty Roster"
          description="Every faculty member — name, designation, department, contact info, and status."
          isPending={rosterPending}
          onDownload={handleRosterDownload}
        />

        <ReportCard
          icon="schedule"
          title="Attendance Summary"
          description="Full/half day, absent, and on-duty counts per faculty for an academic year."
          isPending={attendancePending}
          onDownload={handleAttendanceDownload}
        >
          <div className="flex gap-2">
            <Select value={attendanceYear} onChange={(e) => setAttendanceYear(e.target.value)} className="flex-1">
              {ACADEMIC_YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  AY {y}
                </option>
              ))}
            </Select>
            <Select
              value={attendanceDept ?? ""}
              onChange={(e) => setAttendanceDept(e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1"
            >
              <option value="">All Departments</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
          </div>
        </ReportCard>

        <ReportCard
          icon="description"
          title="Academic Assignments"
          description="Subject/class teaching assignments for a chosen academic year."
          isPending={assignmentsPending}
          onDownload={handleAssignmentsDownload}
        >
          <Input
            placeholder="Academic year, e.g. 2026-27 (required)"
            value={assignmentsYear}
            onChange={(e) => setAssignmentsYear(e.target.value)}
          />
        </ReportCard>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-bold text-admin-ink">Faculty Reports</h3>
        <p className="mt-1 text-sm text-admin-muted">
          Search for a faculty member and download their individual report — profile, attendance, and assignments for the chosen
          academic year.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="max-w-sm flex-1">
            <Input leadingIcon="search" placeholder="Search faculty…" value={frQuery} onChange={(e) => setFrQuery(e.target.value)} />
          </div>
          <Select value={frDept ?? ""} onChange={(e) => setFrDept(e.target.value ? Number(e.target.value) : undefined)} className="w-48">
            <option value="">All Departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select value={frYear} onChange={(e) => setFrYear(e.target.value)} className="w-36">
            {ACADEMIC_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                AY {y}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-4">
          <DataTable columns={frColumns} rows={frRows} rowKey={(f) => f.id} isLoading={frLoading} emptyTitle="No faculty match these filters" />
        </div>
      </div>
    </div>
  );
}
