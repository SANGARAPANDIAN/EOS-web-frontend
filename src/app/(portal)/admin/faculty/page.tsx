"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { BulkActionsBar, Button, Input, KpiCard, NumberedPagination, PageHeader, useToast } from "@/modules/admin/components/ui";
import { fetchFacultyById, useFaculties, type Faculty } from "@/modules/admin/api/faculty";
import { useFacultyIdCardBulkStatus, useIssueFacultyIdCard } from "@/modules/admin/api/facultyIdCard";
import { useFacultyPreferences, FACULTY_LIST_COLUMNS } from "@/modules/admin/lib/faculty-preferences";
import { formatFacultyCode, fullName } from "@/modules/admin/lib/faculty-format";
import { facultyToIdCardData } from "@/modules/admin/lib/id-card-data";
import { DESIGNATION_OPTIONS } from "@/modules/admin/lib/faculty-wizard-config";
import { exportFacultyRosterPdf } from "@/modules/admin/lib/faculty-report-pdfs";
import { FacultyTable } from "@/modules/admin/components/faculty/FacultyTable";
import { FacultyFiltersBar, type FacultyFiltersValue } from "@/modules/admin/components/faculty/FacultyFiltersBar";
import { FacultyQuickViewDrawer } from "@/modules/admin/components/faculty/FacultyQuickViewDrawer";
import { FacultyImportModal } from "@/modules/admin/components/faculty/FacultyImportModal";
import { FacultyAvatar } from "@/modules/admin/components/faculty/FacultyAvatar";
import { IdCardModal } from "@/modules/admin/components/shared/IdCardModal";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

