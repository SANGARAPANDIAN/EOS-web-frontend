"use client";

import { useMemo, useState } from "react";
import { ApiError } from "@/types/api";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Icon } from "@/components/ui/Icon";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NumberedPagination } from "@/modules/admin/components/ui/NumberedPagination";
import { useCompanyReport } from "@/modules/placement/hooks/useCompanyReport";
import { useDeleteCompany } from "@/modules/placement/hooks/useCompanyMutations";
import { CompanyFormModal } from "@/modules/placement/components/companies/CompanyFormModal";
import { CompanyDetailModal } from "@/modules/placement/components/companies/CompanyDetailModal";
import { COMPANY_INDUSTRIES, type Company, type CompanyReportRow, type RecruiterStatus } from "@/modules/placement/types";

const PAGE_SIZE = 10;

const STATUS_TONE: Record<string, BadgeTone> = {
  Returning: "accentDark",
  New: "accent",
  "Not yet recruited": "neutral",
};

type SortKey = "name" | "industry" | "location" | "openRoles" | "hired" | "average" | "highest" | "lastDrive" | "status";

function statusLabel(status: RecruiterStatus): string {
  if (status === "returning") return "Returning";
  if (status === "new") return "New";
  return "Not yet recruited";
}

function lpa(value: number | null): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toFormCompany(row: CompanyReportRow): Company {
  return { id: row.id, name: row.name, profileInfo: row.profileInfo, createdAt: "", industry: row.industry, location: row.location };
}

function sortValue(r: CompanyReportRow, key: SortKey): string | number {
  switch (key) {
    case "name": return r.name;
    case "industry": return r.industry ?? "";
    case "location": return r.location ?? "";
    case "openRoles": return r.openRoles;
    case "hired": return r.hired;
    case "average": return r.averagePackageLpa ?? -1;
    case "highest": return r.highestPackageLpa ?? -1;
    case "lastDrive": return r.lastDriveDate ?? "";
    case "status": return statusLabel(r.recruiterStatus);
  }
}

function SortableHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: { key: SortKey; dir: "asc" | "desc" } | null; onSort: (key: SortKey) => void }) {
  const active = sort?.key === sortKey;
  return (
    <button type="button" onClick={() => onSort(sortKey)} className="flex items-center gap-0.5 text-inherit uppercase">
      {label}
      {active && <Icon name={sort!.dir === "asc" ? "arrow_upward" : "arrow_downward"} size={12} />}
    </button>
  );
}

