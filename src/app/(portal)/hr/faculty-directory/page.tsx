"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, Badge, Card, DataTable, IconButton, Select, SearchBar, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useHrFaculties, type HrFaculty, type HrFacultyStatus } from "@/modules/hr/api/facultyDirectory";
import { useHrDepartments } from "@/modules/hr/api/departments";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

const STATUS_TONE: Record<HrFacultyStatus, BadgeTone> = {
  active: "accent",
  inactive: "neutral",
};

const PAGE_SIZE = 20;

export default function HrFacultyDirectoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDepartmentId = searchParams.get("department_id") ?? "";

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const departments = useHrDepartments();
  const faculty = useHrFaculties({
    search: debouncedSearch || undefined,
    department_id: departmentId ? Number(departmentId) : undefined,
    status: (status as HrFacultyStatus) || undefined,
    limit: PAGE_SIZE,
    page,
  });

  const rows = faculty.data?.data ?? [];
  const meta = faculty.data?.meta;

  const columns: DataTableColumn<HrFaculty>[] = [
    {
      key: "name",
      header: "Faculty",
      width: "1.6fr",
      render: (f) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${f.first_name} ${f.last_name}`} imageUrl={f.profile_url} size={34} />
          <div className="min-w-0">
            <div className="truncate font-bold text-ink">
              {f.first_name} {f.last_name}
            </div>
            <div className="truncate text-[12px] text-muted">{f.email}</div>
          </div>
        </div>
      ),
    },
    { key: "designation", header: "Designation", width: "1fr", render: (f) => f.designation },
    { key: "department", header: "Department", width: "1fr", render: (f) => f.department?.name ?? "—" },
    { key: "phone", header: "Phone", width: "0.9fr", render: (f) => <span className="font-mono text-[12.5px]">{f.phone ?? "—"}</span> },
    {
      key: "status",
      header: "Status",
      width: "0.7fr",
      render: (f) => <Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Faculty directory</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {meta ? `${meta.total} faculty record${meta.total === 1 ? "" : "s"}` : " "}
          </p>
        </div>
        {/* No "Add faculty" here on purpose. Faculty records are created by
            Admin during onboarding; HR reads and reports on them. Leaving a
            create button in HR meant two places could mint the same person. */}
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <SearchBar
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="w-auto"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All departments</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(f) => f.id}
        loading={faculty.isLoading}
        emptyMessage="No faculty match these filters."
        onRowClick={(f) => router.push(`/hr/faculty-directory/${f.id}`)}
      />

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-muted">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <IconButton
              icon="chevron_left"
              disabled={page <= 1}
              className="disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            <span className="text-[12.5px] font-bold text-body">
              Page {meta.page} of {meta.totalPages}
            </span>
            <IconButton
              icon="chevron_right"
              disabled={page >= meta.totalPages}
              className="disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
