"use client";

import { useState } from "react";
import { Avatar, Badge, DataTable, IconButton, Select, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useGateLog, type GateEntryType, type GateLogEntry } from "@/modules/gate-warden/api/gateLog";
import { formatDayAndTime } from "@/lib/utils/date";

const ENTRY_TONE: Record<GateEntryType, BadgeTone> = {
  out: "neutral",
  in: "accent",
};

const PAGE_SIZE = 25;

export default function GateWardenHistoryPage() {
  const [entryType, setEntryType] = useState("");
  const [page, setPage] = useState(1);

  const gateLog = useGateLog({
    entry_type: (entryType as GateEntryType) || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const rows = gateLog.data?.data ?? [];
  const total = gateLog.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: DataTableColumn<GateLogEntry>[] = [
    {
      key: "student",
      header: "Student",
      width: "1.6fr",
      render: (entry) => (
        <div className="flex items-center gap-3">
          <Avatar name={entry.student.name} size={30} />
          <div className="min-w-0">
            <div className="truncate font-bold text-ink">{entry.student.name}</div>
            <div className="truncate text-[12px] text-muted">{entry.student.roll_no ?? entry.student.student_id_no}</div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Hostel / room",
      width: "1fr",
      render: (entry) => (entry.hostel ? `${entry.hostel.name}${entry.room_number ? ` · ${entry.room_number}` : ""}` : "—"),
    },
    {
      key: "entry_type",
      header: "Movement",
      width: "0.8fr",
      render: (entry) => <Badge tone={ENTRY_TONE[entry.entry_type]}>{entry.entry_type === "out" ? "Check-out" : "Check-in"}</Badge>,
    },
    {
      key: "recorded_at",
      header: "Recorded",
      width: "1fr",
      render: (entry) => <span className="font-mono text-[12.5px]">{formatDayAndTime(entry.recorded_at)}</span>,
    },
    {
      key: "recorded_by",
      header: "Recorded by",
      width: "1fr",
      render: (entry) => entry.recorded_by ?? "—",
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Movement history</h1>
          <p className="mt-1 text-[13.5px] text-muted">{total ? `${total} logged movement${total === 1 ? "" : "s"}` : " "}</p>
        </div>
        <Select
          className="w-auto"
          value={entryType}
          onChange={(e) => {
            setEntryType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All movements</option>
          <option value="out">Check-outs</option>
          <option value="in">Check-ins</option>
        </Select>
      </div>

      <DataTable columns={columns} data={rows} rowKey={(entry) => entry.id} loading={gateLog.isLoading} emptyMessage="No gate movements logged yet." />

      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <IconButton
              icon="chevron_left"
              disabled={page <= 1}
              className="disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            <span className="text-[12.5px] font-bold text-body">
              Page {page} of {totalPages}
            </span>
            <IconButton
              icon="chevron_right"
              disabled={page >= totalPages}
              className="disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
