"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  PageHeader,
  Button,
  KpiCard,
  Badge,
  Input,
  DataTable,
  Pagination,
  Drawer,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { StudentFilters, type StudentFiltersValue } from "@/modules/admin/components/students/StudentFilters";
import { ColumnsMenu, type ColumnOption } from "@/modules/admin/components/students/ColumnsMenu";
import { avatarTint, formatDate, initials, studentName } from "@/modules/admin/lib/students-format";
import { useStudents, useStudentCount, type ListStudentsParams, type StudentListItem } from "@/modules/admin/api/students";

const PAGE_SIZE = 10;

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: "student", label: "Student", locked: true },
  { key: "department", label: "Department" },
  { key: "batch", label: "Batch" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "contact", label: "Contact" },
  { key: "admission_date", label: "Admitted" },
  { key: "actions", label: "Actions", locked: true },
];

interface Tab {
  id: string;
  label: string;
  filters: StudentFiltersValue;
  /** No real data to back this view yet — shown to match the old console's full tab set, disabled until it exists. */
  soonReason?: string;
}

const TABS: Tab[] = [
  { id: "all", label: "All students", filters: {} },
  { id: "active", label: "Active only", filters: { status: "active" } },
  { id: "fee-defaulters", label: "Fee defaulters", filters: {}, soonReason: "Needs a per-student fee-status endpoint — none exists yet" },
  { id: "attendance-risk", label: "Attendance risk", filters: {}, soonReason: "Needs an attendance-summary endpoint — none exists yet" },
  { id: "final-year", label: "Final year", filters: {}, soonReason: "Needs a per-student study-year field — not in the schema yet" },
];

/** Matches the old console's drawer metric tiles — shown, disabled, since none of the three exist as per-student data yet. */
function MetricBox({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="rounded-admin-md border border-admin-divider bg-admin-tint p-3" title={reason}>
      <p className="text-[11px] text-admin-subtle">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-admin-border-hover">—</p>
    </div>
  );
}

function KvRow({ label, value, muted, reason }: { label: string; value: string; muted?: boolean; reason?: string }) {
  return (
    <div className="flex gap-4 border-b border-admin-divider py-3 last:border-b-0" title={reason}>
      <dt className="w-[180px] shrink-0 text-sm text-admin-subtle">{label}</dt>
      <dd className={`min-w-0 text-sm ${muted ? "text-admin-border-hover" : "text-admin-body"}`}>{value}</dd>
    </div>
  );
}

