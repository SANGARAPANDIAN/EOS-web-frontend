"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useInterviews } from "@/modules/placement/hooks/useInterviews";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NumberedPagination } from "@/modules/admin/components/ui/NumberedPagination";
import { ScheduleInterviewModal } from "@/modules/placement/components/interviews/ScheduleInterviewModal";
import { RecordResultModal } from "@/modules/placement/components/interviews/RecordResultModal";
import type { ApplicationStatus, InterviewRow, InterviewStatus } from "@/modules/placement/types";

const PAGE_SIZE = 10;

function statusLabel(status: InterviewStatus): string {
  if (status === "scheduled") return "Scheduled";
  if (status === "in_progress") return "In progress";
  return "Completed";
}

function resultLabel(status: ApplicationStatus | null): string {
  if (status === "placed") return "Selected";
  if (status === "rejected") return "Rejected";
  if (status === "r1_cleared" || status === "r2_cleared" || status === "r3_cleared") return "In process";
  return "Pending";
}

function statusTone(status: InterviewStatus): "accent" | "accentDark" | "neutral" {
  if (status === "completed") return "accentDark";
  if (status === "in_progress") return "accent";
  return "neutral";
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type SortKey = "student" | "company" | "role" | "round" | "slot" | "panel" | "status" | "result";

function sortValue(r: InterviewRow, key: SortKey): string {
  switch (key) {
    case "student":
      return r.studentName;
    case "company":
      return r.companyName;
    case "role":
      return r.jobRole ?? "";
    case "round":
      return r.roundLabel;
    case "slot":
      return r.slotLabel;
    case "panel":
      return r.panelMember;
    case "status":
      return statusLabel(r.status);
    case "result":
      return resultLabel(r.applicationStatus);
  }
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

export default function InterviewsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [department, setDepartment] = useState("All departments");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [scheduleTarget, setScheduleTarget] = useState<InterviewRow | "new" | null>(null);
  const [resultTarget, setResultTarget] = useState<InterviewRow | null>(null);

  const { data, isLoading, error } = useInterviews();

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
    const codes = new Set(rows.map((r) => r.departmentCode).filter((c): c is string => !!c));
    return ["All departments", ...Array.from(codes).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchesQuery = !q || r.studentName.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q);
      const matchesStatus = status === "All statuses" || statusLabel(r.status) === status;
      const matchesDept = department === "All departments" || r.departmentCode === department;
      return matchesQuery && matchesStatus && matchesDept;
    });
    if (sortKey) {
      list.sort((a, b) => {
        const cmp = sortValue(a, sortKey).localeCompare(sortValue(b, sortKey));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, query, status, department, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const now = useMemo(() => new Date(), []);
  const scheduledToday = rows.filter((r) => isSameDay(new Date(r.interviewDate), now) && r.status !== "completed").length;
  const in48Hours = useMemo(() => {
    const twoDaysOut = new Date(now);
    twoDaysOut.setDate(twoDaysOut.getDate() + 2);
    return rows.filter((r) => {
      const d = new Date(r.interviewDate);
      return d > now && d <= twoDaysOut && r.status !== "completed";
    }).length;
  }, [rows, now]);
  const selected = rows.filter((r) => r.applicationStatus === "placed").length;
  const roundsCompleted = rows.filter((r) => r.status === "completed").length;

  function handleExportSchedule() {
    const header = ["Student", "Company", "Role", "Round", "Slot", "Panel", "Status", "Result"];
    const body = filtered.map((r) => [
      r.studentName,
      r.companyName,
      r.jobRole ?? "—",
      r.roundLabel,
      r.slotLabel,
      r.panelMember,
      statusLabel(r.status),
      resultLabel(r.applicationStatus),
    ]);
    downloadCsv("interview-schedule.csv", [header, ...body]);
  }

  const columns: DataTableColumn<InterviewRow>[] = [
    { key: "student", header: sortableHeader("Student", "student"), width: "1.1fr", render: (r) => <span className="font-bold text-ink">{r.studentName}</span> },
    { key: "company", header: sortableHeader("Company", "company"), width: "1fr", render: (r) => <>{r.companyName}</> },
    { key: "role", header: sortableHeader("Role", "role"), width: "1.2fr", render: (r) => <>{r.jobRole ?? "—"}</> },
    { key: "round", header: sortableHeader("Round", "round"), width: "0.9fr", render: (r) => <>{r.roundLabel}</> },
    { key: "slot", header: sortableHeader("Slot", "slot"), width: "1fr", render: (r) => <>{r.slotLabel}</> },
    { key: "panel", header: sortableHeader("Panel", "panel"), width: "0.9fr", render: (r) => <>{r.panelMember}</> },
    { key: "status", header: sortableHeader("Status", "status"), width: "0.9fr", render: (r) => <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge> },
    { key: "result", header: sortableHeader("Result", "result"), width: "0.8fr", render: (r) => <>{resultLabel(r.applicationStatus)}</> },
    {
      key: "actions",
      header: "",
      width: "1.6fr",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="primarySmall" onClick={() => setResultTarget(r)}>
            Record result
          </Button>
          <Button variant="secondary" onClick={() => setScheduleTarget(r)}>
            Reschedule
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Interviews</h1>
          <p className="mt-1.5 text-[13px] text-muted">Panel allotment and round-wise interview outcomes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportSchedule}>
            Export schedule
          </Button>
          <Button variant="primarySmall" onClick={() => setScheduleTarget("new")}>
            Schedule interview
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
        <StatCard label="Scheduled today" value={scheduledToday} sub="Panels active today" />
        <StatCard label="Upcoming" value={in48Hours} sub="Next 48 hours" />
        <StatCard label="Selected" value={selected} sub="Awaiting offer release" />
        <StatCard label="Rounds completed" value={roundsCompleted} sub="Results recorded" />
      </div>

      <DataTable
        title="Interview schedule"
        titleNote={
          <div className="flex gap-2.5">
            <Input value={query} onChange={(e) => resetPage(setQuery)(e.target.value)} placeholder="Search interviews" className="h-[34px] min-w-55" />
            <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className="h-[34px]">
              {["All statuses", "Scheduled", "In progress", "Completed"].map((s) => (
                <option key={s} value={s}>
                  {s}
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
            <Button
              variant="secondary"
              className="h-[34px]"
              onClick={() => {
                setQuery("");
                setStatus("All statuses");
                setDepartment("All departments");
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
        onRowClick={(r) => router.push(`/placement/interviews/${r.id}`)}
        emptyMessage={error ? "Failed to load interviews." : "No interviews match these filters."}
      />
      <NumberedPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <ScheduleInterviewModal
        open={scheduleTarget !== null}
        interview={scheduleTarget === "new" || scheduleTarget === null ? null : scheduleTarget}
        onClose={() => setScheduleTarget(null)}
      />
      <RecordResultModal open={resultTarget !== null} interview={resultTarget} onClose={() => setResultTarget(null)} />
    </div>
  );
}
