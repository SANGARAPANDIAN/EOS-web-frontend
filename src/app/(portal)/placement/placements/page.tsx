"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { downloadCsv } from "@/lib/utils/csv";
import { ApiError } from "@/types/api";
import {
  PageHeader,
  Button,
  Badge,
  FilterBar,
  Input,
  Select,
  KpiCard,
  SectionCard,
  DataTable,
  NumberedPagination,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { VerticalBarChart } from "@/modules/admin/components/ui/charts";
import { useOffers, type Offer } from "@/modules/placement/api/offers";
import { useStudentReport } from "@/modules/placement/api/studentReport";
import { useDashboardSummary } from "@/modules/placement/api/dashboard";
import { lpa } from "@/modules/placement/lib/format";
import { DepartmentPlacementBreakdown } from "@/modules/placement/components/placements/DepartmentPlacementBreakdown";

const PAGE_SIZE = 8;

function joiningLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export default function PlacementsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [department, setDepartment] = useState("All departments");
  const [joining, setJoining] = useState("All joining");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const { data: offersData, isLoading, error } = useOffers();
  const { data: studentReport } = useStudentReport();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();

  const rows = useMemo(() => (offersData ?? []).filter((o) => o.offerResponse === "accepted"), [offersData]);
  const totalStudents = studentReport?.length ?? 0;

  const departmentOptions = useMemo(() => {
    const codes = new Set(rows.map((r) => r.departmentCode).filter((c): c is string => !!c));
    return ["All departments", ...Array.from(codes).sort()];
  }, [rows]);

  const joiningOptions = useMemo(() => {
    const labels = new Set(rows.map((r) => joiningLabel(r.joiningDate)).filter((l) => l !== "—"));
    return ["All joining", ...Array.from(labels).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = !q || (r.studentName ?? r.studentIdNo).toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q);
      const matchesDept = department === "All departments" || r.departmentCode === department;
      const matchesJoining = joining === "All joining" || joiningLabel(r.joiningDate) === joining;
      return matchesQuery && matchesDept && matchesJoining;
    });
  }, [rows, debouncedQuery, department, joining]);

  const pageRows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const placed = rows.length;
  const placementPct = totalStudents > 0 ? Math.round((placed / totalStudents) * 1000) / 10 : 0;
  const trend = summary?.sixYearTrend ?? [];
  const trendDelta = trend.length >= 2 ? Math.round((trend[trend.length - 1].rate - trend[trend.length - 2].rate) * 10) / 10 : null;

  const packages = rows.map((r) => r.offeredPackageLpa ?? r.packageLpa).filter((p): p is number => p != null);
  const averagePackage = packages.length ? packages.reduce((a, b) => a + b, 0) / packages.length : null;
  const highestRow = rows.reduce<Offer | null>((best, r) => {
    const p = r.offeredPackageLpa ?? r.packageLpa ?? -1;
    const bestP = best ? (best.offeredPackageLpa ?? best.packageLpa ?? -1) : -1;
    return p > bestP ? r : best;
  }, null);

  function handleExport() {
    downloadCsv(
      "placements.csv",
      [
        { header: "Student", value: (r: Offer) => r.studentName ?? r.studentIdNo },
        { header: "Register number", value: (r: Offer) => r.registerNo ?? r.rollNo ?? r.studentIdNo },
        { header: "Dept", value: (r: Offer) => r.departmentCode ?? "" },
        { header: "Company", value: (r: Offer) => r.companyName },
        { header: "Role", value: (r: Offer) => r.jobRole ?? "" },
        { header: "CTC", value: (r: Offer) => lpa(r.offeredPackageLpa ?? r.packageLpa) },
        { header: "Joining", value: (r: Offer) => joiningLabel(r.joiningDate) },
        { header: "Location", value: (r: Offer) => r.workLocation ?? "" },
        { header: "Status", value: () => "Accepted" },
      ],
      filtered,
    );
  }

  const columns: DataTableColumn<Offer>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div>
          <p className="font-semibold text-admin-ink">{r.studentName ?? r.studentIdNo}</p>
          <p className="text-xs text-admin-muted">{r.registerNo ?? r.rollNo ?? r.studentIdNo}</p>
        </div>
      ),
    },
    { key: "dept", header: "Dept", render: (r) => r.departmentCode ?? "—" },
    {
      key: "company",
      header: "Company",
      render: (r) => (
        <div>
          <p className="font-semibold text-admin-body">{r.companyName}</p>
          {r.jobRole && <p className="text-xs text-admin-muted">{r.jobRole}</p>}
        </div>
      ),
    },
    { key: "ctc", header: "CTC", mono: true, render: (r) => lpa(r.offeredPackageLpa ?? r.packageLpa) },
    { key: "joining", header: "Joining", render: (r) => joiningLabel(r.joiningDate) },
    { key: "location", header: "Location", render: (r) => r.workLocation ?? "—" },
    { key: "status", header: "Status", render: () => <Badge tone="success">Accepted</Badge> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Placements"
        description="Confirmed placements, joining details and outcome analysis."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Icon name="download" size={16} /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Students placed" icon="workspace_premium" value={placed} sub={`of ${totalStudents.toLocaleString()} registered`} progress={placementPct} />
        <KpiCard
          label="Placement percentage"
          icon="percent"
          value={`${placementPct}%`}
          delta={trendDelta != null ? `${trendDelta >= 0 ? "+" : ""}${trendDelta} pts` : undefined}
          sub={`${placed} of ${totalStudents} registered`}
        />
        <KpiCard label="Average package" icon="payments" value={lpa(averagePackage ?? undefined)} sub="Across accepted offers" />
        <KpiCard
          label="Highest package"
          icon="military_tech"
          value={lpa(highestRow?.offeredPackageLpa ?? highestRow?.packageLpa)}
          sub={highestRow ? `${highestRow.companyName} · ${highestRow.departmentCode ?? "—"}` : "—"}
        />
      </div>

      <FilterBar>
        <Input leadingIcon="search" placeholder="Search placements" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className="w-44">
          {departmentOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select value={joining} onChange={(e) => { setJoining(e.target.value); setPage(1); }} className="w-40">
          {joiningOptions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/placement/placements/${r.id}`)}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load placements." : null}
        emptyTitle="No placements match these filters"
        footer={
          <NumberedPagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Department-wise placement" subtitle="Placed vs registered">
          <DepartmentPlacementBreakdown data={summary?.placementRateByDepartment ?? []} isLoading={summaryLoading} />
        </SectionCard>
        <SectionCard title="Package bands" subtitle="Accepted offers by CTC range">
          {summary && summary.packageBands.some((b) => b.count > 0) ? (
            <VerticalBarChart data={summary.packageBands.map((b) => ({ label: `₹${b.label}`, value: b.count }))} height={200} />
          ) : (
            <p className="flex h-[200px] items-center justify-center text-sm text-admin-subtle">
              {summaryLoading ? "Loading…" : "No accepted offers yet."}
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
