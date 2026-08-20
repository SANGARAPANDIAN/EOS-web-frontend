"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, DataTable, EmptyState, Icon, SearchBar, Select, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { useGateLog, useLogMovement, type GateLogEntry, type EntryType } from "@/modules/hostel-warden/api/gate-log";
import { useResidents } from "@/modules/hostel-warden/api/residents";
import { useOutings } from "@/modules/hostel-warden/api/outings";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatDayAndTime } from "@/lib/utils/date";

const DIRECTION_TONE: Record<EntryType, BadgeTone> = { in: "accent", out: "accentDark" };

function LogMovementModal({ onClose }: { onClose: () => void }) {
  const residents = useResidents({ page_size: 100 });
  const outings = useOutings({ page_size: 100 });
  const logMovement = useLogMovement();

  const [studentId, setStudentId] = useState<number | undefined>(undefined);
  const [direction, setDirection] = useState<EntryType>("out");
  const [outingId, setOutingId] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const studentOutings = (outings.data?.data ?? []).filter((o) => o.student.id === studentId && o.status !== "rejected");

  async function submit() {
    if (!studentId) {
      setError("Select a student.");
      return;
    }
    setError(null);
    try {
      await logMovement.mutateAsync({ student_id: studentId, entry_type: direction, outing_id: outingId });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not log this movement.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[460px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">Log a movement</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Direction</label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setDirection("out")}
                className={`flex-1 rounded-[9px] px-4 py-2.5 text-[14px] font-bold ${direction === "out" ? "bg-primary text-white" : "border border-border-default text-body"}`}
              >
                Out
              </button>
              <button
                type="button"
                onClick={() => setDirection("in")}
                className={`flex-1 rounded-[9px] px-4 py-2.5 text-[14px] font-bold ${direction === "in" ? "bg-primary text-white" : "border border-border-default text-body"}`}
              >
                In
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Student</label>
            <Select className="mt-1.5" value={studentId ?? ""} onChange={(e) => { setStudentId(e.target.value ? Number(e.target.value) : undefined); setOutingId(undefined); }}>
              <option value="">Select student</option>
              {(residents.data?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.student_id_no} · Room {r.room?.room_number ?? "—"}
                </option>
              ))}
            </Select>
          </div>
          {studentOutings.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Link to an outing (optional)</label>
              <Select className="mt-1.5" value={outingId ?? ""} onChange={(e) => setOutingId(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Not linked</option>
                {studentOutings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.reason ?? "Outing"} · {o.from_date}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={logMovement.isPending}>
            Save entry
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function GateLogPage() {
  const [filter, setFilter] = useState<"all" | EntryType>("all");
  const [search, setSearch] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const log = useGateLog({ entry_type: filter === "all" ? undefined : filter, page_size: 100 });

  const allRows = log.data?.data ?? [];
  const rows = search.trim()
    ? allRows.filter((r) => `${r.student.name} ${r.student.student_id_no} ${r.room_number ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
    : allRows;

  const columns: DataTableColumn<GateLogEntry>[] = [
    { key: "when", header: "When", width: "1.2fr", render: (row) => <span className="font-mono text-[12.5px] text-body">{formatDayAndTime(row.recorded_at)}</span> },
    {
      key: "student",
      header: "Student",
      width: "1.6fr",
      render: (row) => (
        <div>
          <button type="button" onClick={() => setSelectedId(row.student.id)} className="font-bold text-ink hover:text-primary hover:underline">
            {row.student.name}
          </button>
          <div className="font-mono text-[12px] text-subtle">{row.student.student_id_no}</div>
        </div>
      ),
    },
    { key: "room", header: "Room", width: "0.8fr", render: (row) => <span className="text-body">{row.room_number ?? "—"}</span> },
    {
      key: "direction",
      header: "Direction",
      width: "1fr",
      render: (row) => (
        <Badge tone={DIRECTION_TONE[row.entry_type]}>
          <span className="inline-flex items-center gap-1">
            <Icon name={row.entry_type === "in" ? "login" : "logout"} size={14} />
            {row.entry_type === "in" ? "In" : "Out"}
          </span>
        </Badge>
      ),
    },
    { key: "by", header: "Logged by", width: "1.3fr", align: "right", render: (row) => <span className="text-[12.5px] text-subtle">{row.recorded_by ?? "—"}</span> },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">In / out log</h1>
          <p className="mt-1 text-[13px] text-muted">Manual gate movement record · logged in real time.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowLog(true)}>
          Log a movement
        </Button>
      </div>

      {showLog && <LogMovementModal onClose={() => setShowLog(false)} />}

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchBar className="min-w-[260px] max-w-[360px]" placeholder="Student, register no. or room" value={search} onChange={(e) => setSearch(e.target.value)} />
        {(["all", "out", "in"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors ${
              filter === k ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft hover:bg-surface-tint"
            }`}
          >
            {k === "all" ? "All" : k === "out" ? "Out" : "In"}
          </button>
        ))}
      </div>

      {log.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={rows} rowKey={(row) => row.id} emptyMessage="No movements recorded yet." hoverableRows />
      )}

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
