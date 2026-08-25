"use client";

import { useState } from "react";
import { Badge, Button, Card, DataTable, EmptyState, ProgressBar, SearchBar, type BadgeTone, type DataTableColumn } from "@/components/ui";
import {
  useNightAttendance,
  useMarkAttendance,
  usePublishAttendance,
  useResolveAllAttendance,
  type RollCallStatus,
  type RosterRow,
} from "@/modules/hostel-warden/api/night-attendance";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatLongDate } from "@/lib/utils/date";

const DAY_MS = 86_400_000;

/** Local calendar day as YYYY-MM-DD — the same shape the API expects. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDay(new Date(y, m - 1, d + days));
}

const STATUS_TONE: Record<RollCallStatus, BadgeTone> = {
  present: "accent",
  absent: "danger",
  on_leave: "neutral",
  pending: "accentDark",
};

const STATUS_LABEL: Record<RollCallStatus, string> = {
  present: "Present",
  absent: "Absent",
  on_leave: "On leave",
  pending: "Not marked",
};

export default function NightAttendancePage() {
  const today = isoDay(new Date());
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Each night is its own sheet: changing the date loads that day's roll call
  // and every action below is scoped to it, so the warden can take tonight's
  // attendance and still correct last night's.
  const attendance = useNightAttendance(date);
  const mark = useMarkAttendance();
  const resolveAll = useResolveAllAttendance();
  const publish = usePublishAttendance();

  const data = attendance.data;
  const marked = data?.marked_count ?? 0;
  const pct = data && data.total_residents > 0 ? Math.round((marked / data.total_residents) * 100) : 0;
  const draftCount = data?.draft_count ?? 0;
  const isPublished = data?.is_published ?? false;

  const term = search.trim().toLowerCase();
  const roster = (data?.roster ?? []).filter((r) =>
    term.length === 0
      ? true
      : [r.name, r.roll, r.room_number].some((v) => (v ?? "").toLowerCase().includes(term)),
  );

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "That action could not be completed.");
    }
  }

  const columns: DataTableColumn<RosterRow>[] = [
    {
      key: "name",
      header: "Student",
      width: "1.6fr",
      render: (row) => (
        <button type="button" onClick={() => setSelectedId(row.student_id)} className="font-bold text-ink hover:text-primary hover:underline">
          {row.name}
        </button>
      ),
    },
    { key: "roll", header: "Register no.", width: "1fr", render: (row) => <span className="font-mono text-body">{row.roll}</span> },
    { key: "room", header: "Room", width: "0.7fr", render: (row) => <span className="text-body">{row.room_number}</span> },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
          {row.is_draft && <span className="text-[11px] font-bold text-warning-fg">DRAFT</span>}
        </div>
      ),
    },
    {
      key: "action",
      header: "",
      width: "1.3fr",
      align: "right",
      render: (row) =>
        row.status === "on_leave" ? (
          <span className="text-[12px] text-subtle">Approved outing</span>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => void run(() => mark.mutateAsync({ studentId: row.student_id, status: "absent", date }))}
              disabled={mark.isPending}
              className={`rounded-[7px] border px-2.5 py-1.5 text-[12.5px] font-bold ${
                row.status === "absent" ? "border-danger-fg bg-danger-bg text-danger-fg" : "border-border-default text-body hover:bg-surface-tint"
              }`}
            >
              Absent
            </button>
            <button
              type="button"
              onClick={() => void run(() => mark.mutateAsync({ studentId: row.student_id, status: "present", date }))}
              disabled={mark.isPending}
              className={`rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-bold ${
                row.status === "present" ? "bg-primary text-white" : "border border-border-default text-body hover:bg-surface-tint"
              }`}
            >
              Present
            </button>
          </div>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Night attendance</h1>
          <p className="mt-1 text-[13px] text-muted">
            {date === today ? `${formatLongDate()} · tonight` : `Roll call for ${date}`} · marks save as a draft until you publish.
          </p>
        </div>
        {/* Previous / next night, so the same sheet is taken again every day. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDate((d) => shiftDay(d, -1))}
            className="rounded-[9px] border border-border-default px-3 py-2 text-[13px] font-bold text-body hover:bg-surface-tint"
          >
            ‹ Prev
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            className="rounded-[9px] border border-border-default px-3 py-2 text-[13px] font-bold text-ink"
          />
          <button
            type="button"
            onClick={() => setDate((d) => (new Date(d).getTime() + DAY_MS <= new Date(today).getTime() ? shiftDay(d, 1) : d))}
            disabled={date >= today}
            className="rounded-[9px] border border-border-default px-3 py-2 text-[13px] font-bold text-body hover:bg-surface-tint disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      </div>

      {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[13.5px] font-bold text-ink">
                {marked} of {data?.total_residents ?? 0} marked
              </span>
              {isPublished ? (
                <Badge tone="accent">PUBLISHED</Badge>
              ) : draftCount > 0 ? (
                <Badge tone="accentDark">{draftCount} UNPUBLISHED</Badge>
              ) : (
                <Badge tone="neutral">NOT STARTED</Badge>
              )}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted">
              {isPublished
                ? "This night's roll call has been published."
                : draftCount > 0
                  ? "Draft saved. Publish to submit the night's roll call."
                  : `${data?.pending ?? 0} resident(s) still to mark.`}
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              className="w-auto"
              onClick={() => void run(() => resolveAll.mutateAsync(date))}
              disabled={resolveAll.isPending || !data?.pending}
            >
              Mark rest present
            </Button>
            <Button
              variant="primarySmall"
              className="w-auto"
              onClick={() => void run(() => publish.mutateAsync(date))}
              disabled={publish.isPending || draftCount === 0}
            >
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>
        <ProgressBar percent={pct} height={7} className="mt-3" />
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Present", value: data?.present ?? 0 },
          { label: "Absent", value: data?.absent ?? 0 },
          { label: "On leave", value: data?.on_leave ?? 0 },
          { label: "Pending", value: data?.pending ?? 0 },
        ].map((t) => (
          <div key={t.label} className="rounded-card border border-border-default bg-surface p-[18px_20px]">
            <div className="text-[13px] font-bold text-muted">{t.label}</div>
            <div className="mt-2 text-[30px] font-extrabold text-ink">{t.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {/* The full roster stays on screen after marking. Previously only
              unmarked students were listed, so marking everyone present
              emptied the table and the night's sheet looked lost. */}
          <h2 className="text-[17px] font-extrabold text-ink">Roll call</h2>
          <SearchBar
            className="min-w-[240px] max-w-[340px]"
            placeholder="Search name, register no or room"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {attendance.isLoading ? (
          <EmptyState message="Loading…" />
        ) : roster.length === 0 ? (
          <EmptyState message={term ? "No resident matched that search." : "No residents on this hostel's roll."} />
        ) : (
          <DataTable columns={columns} data={roster} rowKey={(row) => row.student_id} hoverableRows={false} />
        )}
      </Card>

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