export default function CompaniesPage() {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("All industries");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<CompanyReportRow | "new" | null>(null);
  const [viewTarget, setViewTarget] = useState<CompanyReportRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyReportRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, error } = useCompanyReport();
  const { show } = useToast();
  const deleteCompany = useDeleteCompany();

  function resetPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function handleSort(key: SortKey) {
    setSort((prev) => (prev?.key === key ? (prev.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));
    setPage(1);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    deleteCompany.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Company deleted.", "success");
        setDeleteTarget(null);
        setDeleting(false);
      },
      onError: (err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong.", "error");
        setDeleting(false);
      },
    });
  }

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = rows.filter((r) => {
      const matchesQuery = !q || r.name.toLowerCase().includes(q) || (r.profileInfo ?? "").toLowerCase().includes(q);
      const matchesIndustry = industry === "All industries" || r.industry === industry;
      const matchesStatus = status === "All statuses" || statusLabel(r.recruiterStatus) === status;
      return matchesQuery && matchesIndustry && matchesStatus;
    });
    if (!sort) return base;
    return [...base].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, query, industry, status, sort]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const total = rows.length;
  const withDrives = rows.filter((r) => r.drivesCount > 0).length;
  const hiringThisCycle = rows.filter((r) => r.openRoles > 0);
  const returningHiring = hiringThisCycle.filter((r) => r.recruiterStatus === "returning").length;
  const newHiring = hiringThisCycle.filter((r) => r.recruiterStatus === "new").length;
  const offersMade = rows.reduce((a, r) => a + r.hired, 0);
  const packageSum = rows.reduce((a, r) => a + (r.averagePackageLpa ?? 0) * r.hired, 0);
  const averagePackage = offersMade > 0 ? packageSum / offersMade : null;

  const columns: DataTableColumn<CompanyReportRow>[] = [
    { key: "name", header: <SortableHeader label="Company" sortKey="name" sort={sort} onSort={handleSort} />, width: "1.2fr", render: (r) => <span className="font-bold text-ink">{r.name}</span> },
    { key: "industry", header: <SortableHeader label="Industry" sortKey="industry" sort={sort} onSort={handleSort} />, width: "1fr", render: (r) => <>{r.industry ?? "—"}</> },
    { key: "location", header: <SortableHeader label="Location" sortKey="location" sort={sort} onSort={handleSort} />, width: "0.9fr", render: (r) => <>{r.location ?? "—"}</> },
    { key: "openRoles", header: <SortableHeader label="Open roles" sortKey="openRoles" sort={sort} onSort={handleSort} />, width: "0.7fr", render: (r) => <span className="font-mono text-[12.5px]">{r.openRoles}</span> },
    { key: "hired", header: <SortableHeader label="Hired" sortKey="hired" sort={sort} onSort={handleSort} />, width: "0.7fr", render: (r) => <span className="font-mono text-[12.5px]">{r.hired}</span> },
    { key: "average", header: <SortableHeader label="Average" sortKey="average" sort={sort} onSort={handleSort} />, width: "0.9fr", render: (r) => <span className="font-mono text-[12.5px]">{lpa(r.averagePackageLpa)}</span> },
    { key: "highest", header: <SortableHeader label="Highest" sortKey="highest" sort={sort} onSort={handleSort} />, width: "0.9fr", render: (r) => <span className="font-mono text-[12.5px]">{lpa(r.highestPackageLpa)}</span> },
    { key: "lastDrive", header: <SortableHeader label="Last drive" sortKey="lastDrive" sort={sort} onSort={handleSort} />, width: "1fr", render: (r) => <>{dateLabel(r.lastDriveDate)}</> },
    { key: "status", header: <SortableHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />, width: "0.8fr", render: (r) => <Badge tone={STATUS_TONE[statusLabel(r.recruiterStatus)]}>{statusLabel(r.recruiterStatus)}</Badge> },
    {
      key: "actions",
      header: "",
      width: "1.4fr",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setViewTarget(r)} className="text-[12.5px] font-semibold text-primary">View</button>
          <button type="button" onClick={() => setFormTarget(r)} className="text-[12.5px] font-semibold text-primary">Edit</button>
          <button type="button" onClick={() => setDeleteTarget(r)} className="text-[12.5px] font-semibold text-danger-fg">Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Companies</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Recruiter relationships, hiring history and drive participation across {total.toLocaleString()} companies.
          </p>
        </div>
        <Button variant="primarySmall" onClick={() => setFormTarget("new")}>
          Add company
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
        <StatCard label="Companies in directory" value={total.toLocaleString()} sub={`${withDrives} with at least one drive on record`} />
        <StatCard label="Hiring this cycle" value={hiringThisCycle.length.toLocaleString()} sub={`${returningHiring} returning, ${newHiring} first-time`} />
        <StatCard label="Offers made" value={offersMade.toLocaleString()} sub="Across all recruiters" />
        <StatCard label="Average package" value={lpa(averagePackage)} sub="Weighted across all hired students" />
      </div>

      <DataTable
        title="Company directory"
        titleNote={
          <div className="flex flex-wrap gap-2">
            <Input value={query} onChange={(e) => resetPage(setQuery)(e.target.value)} placeholder="Search companies" className="h-[34px] min-w-55" />
            <Select value={industry} onChange={(e) => resetPage(setIndustry)(e.target.value)} className="h-[34px] w-auto">
              {["All industries", ...COMPANY_INDUSTRIES].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className="h-[34px] w-auto">
              {["All statuses", "Returning", "New", "Not yet recruited"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Button
              variant="secondary"
              className="h-[34px]"
              onClick={() => {
                setQuery("");
                setIndustry("All industries");
                setStatus("All statuses");
                setSort(null);
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        }
        columns={columns}
        data={pageRows}
        rowKey={(r) => r.id}
        loading={isLoading}
        hoverableRows
        onRowClick={setViewTarget}
        emptyMessage={error ? "Failed to load companies." : "No companies match these filters."}
      />
      <NumberedPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <CompanyFormModal open={formTarget !== null} company={formTarget === "new" || formTarget === null ? null : toFormCompany(formTarget)} onClose={() => setFormTarget(null)} />

      <CompanyDetailModal open={viewTarget !== null} company={viewTarget ? toFormCompany(viewTarget) : null} onClose={() => setViewTarget(null)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete company"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
