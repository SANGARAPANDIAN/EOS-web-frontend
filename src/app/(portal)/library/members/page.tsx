"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  PageHeader,
  Input,
  Select,
  Badge,
  DataTable,
  NumberedPagination,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useDepartments } from "@/modules/admin/api/refData";
import { useMembers, type LibraryMember } from "@/modules/library/api/members";
import { MemberNoDuesModal } from "@/modules/library/components/members/MemberNoDuesModal";
import { formatDate } from "@/modules/library/lib/borrow-record-format";

const DEFAULT_PAGE_SIZE = 20;

export default function LibraryMembersPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [detailTarget, setDetailTarget] = useState<LibraryMember | null>(null);

  const { data: departments } = useDepartments();
  const { data, isLoading, error } = useMembers({
    q: debouncedQuery || undefined,
    department_id: departmentId,
    page,
    page_size: pageSize,
  });

  const columns: DataTableColumn<LibraryMember>[] = [
    {
      key: "name",
      header: "Student",
      render: (row) => (
        <div>
          <p className="font-semibold text-admin-ink">{row.name}</p>
          <p className="text-xs text-admin-muted">{row.student_id_no}</p>
        </div>
      ),
    },
    { key: "department", header: "Department", render: (row) => row.department.name },
    { key: "currently_borrowed", header: "Currently borrowed", render: (row) => row.currently_borrowed },
    { key: "total_borrowed", header: "Total borrowed", render: (row) => row.total_borrowed },
    {
      key: "last_borrowed",
      header: "Last borrowed",
      render: (row) =>
        row.last_borrowed ? `${row.last_borrowed.title} (${formatDate(row.last_borrowed.date)})` : "—",
    },
    {
      key: "library_status",
      header: "Status",
      render: (row) => (
        <Badge tone={row.library_status === "overdue" ? "warning" : "success"}>
          {row.library_status === "overdue" ? "Overdue" : "Clear"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/library/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Library members</span>
      </nav>

      <PageHeader
        title="Library members"
        description="Student members with a borrowing record — history, current borrowings and standing."
      />

      <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-sm flex-1">
          <Input
            leadingIcon="search"
            placeholder="Search by name, register or roll number"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-admin-subtle sm:inline">Click a row to check no-dues status</span>
          <Select
            aria-label="Department"
            className="w-48"
            value={departmentId ?? ""}
            onChange={(e) => {
              setDepartmentId(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
          >
            <option value="">All departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load members." : null}
        emptyTitle="No library members found"
        onRowClick={(row) => setDetailTarget(row)}
        footer={
          data && (
            <NumberedPagination
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )
        }
      />

      <MemberNoDuesModal member={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}
