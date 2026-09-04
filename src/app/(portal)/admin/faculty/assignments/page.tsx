"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { apiClient } from "@/lib/api/client";
import { friendlyError } from "@/lib/utils/errors";
import { Button, DataTable, Input, NumberedPagination, PageHeader, Select, type DataTableColumn } from "@/modules/admin/components/ui";
import { useDepartments } from "@/modules/shared/api/departments";
import { facultyKeys, type Faculty, type FacultyListResponse } from "@/modules/admin/api/faculty";
import { useFacultyMappingsBrowse, type FacultyMapping } from "@/modules/admin/api/facultyMapping";
import { fetchAllPages } from "@/modules/admin/lib/report-export";
import { exportAssignmentsPdf } from "@/modules/admin/lib/faculty-report-pdfs";
import { formatFacultyCode, fullName } from "@/modules/admin/lib/faculty-format";
import { classLabel, subjectLabel } from "@/modules/admin/lib/faculty-mapping-format";
import { FacultyAvatar } from "@/modules/admin/components/faculty/FacultyAvatar";

const DEFAULT_PAGE_SIZE = 20;
const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const startYear = CURRENT_YEAR - i;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
});

export default function FacultyAssignmentsPage() {
  const [facultyQuery, setFacultyQuery] = useState("");
  const [facultyDept, setFacultyDept] = useState<number | undefined>(undefined);
  const [selectedFaculty, setSelectedFaculty] = useState<{ id: number; label: string } | null>(null);
  const [academicYear, setAcademicYear] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data: departments } = useDepartments();

  // All faculty, fetched once — filtering by name/department below happens
  // client-side against this list rather than a fresh request per keystroke.
  const { data: allFaculty } = useQuery({
    queryKey: facultyKeys.list({ all: true }),
    queryFn: () => fetchAllPages((p, limit) => apiClient.get<FacultyListResponse>("/me/faculty", { page: p, limit })),
  });

  const showSuggestions = facultyQuery.trim().length > 0 && !selectedFaculty;
  const facultySuggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const needle = facultyQuery.trim().toLowerCase();
    return (allFaculty?.rows ?? [])
      .filter((f: Faculty) => (facultyDept ? f.department_id === facultyDept : true))
      .filter((f: Faculty) => fullName(f).toLowerCase().includes(needle))
      .sort((a: Faculty, b: Faculty) => fullName(a).localeCompare(fullName(b)))
      .slice(0, 8);
  }, [allFaculty, facultyDept, facultyQuery, showSuggestions]);

  const { data, isLoading, error } = useFacultyMappingsBrowse({
    faculty_id: selectedFaculty?.id,
    academic_year: academicYear || undefined,
    page,
    limit: pageSize,
  });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta.total ?? 0;

  const columns: DataTableColumn<FacultyMapping>[] = [
    {
      key: "faculty",
      header: "Faculty",
      render: (m) => (
        <div className="flex items-center gap-3">
          <FacultyAvatar faculty={m.faculty} className="size-9 rounded-admin-pill text-xs" />
          <div>
            <p className="font-semibold text-admin-ink">
              {m.faculty.first_name} {m.faculty.last_name}
            </p>
            <p className="font-mono text-xs text-admin-muted">{formatFacultyCode(m.faculty.id)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (m) => (
        <div>
          <p className="text-admin-body">{subjectLabel(m)}</p>
          <p className="text-xs text-admin-subtle">{m.subject.subject_code}</p>
        </div>
      ),
    },
    { key: "class", header: "Class", render: (m) => classLabel(m) },
    { key: "year", header: "Academic year", render: (m) => m.academic_year },
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
        <span className="font-semibold text-admin-body">Academic Assignments</span>
      </nav>

      <PageHeader
        title="Academic Assignments"
        actions={
          <Button variant="secondary" onClick={() => exportAssignmentsPdf(rows, { academicYear: academicYear || undefined })}>
            <Icon name="download" size={16} /> Export
          </Button>
        }
      />

      <div className="mt-5 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          {selectedFaculty ? (
            <div className="flex items-center justify-between rounded-admin-control border border-admin-border-hover bg-admin-tint-strong px-3 py-2 text-sm font-semibold text-admin-primary-deep">
              <span>{selectedFaculty.label}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFaculty(null);
                  setFacultyQuery("");
                  setPage(1);
                }}
                aria-label="Clear faculty filter"
                className="text-admin-primary hover:text-admin-primary-dark"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : (
            <Input
              leadingIcon="search"
              placeholder="Search faculty…"
              value={facultyQuery}
              onChange={(e) => setFacultyQuery(e.target.value)}
            />
          )}

          {showSuggestions && facultySuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-admin-lg border border-admin-border bg-admin-canvas py-1 shadow-admin-dropdown">
              {facultySuggestions.map((f: Faculty) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFaculty({ id: f.id, label: `${fullName(f)} · ${formatFacultyCode(f.id)}` });
                    setFacultyQuery("");
                    setPage(1);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-admin-tint"
                >
                  <FacultyAvatar faculty={f} className="size-6 shrink-0 rounded-admin-pill text-[10px]" />
                  <span className="text-admin-body">{fullName(f)}</span>
                  <span className="text-xs text-admin-subtle">{formatFacultyCode(f.id)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Select
          aria-label="Department"
          value={facultyDept ?? ""}
          onChange={(e) => setFacultyDept(e.target.value ? Number(e.target.value) : undefined)}
          className="w-48"
        >
          <option value="">All Departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Academic year"
          value={academicYear}
          onChange={(e) => {
            setAcademicYear(e.target.value);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All years</option>
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
        rowKey={(m) => m.id}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle="No assignments match these filters"
        footer={
          <NumberedPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      />
    </div>
  );
}
