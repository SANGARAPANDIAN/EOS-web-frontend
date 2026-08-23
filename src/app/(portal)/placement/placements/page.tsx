"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOffers } from "@/modules/placement/hooks/useOffers";
import { useStudentReport } from "@/modules/placement/hooks/useStudentReport";
import { useDashboardSummary } from "@/modules/placement/hooks/useDashboardSummary";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NumberedPagination } from "@/modules/admin/components/ui/NumberedPagination";
import { DepartmentPlacementBreakdown } from "@/modules/placement/components/placements/DepartmentPlacementBreakdown";
import { VerticalBarChart } from "@/modules/placement/components/placements/VerticalBarChart";
import type { Offer } from "@/modules/placement/types";

const PAGE_SIZE = 8;

function lpa(value: number | undefined): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

function joiningLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type SortKey = "student" | "reg" | "dept" | "company" | "role" | "ctc" | "joining" | "location";

function sortValue(r: Offer, key: SortKey): string | number {
  switch (key) {
    case "student":
      return r.studentName ?? r.studentIdNo;
    case "reg":
      return r.registerNo ?? r.rollNo ?? r.studentIdNo;
    case "dept":
      return r.departmentCode ?? "";
    case "company":
      return r.companyName;
    case "role":
      return r.jobRole ?? "";
    case "ctc":
      return r.offeredPackageLpa ?? r.packageLpa ?? -1;
    case "joining":
      return r.joiningDate ?? "";
    case "location":
      return r.workLocation ?? "";
  }
}

export default function PlacementsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All departments");
  const [joining, setJoining] = useState("All joining");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const { data: offersData, isLoading, error } = useOffers();
  const { data: studentReport } = useStudentReport();
  const { data: summary } = useDashboardSummary();

  function resetPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortableHeader(label: string, key: SortKey) {
    return (
      <button type="button" onClick={() => toggleSort(key)} className="flex items-center gap-1 uppercase">
        {label}
        {sortKey === key && <Icon name={sortDir === "asc" ? "arrow_upward" : "arrow_downward"} size={12} />}
      </button>
    );
  }

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
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchesQuery = !q || (r.studentName ?? r.studentIdNo).toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q);
      const matchesDept = department === "All departments" || r.departmentCode === department;
      const matchesJoining = joining === "All joining" || joiningLabel(r.joiningDate) === joining;
      return matchesQuery && matchesDept && matchesJoining;
    });
    if (sortKey) {
      list.sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, query, department, joining, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

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
    const header = ["Student", "Register number", "Dept", "Company", "Role", "CTC", "Joining", "Location", "Status"];
    const body = filtered.map((r) => [
      r.studentName ?? r.studentIdNo,
      r.registerNo ?? r.rollNo ?? r.studentIdNo,
      r.departmentCode ?? "—",
      r.companyName,
      r.jobRole ?? "—",
      lpa(r.offeredPackageLpa ?? r.packageLpa),
      joiningLabel(r.joiningDate),
      r.workLocation ?? "—",
      "Accepted",
    ]);
    downloadCsv("placements.csv", [header, ...body]);
  }

  const columns: DataTableColumn<Offer>[] = [
    { key: "student", header: sortableHeader("Student", "student"), width: "1.1fr", render: (r) => <span className="font-bold text-ink">{r.studentName ?? r.studentIdNo}</span> },
    { key: "reg", header: sortableHeader("Register no.", "reg"), width: "1fr", render: (r) => <span className="font-mono text-[12px]">{r.registerNo ?? r.rollNo ?? r.studentIdNo}</span> },
    { key: "dept", header: sortableHeader("Dept", "dept"), width: "0.7fr", render: (r) => <>{r.departmentCode ?? "—"}</> },
    { key: "company", header: sortableHeader("Company", "company"), width: "1fr", render: (r) => <span className="font-bold">{r.companyName}</span> },
    { key: "role", header: sortableHeader("Role", "role"), width: "1.2fr", render: (r) => <>{r.jobRole ?? "—"}</> },
    { key: "ctc", header: sortableHeader("CTC", "ctc"), width: "0.8fr", render: (r) => <span className="font-mono text-[12px]">{lpa(r.offeredPackageLpa ?? r.packageLpa)}</span> },
    { key: "joining", header: sortableHeader("Joining", "joining"), width: "0.8fr", render: (r) => <>{joiningLabel(r.joiningDate)}</> },
    { key: "location", header: sortableHeader("Location", "location"), width: "0.9fr", render: (r) => <>{r.workLocation ?? "—"}</> },
    { key: "status", header: "STATUS", width: "0.8fr", render: () => <Badge tone="accentDark">Accepted</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Placements</h1>
          <p className="mt-1.5 text-[13px] text-muted">Confirmed placements, joining details and outcome analysis.</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          Export
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
        <StatCard label="Students placed" value={placed} sub={`of ${totalStudents} registered`} barPercent={placementPct} />
        <StatCard
          label="Placement percentage"
          value={`${placementPct}%`}
          delta={trendDelta != null ? `${trendDelta >= 0 ? "+" : ""}${trendDelta} pts` : undefined}
          sub={`${placed} of ${totalStudents} registered`}
        />
        <StatCard label="Average package" value={lpa(averagePackage ?? undefined)} sub="Across accepted offers" />
        <StatCard
          label="Highest package"
          value={lpa(highestRow?.offeredPackageLpa ?? highestRow?.packageLpa)}
          sub={highestRow ? `${highestRow.companyName} · ${highestRow.departmentCode ?? "—"}` : "—"}
        />
      </div>

      <DataTable
        title="Placements"
        titleNote={
          <div className="flex gap-2.5">
            <Input value={query} onChange={(e) => resetPage(setQuery)(e.target.value)} placeholder="Search placements" className="h-[34px] min-w-55" />
            <Select value={department} onChange={(e) => resetPage(setDepartment)(e.target.value)} className="h-[34px]">
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select value={joining} onChange={(e) => resetPage(setJoining)(e.target.value)} className="h-[34px]">
              {joiningOptions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              className="h-[34px]"
              onClick={() => {
                setQuery("");
                setDepartment("All departments");
                setJoining("All joining");
                setSortKey(null);
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        }
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        loading={isLoading}
        hoverableRows
        onRowClick={(r) => router.push(`/placement/placements/${r.id}`)}
        emptyMessage={error ? "Failed to load placements." : "No placements match these filters."}
      />
      <NumberedPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
        <DepartmentPlacementBreakdown data={summary?.placementRateByDepartment ?? []} />
        <VerticalBarChart data={summary?.packageBands ?? []} />
      </div>
    </div>
  );
}
