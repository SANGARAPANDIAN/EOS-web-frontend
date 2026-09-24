"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import {
  PageHeader,
  Button,
  Input,
  Select,
  Badge,
  KpiCard,
  FilterBar,
  DataTable,
  NumberedPagination,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useInternshipDriveReport, type InternshipDriveReportRow } from "@/modules/placement/api/drives";
import type { DriveDisplayStatus } from "@/modules/placement/api/drives";
import { dateLabel, driveDisplayStatusLabel } from "@/modules/placement/lib/format";

// Mirrors /placement/drives/page.tsx exactly — Internships are a drive_type
// on the same placement_drives table Drives already reads (see
// EOSbackend1/internship_drive_type.query.md), not a separate concept, so
// this reuses the same list layout with stipend/duration in place of
// CTC/mode. Internships are created from the same "Add drive" form
// (ScheduleDriveForm's Drive type toggle), not a separate creation flow.

const PAGE_SIZE = 10;

const STATUS_TONE: Record<DriveDisplayStatus, "primary" | "warning" | "success" | "danger"> = {
  upcoming: "primary",
  ongoing: "warning",
  completed: "success",
  cancelled: "danger",
};

const SORT_OPTIONS = [
  { value: "date_desc", label: "Date (newest)" },
  { value: "date_asc", label: "Date (oldest)" },
  { value: "company", label: "Company (A–Z)" },
  { value: "applied", label: "Most applied" },
  { value: "conversion", label: "Highest conversion" },
  { value: "stipend", label: "Highest stipend" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function sortRows(rows: InternshipDriveReportRow[], sort: SortKey): InternshipDriveReportRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "date_desc":
      return sorted.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
    case "date_asc":
      return sorted.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    case "company":
      return sorted.sort((a, b) => a.companyName.localeCompare(b.companyName));
    case "applied":
      return sorted.sort((a, b) => b.applied - a.applied);
    case "conversion":
      return sorted.sort((a, b) => b.conversionPct - a.conversionPct);
    case "stipend":
      return sorted.sort((a, b) => (b.stipendAmount ?? -1) - (a.stipendAmount ?? -1));
    default:
      return sorted;
  }
}

function ConversionBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
        <div
          className={`h-full rounded-admin-pill ${clamped >= 35 ? "bg-admin-primary" : "bg-admin-subtle"}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="font-mono text-xs text-admin-muted">{clamped}%</span>
    </div>
  );
}

export default function PlacementInternshipsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useInternshipDriveReport();

  function resetPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const matched = rows.filter((r) => {
      const matchesQuery = !q || r.companyName.toLowerCase().includes(q) || (r.jobRole ?? "").toLowerCase().includes(q);
      const matchesStatus = !status || r.displayStatus === status;
      return matchesQuery && matchesStatus;
    });
    return sortRows(matched, sort);
  }, [rows, debouncedQuery, status, sort]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const now = useMemo(() => new Date(), []);
  const thisYear = rows.filter((r) => new Date(r.scheduledDate).getFullYear() === now.getFullYear()).length;
  const upcoming = rows.filter((r) => r.displayStatus === "upcoming").length;
  const ongoing = rows.filter((r) => r.displayStatus === "ongoing").length;
  const completed = rows.filter((r) => r.displayStatus === "completed").length;

  const columns: DataTableColumn<InternshipDriveReportRow>[] = [
    {
      key: "company",
      header: "Company",
      render: (r) => (
        <div>
          <p className="font-semibold text-admin-ink">{r.companyName}</p>
          <p className="text-xs text-admin-muted">{r.jobRole ?? "Role not set"}</p>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (r) => dateLabel(r.scheduledDate) },
    { key: "stipend", header: "Stipend", mono: true, render: (r) => (r.stipendAmount != null ? `₹${r.stipendAmount}/mo` : "—") },
    { key: "duration", header: "Duration", mono: true, render: (r) => (r.durationMonths != null ? `${r.durationMonths} mo` : "—") },
    { key: "applied", header: "Applied", mono: true, render: (r) => r.applied },
    { key: "shortlisted", header: "Shortlisted", mono: true, render: (r) => r.shortlisted },
    { key: "conversion", header: "Conversion", render: (r) => <ConversionBar percent={r.conversionPct} /> },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge tone={STATUS_TONE[r.displayStatus]}>{driveDisplayStatusLabel(r.displayStatus)}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Internships"
        description="Scheduling, stipend and round-wise progress for each internship drive."
        actions={
          <Button variant="primary" onClick={() => router.push("/placement/drives/new")}>
            <Icon name="add" size={16} /> Add internship
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Internships this year" icon="event_available" value={thisYear.toLocaleString()} sub="Completed and scheduled" />
        <KpiCard label="Upcoming" icon="upcoming" value={upcoming.toLocaleString()} sub="Next 30 days" />
        <KpiCard label="Ongoing" icon="hourglass_top" value={ongoing.toLocaleString()} sub="Rounds in progress" />
        <KpiCard label="Completed" icon="task_alt" value={completed.toLocaleString()} sub="Results published" />
      </div>

      <FilterBar>
        <div className="min-w-[220px] flex-1">
          <Input
            leadingIcon="search"
            placeholder="Search internship drives"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)}>
          <option value="">All statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setQuery("");
            setStatus("");
            setSort("date_desc");
            setPage(1);
          }}
        >
          Reset
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/placement/drives/${r.id}`)}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle="No internships match these filters"
        footer={<NumberedPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />}
      />
    </div>
  );
}
