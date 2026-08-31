"use client";

import { useMemo, useState } from "react";
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
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  COMPANY_INDUSTRIES,
  useCompanyReport,
  useDeleteCompany,
  type Company,
  type CompanyReportRow,
  type RecruiterStatus,
} from "@/modules/placement/api/companies";
import { lpa, dateLabel, recruiterStatusLabel } from "@/modules/placement/lib/format";
import { CompanyFormModal } from "@/modules/placement/components/companies/CompanyFormModal";
import { CompanyDetailDrawer } from "@/modules/placement/components/companies/CompanyDetailDrawer";

const PAGE_SIZE = 10;

const STATUS_TONE: Record<RecruiterStatus, "success" | "primary" | "neutral"> = {
  returning: "success",
  new: "primary",
  no_drives: "neutral",
};

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "open_roles", label: "Most open roles" },
  { value: "hired", label: "Most hired" },
  { value: "package", label: "Highest package" },
  { value: "recent_drive", label: "Most recent drive" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function toFormCompany(row: CompanyReportRow): Company {
  return {
    id: row.id,
    name: row.name,
    profileInfo: row.profileInfo,
    createdAt: "",
    industry: row.industry,
    location: row.location,
  };
}

function sortRows(rows: CompanyReportRow[], sort: SortKey): CompanyReportRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "open_roles":
      return sorted.sort((a, b) => b.openRoles - a.openRoles);
    case "hired":
      return sorted.sort((a, b) => b.hired - a.hired);
    case "package":
      return sorted.sort((a, b) => (b.highestPackageLpa ?? -1) - (a.highestPackageLpa ?? -1));
    case "recent_drive":
      return sorted.sort((a, b) => (b.lastDriveDate ?? "").localeCompare(a.lastDriveDate ?? ""));
    default:
      return sorted;
  }
}

export default function CompaniesPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortKey>("name_asc");
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<CompanyReportRow | "new" | null>(null);
  const [viewTarget, setViewTarget] = useState<CompanyReportRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyReportRow | null>(null);

  const { data, isLoading, error } = useCompanyReport();
  const { show } = useToast();
  const deleteCompany = useDeleteCompany();

  function resetPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteCompany.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Company deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const matched = rows.filter((r) => {
      const matchesQuery = !q || r.name.toLowerCase().includes(q) || (r.profileInfo ?? "").toLowerCase().includes(q);
      const matchesIndustry = !industry || r.industry === industry;
      const matchesStatus = !status || r.recruiterStatus === status;
      return matchesQuery && matchesIndustry && matchesStatus;
    });
    return sortRows(matched, sort);
  }, [rows, debouncedQuery, industry, status, sort]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const total = rows.length;
  const withDrives = rows.filter((r) => r.drivesCount > 0).length;
  const hiringThisCycle = rows.filter((r) => r.openRoles > 0);
  const returningHiring = hiringThisCycle.filter((r) => r.recruiterStatus === "returning").length;
  const newHiring = hiringThisCycle.filter((r) => r.recruiterStatus === "new").length;
  const offersMade = rows.reduce((a, r) => a + r.hired, 0);
  const packageSum = rows.reduce((a, r) => a + (r.averagePackageLpa ?? 0) * r.hired, 0);
  const averagePackage = offersMade > 0 ? packageSum / offersMade : null;

  const columns: DataTableColumn<CompanyReportRow>[] = [
    {
      key: "name",
      header: "Company",
      render: (r) => (
        <div>
          <p className="font-semibold text-admin-ink">{r.name}</p>
          <p className="text-xs text-admin-muted">{r.industry ?? "Industry not set"}</p>
        </div>
      ),
    },
    { key: "location", header: "Location", render: (r) => r.location ?? "—" },
    { key: "openRoles", header: "Open roles", mono: true, render: (r) => r.openRoles },
    { key: "hired", header: "Hired", mono: true, render: (r) => r.hired },
    { key: "average", header: "Average", mono: true, render: (r) => lpa(r.averagePackageLpa) },
    { key: "highest", header: "Highest", mono: true, render: (r) => lpa(r.highestPackageLpa) },
    { key: "lastDrive", header: "Last drive", render: (r) => dateLabel(r.lastDriveDate) },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge tone={STATUS_TONE[r.recruiterStatus]}>{recruiterStatusLabel(r.recruiterStatus)}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setFormTarget(r)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
            aria-label={`Edit ${r.name}`}
          >
            <Icon name="edit" size={17} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(r)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-danger-bg hover:text-admin-danger"
            aria-label={`Delete ${r.name}`}
          >
            <Icon name="delete" size={17} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Companies"
        description={`Recruiter relationships, hiring history and drive participation across ${total.toLocaleString()} companies.`}
        actions={
          <Button variant="primary" onClick={() => setFormTarget("new")}>
            <Icon name="add" size={16} /> Add company
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Companies in directory" icon="business_center" value={total.toLocaleString()} sub={`${withDrives} with a drive on record`} />
        <KpiCard
          label="Hiring this cycle"
          icon="how_to_reg"
          value={hiringThisCycle.length.toLocaleString()}
          sub={`${returningHiring} returning, ${newHiring} first-time`}
        />
        <KpiCard label="Offers made" icon="local_offer" value={offersMade.toLocaleString()} sub="Across all recruiters" />
        <KpiCard label="Average package" icon="payments" value={lpa(averagePackage)} sub="Weighted across all hired students" />
      </div>

      <FilterBar>
        <Input
          leadingIcon="search"
          placeholder="Search companies"
          value={query}
          onChange={(e) => resetPage(setQuery)(e.target.value)}
          className="max-w-xs"
        />
        <Select value={industry} onChange={(e) => resetPage(setIndustry)(e.target.value)} className="w-44">
          <option value="">All industries</option>
          {COMPANY_INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option value="returning">Returning</option>
          <option value="new">New</option>
          <option value="no_drives">Not yet recruited</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-48">
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
            setIndustry("");
            setStatus("");
            setSort("name_asc");
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
        onRowClick={setViewTarget}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle="No companies match these filters"
        footer={<NumberedPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />}
      />

      <CompanyFormModal
        open={formTarget !== null}
        company={formTarget === "new" || formTarget === null ? null : toFormCompany(formTarget)}
        onClose={() => setFormTarget(null)}
      />

      <CompanyDetailDrawer open={viewTarget !== null} company={viewTarget} onClose={() => setViewTarget(null)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete company"
        message={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteCompany.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
