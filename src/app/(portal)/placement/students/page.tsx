"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/types/api";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { useStudentReport } from "@/modules/placement/hooks/useStudentReport";
import { useBatches } from "@/modules/placement/hooks/useBatches";
import { useStudentReportDownload } from "@/modules/placement/hooks/useStudentReportDownload";
import { useUpdatePlacementStatus } from "@/modules/placement/hooks/useUpdatePlacementStatus";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NumberedPagination } from "@/modules/admin/components/ui/NumberedPagination";
import type { StudentReportRow } from "@/modules/placement/types";

const PAGE_SIZE = 10;

function yearLabel(year: number | null): string {
  if (year == null) return "—";
  const suffix = year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th";
  return `${year}${suffix} Year`;
}

function statusLabel(status: StudentReportRow["status"]): string {
  if (status === "placed") return "Placed";
  if (status === "rejected") return "Not placed";
  if (status === null) return "Not applied";
  return "In process";
}

function statusTone(status: StudentReportRow["status"]): "accent" | "accentDark" | "neutral" | "danger" {
  if (status === "placed") return "accentDark";
  if (status === "rejected") return "danger";
  if (status === null) return "neutral";
  return "accent";
}

// Opt-out overrides eligibility in display — a student who opted out isn't
// meaningfully "eligible" or "not eligible" for this cycle anymore.
function eligibilityLabel(r: StudentReportRow): string {
  if (r.placementOptedOut) return "Opted out";
  if (r.placementEligible === true) return "Eligible";
  if (r.placementEligible === false) return "Not eligible";
  return "Not assessed";
}

function eligibilityTone(r: StudentReportRow): "accent" | "accentDark" | "neutral" | "danger" {
  if (r.placementOptedOut) return "neutral";
  if (r.placementEligible === true) return "accent";
  if (r.placementEligible === false) return "danger";
  return "neutral";
}

type SortKey = "reg" | "name" | "dept" | "year" | "eligibility" | "apps" | "offers" | "status";

function sortValue(r: StudentReportRow, key: SortKey): string | number {
  switch (key) {
    case "reg":
      return r.registerNo ?? r.rollNo ?? r.studentIdNo;
    case "name":
      return r.name ?? r.studentIdNo;
    case "dept":
      return r.departmentCode ?? r.departmentName ?? "";
    case "year":
      return r.year ?? 0;
    case "eligibility":
      return eligibilityLabel(r);
    case "apps":
      return r.drivesApplied;
    case "offers":
      return r.offersCount;
    case "status":
      return statusLabel(r.status);
  }
}

