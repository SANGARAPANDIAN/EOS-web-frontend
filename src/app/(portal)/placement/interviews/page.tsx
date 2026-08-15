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
  type BadgeTone,
  KpiCard,
  DataTable,
  NumberedPagination,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useInterviews, type InterviewRow, type InterviewStatus } from "@/modules/placement/api/interviews";
import { interviewStatusLabel, interviewResultLabel } from "@/modules/placement/lib/format";
import { InterviewFilters, type InterviewFiltersValue, DEFAULT_INTERVIEW_FILTERS } from "@/modules/placement/components/interviews/InterviewFilters";
import { ScheduleInterviewModal } from "@/modules/placement/components/interviews/ScheduleInterviewModal";
import { RecordResultModal } from "@/modules/placement/components/interviews/RecordResultModal";

const PAGE_SIZE = 10;

function statusTone(status: InterviewStatus): BadgeTone {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "primary";
}

function resultTone(result: string): BadgeTone {
  if (result === "Selected") return "success";
  if (result === "Rejected") return "danger";
  if (result === "In process") return "warning";
  return "neutral";
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function InterviewsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<InterviewFiltersValue>(DEFAULT_INTERVIEW_FILTERS);
  const debouncedQuery = useDebouncedValue(filters.query);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [scheduleTarget, setScheduleTarget] = useState<InterviewRow | "new" | null>(null);
  const [resultTarget, setResultTarget] = useState<InterviewRow | null>(null);

  const { data, isLoading, error } = useInterviews();
  const rows = useMemo(() => data ?? [], [data]);

  const departmentOptions = useMemo(() => {
    const codes = new Set(rows.map((r) => r.departmentCode).filter((c): c is string => !!c));
    return ["All departments", ...Array.from(codes).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = !q || r.studentName.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q);
      const matchesStatus = filters.status === "All statuses" || interviewStatusLabel(r.status) === filters.status;
      const matchesDept = filters.department === "All departments" || r.departmentCode === filters.department;
      return matchesQuery && matchesStatus && matchesDept;
    });
  }, [rows, debouncedQuery, filters.status, filters.department]);

  const pageRows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

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

  function handleExport() {
    downloadCsv(
      "interview-schedule.csv",
      [
        { header: "Student", value: (r: InterviewRow) => r.studentName },
        { header: "Company", value: (r: InterviewRow) => r.companyName },
        { header: "Role", value: (r: InterviewRow) => r.jobRole ?? "" },
        { header: "Round", value: (r: InterviewRow) => r.roundLabel },
        { header: "Slot", value: (r: InterviewRow) => r.slotLabel },
        { header: "Panel", value: (r: InterviewRow) => r.panelMember },
        { header: "Status", value: (r: InterviewRow) => interviewStatusLabel(r.status) },
        { header: "Result", value: (r: InterviewRow) => interviewResultLabel(r.applicationStatus) },
      ],
      filtered,
    );
  }

  const columns: DataTableColumn<InterviewRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div>
          <p className="font-semibold text-admin-ink">{r.studentName}</p>
          <p className="text-xs text-admin-muted">{r.registerNo ?? r.studentIdNo}</p>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (r) => (
        <div>
          <p className="text-admin-body">{r.companyName}</p>
          {r.jobRole && <p className="text-xs text-admin-muted">{r.jobRole}</p>}
        </div>
      ),
    },
    { key: "round", header: "Round", render: (r) => r.roundLabel },
    { key: "slot", header: "Slot", render: (r) => r.slotLabel },
    { key: "panel", header: "Panel", render: (r) => r.panelMember },
    { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{interviewStatusLabel(r.status)}</Badge> },
    {
      key: "result",
      header: "Result",
      render: (r) => {
        const label = interviewResultLabel(r.applicationStatus);
        return <Badge tone={resultTone(label)}>{label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="primary" onClick={() => setResultTarget(r)}>
            Record result
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setScheduleTarget(r)}>
            Reschedule
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Interviews"
        description="Panel allotment and round-wise interview outcomes."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Icon name="download" size={16} /> Export schedule
            </Button>
            <Button variant="primary" onClick={() => setScheduleTarget("new")}>
              <Icon name="add" size={16} /> Schedule interview
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Scheduled today" icon="today" value={scheduledToday} sub="Panels active today" />
        <KpiCard label="Upcoming" icon="upcoming" value={in48Hours} sub="Next 48 hours" />
        <KpiCard label="Selected" icon="workspace_premium" value={selected} sub="Awaiting offer release" />
        <KpiCard label="Rounds completed" icon="task_alt" value={roundsCompleted} sub="Results recorded" />
      </div>

      <InterviewFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        departmentOptions={departmentOptions}
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/placement/interviews/${r.id}`)}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load interviews." : null}
        emptyTitle="No interviews match these filters"
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

      <ScheduleInterviewModal
        open={scheduleTarget !== null}
        interview={scheduleTarget === "new" || scheduleTarget === null ? null : scheduleTarget}
        onClose={() => setScheduleTarget(null)}
      />
      <RecordResultModal open={resultTarget !== null} interview={resultTarget} onClose={() => setResultTarget(null)} />
    </div>
  );
}