export default function FacultyListPage() {
  const router = useRouter();
  const { show } = useToast();
  const { preferences, updatePreferences } = useFacultyPreferences();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [filters, setFilters] = useState<FacultyFiltersValue>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => preferences.pageSize);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => preferences.sortDirection);
  const [viewTargetId, setViewTargetId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [idCardFaculty, setIdCardFaculty] = useState<Faculty[] | null>(null);
  const idCardFacultyIds = useMemo(() => (idCardFaculty ?? []).map((f) => f.id), [idCardFaculty]);
  const { data: idCardStatusMap, isLoading: idCardStatusLoading } = useFacultyIdCardBulkStatus(idCardFacultyIds);
  const issueFacultyIdCard = useIssueFacultyIdCard();

  const { data, isLoading, error } = useFaculties({
    department_id: filters.department_id,
    status: filters.status,
    designation: filters.designation,
    year: filters.year,
    search: debouncedQuery || undefined,
    page,
    limit: pageSize,
  });

  // Global counts, independent of the current filters/page — each is a
  // cheap limit:1 fetch, reading only the total from its pagination meta.
  const { data: activeData } = useFaculties({ status: "active", limit: 1 });
  const { data: inactiveData } = useFaculties({ status: "inactive", limit: 1 });
  const { data: probationData } = useFaculties({ employment_status: "probation", limit: 1 });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta.total ?? 0;
  const activeCount = activeData?.meta.total ?? 0;
  const inactiveCount = inactiveData?.meta.total ?? 0;
  const probationCount = probationData?.meta.total ?? 0;

  // The backend always orders by id — sort direction here only reorders the
  // current page's rows by name, not the full filtered set across pages.
  const sortedRows = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => factor * fullName(a).localeCompare(fullName(b)));
  }, [rows, sortDirection]);

  function toggleSortDirection() {
    setSortDirection((prev) => {
      const next = prev === "asc" ? "desc" : "asc";
      updatePreferences({ sortDirection: next });
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const allOnPageSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedIds.has(row.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      sortedRows.forEach((row) => (allOnPageSelected ? next.delete(row.id) : next.add(row.id)));
      return next;
    });
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedRows = sortedRows.filter((row) => selectedIds.has(row.id));

  function handleGenerateIdCards() {
    if (selectedRows.length === 0) {
      show("Select one or more faculty first.", "error");
      return;
    }
    setIdCardFaculty(selectedRows);
  }

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Faculty</span>
      </nav>

      <PageHeader
        title="All Faculty"
        description={`${total.toLocaleString()} records · ${activeCount.toLocaleString()} active`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Icon name="upload" size={16} /> Import
            </Button>
            <Button variant="secondary" onClick={handleGenerateIdCards}>
              <Icon name="badge" size={16} /> ID cards
            </Button>
            <Link href="/admin/faculty/new">
              <Button variant="primary">
                <Icon name="person_add" size={16} /> Add Faculty
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mt-5 mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total faculty" value={(activeCount + inactiveCount).toLocaleString()} icon="groups" />
        <KpiCard label="Active" value={activeCount.toLocaleString()} icon="how_to_reg" />
        <KpiCard label="Inactive" value={inactiveCount.toLocaleString()} icon="person_off" />
        <KpiCard label="On probation" value={probationCount.toLocaleString()} icon="schedule" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-sm flex-1">
          <Input
            leadingIcon="search"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={toggleSortDirection} title="Toggle sort direction">
            <Icon name={sortDirection === "asc" ? "arrow_downward" : "arrow_upward"} size={16} />
            Name {sortDirection === "asc" ? "A–Z" : "Z–A"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => show(`Column visibility is coming soon (${FACULTY_LIST_COLUMNS.length} optional columns).`, "info")}
          >
            Columns
          </Button>
          <Button variant="secondary" onClick={() => exportFacultyRosterPdf(sortedRows)}>
            <Icon name="download" size={16} /> Export
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <FacultyFiltersBar
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          designationOptions={DESIGNATION_OPTIONS}
          yearOptions={YEAR_OPTIONS}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3">
          <BulkActionsBar
            count={selectedIds.size}
            onNotify={() => show("Notifications are coming soon.", "info")}
            onExportSelected={() => exportFacultyRosterPdf(selectedRows)}
            onGenerateIdCards={handleGenerateIdCards}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      <FacultyTable
        rows={sortedRows}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load faculty." : null}
        onView={(f) => setViewTargetId(f.id)}
        onEdit={(f) => router.push(`/admin/faculty/${f.id}/edit`)}
        onRowClick={(f) => router.push(`/admin/faculty/${f.id}`)}
        selectedIds={selectedIds}
        onToggleAll={toggleSelectAllOnPage}
        onToggleOne={toggleSelectOne}
        hiddenColumns={new Set(preferences.hiddenColumns)}
        footer={
          <NumberedPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              updatePreferences({ pageSize: size });
              setPage(1);
            }}
          />
        }
      />

      <FacultyQuickViewDrawer
        facultyId={viewTargetId}
        onClose={() => setViewTargetId(null)}
        onEdit={(faculty) => {
          setViewTargetId(null);
          router.push(`/admin/faculty/${faculty.id}/edit`);
        }}
      />

      <FacultyImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <IdCardModal
        open={idCardFaculty !== null}
        onClose={() => setIdCardFaculty(null)}
        entities={(idCardFaculty ?? []).map((f) => ({
          id: f.id,
          avatar: <FacultyAvatar faculty={f} className="size-11 shrink-0 rounded-admin-md text-sm" />,
          pickerAvatar: <FacultyAvatar faculty={f} className="size-7 rounded-admin-pill text-[10px]" />,
          title: fullName(f),
          subtitle: `${formatFacultyCode(f.id)} · ${f.designation} · ${f.department?.code ?? "—"}`,
          data: facultyToIdCardData(f),
        }))}
        statusMap={idCardStatusMap}
        statusLoading={idCardStatusLoading}
        issueCard={(id) => issueFacultyIdCard.mutateAsync(id)}
        fetchFullData={(id) => fetchFacultyById(id).then(facultyToIdCardData)}
        onIssued={() => {}}
      />
    </div>
  );
}