export default function StudentsPage() {
  const router = useRouter();
  const { show } = useToast();

  const [query, setQuery] = useState("");
  const [batchId, setBatchId] = useState<number | "all">("all");
  const [department, setDepartment] = useState("All departments");
  const [year, setYear] = useState("All years");
  const [status, setStatus] = useState("All statuses");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const { data: batches } = useBatches();
  const { data, isLoading, error } = useStudentReport(batchId === "all" ? undefined : batchId);
  const pdfDownload = useStudentReportDownload();
  const excelDownload = useStudentReportDownload();
  const updatePlacementStatus = useUpdatePlacementStatus();

  function setEligible(r: StudentReportRow, value: boolean) {
    updatePlacementStatus.mutate(
      { studentId: r.id, input: { placementEligible: value } },
      {
        onSuccess: () => show(value ? "Marked eligible." : "Marked not eligible.", "success"),
        onError: (err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"),
      },
    );
  }

  function setOptedOut(r: StudentReportRow, value: boolean) {
    updatePlacementStatus.mutate(
      { studentId: r.id, input: { placementOptedOut: value } },
      {
        onSuccess: () => show(value ? "Marked opted out." : "Cleared opt-out.", "success"),
        onError: (err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"),
      },
    );
  }

  function handleDownload(format: "pdf" | "excel") {
    const mutation = format === "pdf" ? pdfDownload : excelDownload;
    mutation.mutate(
      { format, batchId: batchId === "all" ? undefined : batchId },
      { onError: (err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error") },
    );
  }

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

  const rows = useMemo(() => data ?? [], [data]);

  const departmentOptions = useMemo(() => {
    const names = new Set(rows.map((r) => r.departmentCode ?? r.departmentName).filter((n): n is string => !!n));
    return ["All departments", ...Array.from(names).sort()];
  }, [rows]);

  const yearOptions = useMemo(() => {
    const years = new Set(rows.map((r) => r.year).filter((y): y is number => y != null));
    return ["All years", ...Array.from(years).sort().map(yearLabel)];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchesQuery =
        !q ||
        (r.name ?? "").toLowerCase().includes(q) ||
        r.studentIdNo.toLowerCase().includes(q) ||
        (r.rollNo ?? "").toLowerCase().includes(q) ||
        (r.registerNo ?? "").toLowerCase().includes(q) ||
        (r.departmentName ?? "").toLowerCase().includes(q) ||
        (r.departmentCode ?? "").toLowerCase().includes(q);
      const matchesDept = department === "All departments" || r.departmentCode === department || r.departmentName === department;
      const matchesYear = year === "All years" || yearLabel(r.year) === year;
      const matchesStatus = status === "All statuses" || statusLabel(r.status) === status;
      return matchesQuery && matchesDept && matchesYear && matchesStatus;
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
  }, [rows, query, department, year, status, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const total = rows.length;
  const placedCount = rows.filter((r) => r.status === "placed").length;
  const placedPct = total > 0 ? Math.round((placedCount / total) * 100) : 0;
  const departmentCount = new Set(rows.map((r) => r.departmentCode ?? r.departmentName).filter(Boolean)).size;
  const eligibleCount = rows.filter((r) => r.placementEligible === true).length;
  const assessedCount = rows.filter((r) => r.placementEligible !== null).length;
  const optedOutCount = rows.filter((r) => r.placementOptedOut).length;

  const columns: DataTableColumn<StudentReportRow>[] = [
    {
      key: "reg",
      header: sortableHeader("Register number", "reg"),
      width: "1fr",
      render: (r) => <span className="font-mono">{r.registerNo ?? r.rollNo ?? r.studentIdNo}</span>,
    },
    {
      key: "name",
      header: sortableHeader("Student", "name"),
      width: "1.3fr",
      render: (r) => <span className="font-semibold text-ink">{r.name ?? r.studentIdNo}</span>,
    },
    {
      key: "dept",
      header: sortableHeader("Department", "dept"),
      width: "0.8fr",
      render: (r) => <>{r.departmentCode ?? r.departmentName ?? "—"}</>,
    },
    { key: "year", header: sortableHeader("Year", "year"), width: "0.8fr", render: (r) => <>{yearLabel(r.year)}</> },
    { key: "cgpa", header: "CGPA", width: "0.6fr", render: () => <span className="font-mono">—</span> },
    { key: "backlogs", header: "Backlogs", width: "0.7fr", render: () => <span className="font-mono">—</span> },
    {
      key: "eligibility",
      header: sortableHeader("Eligibility", "eligibility"),
      width: "0.9fr",
      render: (r) => <Badge tone={eligibilityTone(r)}>{eligibilityLabel(r)}</Badge>,
    },
    {
      key: "apps",
      header: sortableHeader("Applied", "apps"),
      width: "0.7fr",
      render: (r) => <span className="font-mono">{r.drivesApplied}</span>,
    },
    {
      key: "offers",
      header: sortableHeader("Offers", "offers"),
      width: "0.6fr",
      render: (r) => <span className="font-mono">{r.offersCount}</span>,
    },
    {
      key: "status",
      header: sortableHeader("Status", "status"),
      width: "0.9fr",
      render: (r) => <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>,
    },
    {
      key: "actions",
      header: "",
      width: "1.3fr",
      align: "right",
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            className="h-7 px-2 text-xs"
            onClick={() => setEligible(r, r.placementEligible !== true)}
          >
            {r.placementEligible === true ? "Mark not eligible" : "Mark eligible"}
          </Button>
          <Button
            variant="secondary"
            className={r.placementOptedOut ? "h-7 px-2 text-xs" : "h-7 px-2 text-xs text-danger-fg border-danger-border"}
            onClick={() => setOptedOut(r, !r.placementOptedOut)}
          >
            {r.placementOptedOut ? "Clear opt-out" : "Mark opted out"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Students</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Application history and placement status across {total.toLocaleString()} registered students.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={pdfDownload.isPending} onClick={() => handleDownload("pdf")}>
            {pdfDownload.isPending ? "Exporting…" : "Export PDF"}
          </Button>
          <Button variant="secondary" disabled={excelDownload.isPending} onClick={() => handleDownload("excel")}>
            {excelDownload.isPending ? "Exporting…" : "Export Excel"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
        <StatCard label="Registered students" value={total.toLocaleString()} sub={`Across ${departmentCount} departments`} />
        <StatCard
          label="Eligible this cycle"
          value={eligibleCount.toLocaleString()}
          sub={assessedCount > 0 ? `${assessedCount} of ${total.toLocaleString()} assessed so far` : "Mark students eligible from the table below"}
        />
        <StatCard label="Placed" value={placedCount.toLocaleString()} sub={`${placedPct}% of ${total.toLocaleString()} registered`} barPercent={placedPct} />
        <StatCard
          label="Opted out"
          value={optedOutCount.toLocaleString()}
          sub={optedOutCount > 0 ? `${optedOutCount} of ${total.toLocaleString()} registered` : "None recorded yet"}
        />
      </div>

      <DataTable
        title="Student report"
        titleNote={
          <div className="flex flex-wrap justify-end gap-2">
            <Input value={query} onChange={(e) => resetPage(setQuery)(e.target.value)} placeholder="Search students" className="h-[34px] min-w-50" />
            <Select value={batchId === "all" ? "all" : String(batchId)} onChange={(e) => resetPage(setBatchId)(e.target.value === "all" ? "all" : Number(e.target.value))} className="h-[34px]">
              <option value="all">All batches</option>
              {batches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select value={department} onChange={(e) => resetPage(setDepartment)(e.target.value)} className="h-[34px]">
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select value={year} onChange={(e) => resetPage(setYear)(e.target.value)} className="h-[34px]">
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className="h-[34px]">
              {["All statuses", "Placed", "In process", "Not placed", "Not applied"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              className="h-[34px]"
              onClick={() => {
                setQuery("");
                setBatchId("all");
                setDepartment("All departments");
                setYear("All years");
                setStatus("All statuses");
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
        onRowClick={(r) => router.push(`/placement/students/${r.id}`)}
        emptyMessage={error ? "Failed to load student report." : "No students match these filters."}
      />
      <NumberedPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
