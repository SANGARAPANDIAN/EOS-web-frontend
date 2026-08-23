"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDriveReport } from "@/modules/placement/hooks/useDriveReport";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NumberedPagination } from "@/modules/admin/components/ui/NumberedPagination";
import type { DriveDisplayStatus, DriveReportRow } from "@/modules/placement/types";

const PAGE_SIZE = 10;

function statusLabel(status: DriveDisplayStatus): string {
  if (status === "upcoming") return "Upcoming";
  if (status === "ongoing") return "Ongoing";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

function statusTone(status: DriveDisplayStatus): "accent" | "accentDark" | "neutral" | "danger" {
  if (status === "upcoming") return "accent";
  if (status === "ongoing") return "accentDark";
  if (status === "completed") return "neutral";
  return "danger";
}

function modeLabel(mode: DriveReportRow["mode"]): string {
  if (mode === "on_campus") return "On campus";
  if (mode === "virtual") return "Virtual";
  return "—";
}

function lpa(value: number | null): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type SortKey = "company" | "role" | "date" | "ctc" | "mode" | "applied" | "shortlisted" | "conversion" | "status";

function sortValue(r: DriveReportRow, key: SortKey): string | number {
  switch (key) {
    case "company":
      return r.companyName;
    case "role":
      return r.jobRole ?? "";
    case "date":
      return r.scheduledDate;
    case "ctc":
      return r.packageLpa ?? -1;
    case "mode":
      return modeLabel(r.mode);
    case "applied":
      return r.applied;
    case "shortlisted":
      return r.shortlisted;
    case "conversion":
      return r.conversionPct;
    case "status":
      return statusLabel(r.displayStatus);
  }
}

export default function PlacementDrivesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [mode, setMode] = useState("All modes");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useDriveReport();

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchesQuery = !q || r.companyName.toLowerCase().includes(q) || (r.jobRole ?? "").toLowerCase().includes(q);
      const matchesStatus = status === "All statuses" || statusLabel(r.displayStatus) === status;
      const matchesMode = mode === "All modes" || modeLabel(r.mode) === mode;
      return matchesQuery && matchesStatus && matchesMode;
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
  }, [rows, query, status, mode, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const now = useMemo(() => new Date(), []);
  const thisYear = rows.filter((r) => new Date(r.scheduledDate).getFullYear() === now.getFullYear()).length;
  const upcoming = rows.filter((r) => r.displayStatus === "upcoming").length;
  const ongoing = rows.filter((r) => r.displayStatus === "ongoing").length;
  const completed = rows.filter((r) => r.displayStatus === "completed").length;

  const columns: DataTableColumn<DriveReportRow>[] = [
    { key: "company", header: sortableHeader("Company", "company"), width: "1.1fr", render: (r) => <span className="font-bold text-ink">{r.companyName}</span> },
    { key: "role", header: sortableHeader("Role", "role"), width: "1.3fr", render: (r) => <>{r.jobRole ?? "—"}</> },
    { key: "date", header: sortableHeader("Date", "date"), width: "0.9fr", render: (r) => <>{dateLabel(r.scheduledDate)}</> },
    { key: "ctc", header: sortableHeader("CTC", "ctc"), width: "0.8fr", render: (r) => <span className="font-mono">{lpa(r.packageLpa)}</span> },
    { key: "mode", header: sortableHeader("Mode", "mode"), width: "0.8fr", render: (r) => <>{modeLabel(r.mode)}</> },
    { key: "applied", header: sortableHeader("Applied", "applied"), width: "0.7fr", render: (r) => <span className="font-mono">{r.applied}</span> },
    { key: "shortlisted", header: sortableHeader("Shortlisted", "shortlisted"), width: "0.9fr", render: (r) => <span className="font-mono">{r.shortlisted}</span> },
    {
      key: "conversion",
      header: sortableHeader("Conversion", "conversion"),
      width: "1fr",
      render: (r) => (
        <div className="flex items-center gap-2">
          <ProgressBar percent={r.conversionPct} height={6} className="flex-1" />
          <span className="font-mono text-xs">{r.conversionPct}%</span>
        </div>
      ),
    },
    { key: "status", header: sortableHeader("Status", "status"), width: "0.8fr", render: (r) => <Badge tone={statusTone(r.displayStatus)}>{statusLabel(r.displayStatus)}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Placement Drives</h1>
          <p className="mt-1.5 text-[13px] text-muted">Scheduling, eligibility cut-offs and round-wise progress for each drive.</p>
        </div>
        <Button variant="primarySmall" onClick={() => router.push("/placement/drives/new")}>
          Add drive
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
        <StatCard label="Drives this year" value={thisYear.toLocaleString()} sub="Completed and scheduled" />
        <StatCard label="Upcoming" value={upcoming.toLocaleString()} sub="Next 30 days" />
        <StatCard label="Ongoing" value={ongoing.toLocaleString()} sub="Rounds in progress" />
        <StatCard label="Completed" value={completed.toLocaleString()} sub="Results published" />
      </div>

      <DataTable
        title="Placement drives"
        titleNote={
          <div className="flex flex-wrap justify-end gap-2">
            <Input value={query} onChange={(e) => resetPage(setQuery)(e.target.value)} placeholder="Search placement drives" className="h-[34px] min-w-50" />
            <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className="h-[34px]">
              {["All statuses", "Upcoming", "Ongoing", "Completed", "Cancelled"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select value={mode} onChange={(e) => resetPage(setMode)(e.target.value)} className="h-[34px]">
              {["All modes", "On campus", "Virtual"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              className="h-[34px]"
              onClick={() => {
                setQuery("");
                setStatus("All statuses");
                setMode("All modes");
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
        onRowClick={(r) => router.push(`/placement/drives/${r.id}`)}
        emptyMessage={error ? "Failed to load placement drives." : "No drives match these filters."}
      />
      <NumberedPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