export default function AdminStudentsPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [filters, setFilters] = useState<StudentFiltersValue>({});
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set(COLUMN_OPTIONS.map((c) => c.key)));
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [quickViewRow, setQuickViewRow] = useState<StudentListItem | null>(null);

  const params: ListStudentsParams = { q: debouncedQuery || undefined, ...filters, page, limit: PAGE_SIZE };

  const { data, isLoading, error } = useStudents(params);
  const total = useStudentCount({});
  const active = useStudentCount({ status: "active" });
  const inactive = useStudentCount({ status: "inactive" });
  const hostellers = useStudentCount({ student_type: "hosteller" });
  const dayscholars = useStudentCount({ student_type: "dayscholar" });

  function selectTab(tab: Tab) {
    if (tab.soonReason) return;
    setActiveTab(tab.id);
    setFilters(tab.filters);
    setPage(1);
    setSelectedIds(new Set());
  }

  function updateFilters(next: StudentFiltersValue) {
    setFilters(next);
    setActiveTab("all"); // manual filter changes fall out of the preset tabs
    setPage(1);
    setSelectedIds(new Set());
  }

  function goToPage(next: number) {
    setPage(next);
    setSelectedIds(new Set());
  }

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const pageRows = data?.data ?? [];
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((row) => selectedIds.has(row.id));
  const someOnPageSelected = pageRows.some((row) => selectedIds.has(row.id));

  function toggleRow(row: StudentListItem) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRows.forEach((row) => next.delete(row.id));
      else pageRows.forEach((row) => next.add(row.id));
      return next;
    });
  }

  const columns: DataTableColumn<StudentListItem>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => {
        const tint = avatarTint(row.id);
        return (
          <div className="flex items-center gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-admin-pill text-xs font-semibold"
              style={row.photo_url ? undefined : { background: tint.bg, color: tint.fg }}
            >
              {row.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- a remote storage URL, not a local/optimizable asset
                <img src={row.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(row.first_name, row.last_name)
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-admin-ink">{studentName(row.first_name, row.last_name)}</p>
              <p className="text-xs text-admin-muted">
                {row.roll_no ?? row.student_id_no} · {row.register_no ?? "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "department",
      header: "Department",
      render: (row) => (
        <div>
          <p className="font-medium text-admin-ink">{row.department?.name ?? "—"}</p>
          <p className="text-xs text-admin-muted">
            {row.course?.code ?? "—"}
            {row.class?.section ? ` · Sec ${row.class.section}` : ""}
          </p>
        </div>
      ),
    },
    { key: "batch", header: "Batch", render: (row) => row.batch?.name ?? "—" },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge tone={row.student_type === "hosteller" ? "primary" : "neutral"}>
          {row.student_type === "hosteller" ? "Hosteller" : "Day scholar"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status === "active" ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (row) => (
        <div>
          <p className="text-admin-body">{row.phone ?? "—"}</p>
          <p className="truncate text-xs text-admin-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: "admission_date",
      header: "Admitted",
      align: "right",
      render: (row) => <span className="text-admin-muted">{formatDate(row.admission_date)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Quick view"
            aria-label={`Quick view ${studentName(row.first_name, row.last_name)}`}
            onClick={() => setQuickViewRow(row)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
          >
            <Icon name="visibility" size={17} />
          </button>
          <button
            type="button"
            disabled
            title="Edit — student edit page not built yet"
            aria-label={`Edit ${studentName(row.first_name, row.last_name)}`}
            className="cursor-not-allowed rounded-admin-sm p-1.5 text-admin-border-hover"
          >
            <Icon name="edit" size={17} />
          </button>
          <button
            type="button"
            disabled
            title="Timeline — no per-student activity endpoint yet"
            aria-label={`Timeline for ${studentName(row.first_name, row.last_name)}`}
            className="cursor-not-allowed rounded-admin-sm p-1.5 text-admin-border-hover"
          >
            <Icon name="history" size={17} />
          </button>
        </div>
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
        <span className="font-semibold text-admin-body">Students</span>
      </nav>

      <PageHeader
        title="Students"
        description={
          total.data !== undefined && active.data !== undefined
            ? `${total.data.toLocaleString()} records · ${active.data.toLocaleString()} active`
            : "Loading roll…"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled title="Import — module planned">
              Import
            </Button>
            <Button
              variant="secondary"
              disabled
              title={selectedIds.size > 0 ? `ID cards for ${selectedIds.size} selected — module planned` : "Select students, then ID cards — module planned"}
            >
              ID cards
            </Button>
            <Link href="/admin/students/admit">
              <Button variant="primary">Admit student</Button>
            </Link>
          </div>
        }
      />

      <div className="mt-5 mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total in view" value={total.data ?? "…"} icon="groups" />
        <KpiCard label="Active" value={active.data ?? "…"} icon="how_to_reg" />
        <KpiCard label="Inactive" value={inactive.data ?? "…"} icon="person_off" />
        <KpiCard label="Hostellers" value={hostellers.data ?? "…"} icon="bed" />
        <KpiCard label="Day scholars" value={dayscholars.data ?? "…"} icon="directions_bus" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab)}
              disabled={!!tab.soonReason}
              title={tab.soonReason}
              className={`rounded-admin-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab.soonReason
                  ? "cursor-not-allowed text-admin-border-hover"
                  : activeTab === tab.id
                    ? "bg-admin-primary text-white"
                    : "text-admin-body hover:bg-admin-tint-strong"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled
          title="Save current view — no saved-views backend yet"
          className="flex cursor-not-allowed items-center gap-1.5 text-sm font-semibold text-admin-border-hover"
        >
          <Icon name="star" size={15} /> Save current view
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-sm flex-1">
          <Input
            leadingIcon="search"
            placeholder="Search by name, roll no, register no, email…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
              setSelectedIds(new Set());
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-admin-subtle sm:inline">Click a row for a quick view</span>
          {selectedIds.size > 0 && <span className="text-xs font-semibold text-admin-muted">{selectedIds.size} selected</span>}
          <ColumnsMenu columns={COLUMN_OPTIONS} visible={visibleColumns} onToggle={toggleColumn} />
          <Button variant="secondary" disabled title="Export — no CSV export endpoint yet">
            Export
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <StudentFilters value={filters} onChange={updateFilters} onClearAll={() => updateFilters({})} />
      </div>

      <DataTable
        columns={columns.filter((col) => visibleColumns.has(col.key))}
        rows={pageRows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load students." : null}
        emptyTitle="No students match this view"
        selection={{
          isSelected: (row) => selectedIds.has(row.id),
          onToggle: toggleRow,
          onToggleAll: toggleAllOnPage,
          allSelected: allOnPageSelected,
          someSelected: someOnPageSelected,
        }}
        onRowClick={setQuickViewRow}
        footer={data && <Pagination page={data.meta.page} pageSize={data.meta.limit} total={data.meta.total} onPageChange={goToPage} />}
      />

      <Drawer
        open={quickViewRow !== null}
        onClose={() => setQuickViewRow(null)}
        eyebrow={quickViewRow?.roll_no ?? quickViewRow?.student_id_no ?? undefined}
        title={quickViewRow ? studentName(quickViewRow.first_name, quickViewRow.last_name) : ""}
        headActions={
          quickViewRow && (
            <Link href={`/admin/students/${quickViewRow.id}`}>
              <Button variant="secondary" size="sm">
                Full profile
              </Button>
            </Link>
          )
        }
        footer={
          quickViewRow && (
            <>
              <Link href={`/admin/students/${quickViewRow.id}`} className="grow">
                <Button variant="primary" className="w-full justify-center">
                  Open full profile
                </Button>
              </Link>
              <Button variant="secondary" disabled title="Notifications — no messaging backend yet" aria-label="Send notification">
                <Icon name="send" size={16} />
              </Button>
              <Button variant="secondary" disabled title="Edit — student edit page not built yet" aria-label="Edit student">
                <Icon name="edit" size={16} />
              </Button>
            </>
          )
        }
      >
        {quickViewRow && (
          <div className="flex flex-col gap-5">
            <div className="flex gap-4">
              <span
                className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-admin-lg text-2xl font-semibold"
                style={
                  quickViewRow.photo_url
                    ? undefined
                    : { background: avatarTint(quickViewRow.id).bg, color: avatarTint(quickViewRow.id).fg }
                }
              >
                {quickViewRow.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a remote storage URL, not a local/optimizable asset
                  <img src={quickViewRow.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(quickViewRow.first_name, quickViewRow.last_name)
                )}
              </span>
              <div className="flex grow flex-col gap-2">
                <div>
                  <Badge tone={quickViewRow.status === "active" ? "success" : "neutral"}>
                    {quickViewRow.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-admin-muted">{quickViewRow.department?.name ?? "—"}</p>
                <p className="text-xs text-admin-subtle">
                  {quickViewRow.course?.name ?? "—"}
                  {quickViewRow.class?.section ? ` · Section ${quickViewRow.class.section}` : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricBox label="Attendance" reason="No attendance-summary endpoint yet" />
              <MetricBox label="CGPA" reason="No marks/grades module yet" />
              <MetricBox label="Arrears" reason="No marks/grades module yet" />
            </div>

            <hr className="border-admin-divider" />

            <dl className="flex flex-col">
              <KvRow label="Register number" value={quickViewRow.register_no ?? "—"} />
              <KvRow label="Batch" value={quickViewRow.batch?.name ?? "—"} />
              <KvRow label="Quota" value={quickViewRow.quota?.name ?? "—"} />
              <KvRow label="Class advisor" value="Not tracked" muted reason="No advisor assignment in the schema yet" />
              <KvRow label="Fees" value="Not tracked" muted reason="No per-student fee-summary endpoint yet" />
              <KvRow label="Residence" value={quickViewRow.student_type === "hosteller" ? "Hosteller" : "Day scholar"} />
              <KvRow label="Mobile" value={quickViewRow.phone ?? "—"} />
              <KvRow label="Email" value={quickViewRow.email} />
            </dl>

            <hr className="border-admin-divider" />

            <div>
              <p className="mb-3 text-xs font-bold tracking-wide text-admin-subtle uppercase">Recent activity</p>
              <p className="text-sm text-admin-subtle" title="No per-student activity/audit-log endpoint yet">
                Not available — no activity feed exists yet.
              </p>
            </div>
          </div>
        )}
      </Drawer>

      <p className="mt-3 text-xs leading-relaxed text-admin-subtle">
        Showing only what the database actually has today: identity, batch/course/department, residence type, status,
        contact, and admission date. CGPA, attendance %, fee status and placement are intentionally left out — none of
        those exist as queryable per-student data yet (no marks/grades module, no attendance aggregate, no per-student
        fee summary endpoint). Sorting isn&apos;t wired up either — the list is ordered most-recently-admitted first.
      </p>
    </div>
  );
}
