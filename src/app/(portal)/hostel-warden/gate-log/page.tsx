"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, DataTable, EmptyState, Icon, PillTabs, SearchBar, Select, type BadgeTone, type DataTableColumn } from "@/components/ui";
import {
  useGateLog,
  useHostelStudentSearch,
  useLogMovement,
  type GateLogEntry,
  type EntryType,
  type HostelStudentMatch,
} from "@/modules/hostel-warden/api/gate-log";
import { useOutings } from "@/modules/hostel-warden/api/outings";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatDayAndTime } from "@/lib/utils/date";

const DIRECTION_TONE: Record<EntryType, BadgeTone> = { in: "accent", out: "accentDark" };

function LogMovementModal({ onClose }: { onClose: () => void }) {
  const outings = useOutings({ page_size: 100 });
  const logMovement = useLogMovement();

  const [student, setStudent] = useState<HostelStudentMatch | null>(null);
  const [term, setTerm] = useState("");
  const [direction, setDirection] = useState<EntryType>("out");
  const [outingId, setOutingId] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Only search while nobody is picked, so the match list does not linger
  // underneath the chosen student.
  const matches = useHostelStudentSearch(student ? "" : term);
  const studentId = student?.student_id;
  const studentOutings = (outings.data?.data ?? []).filter((o) => o.student.id === studentId && o.status !== "rejected");

  function pick(match: HostelStudentMatch) {
    setStudent(match);
    setOutingId(undefined);
    setError(null);
    // Someone already off campus can only be coming back, and vice versa —
    // default to the only move that makes sense for them.
    setDirection(match.is_currently_out ? "in" : "out");
  }

  async function submit() {
    if (!studentId) {
      setError("Search for and select a student.");
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
            {student ? (
              <div className="mt-1.5 flex items-center gap-3 rounded-[10px] border border-border-default bg-surface-muted px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-extrabold text-ink">{student.name}</div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">
                    {[student.roll_no, student.room_number ? "Room " + student.room_number : null, student.class_label].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {student.is_currently_out && <Badge tone="accentDark">OUT</Badge>}
                <button
                  type="button"
                  onClick={() => { setStudent(null); setTerm(""); setOutingId(undefined); }}
                  className="shrink-0 text-[12.5px] font-bold text-primary"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <SearchBar
                  className="mt-1.5 max-w-none"
                  placeholder="Search by name, roll no, register no or room"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
                {term.trim().length > 0 && term.trim().length < 2 && (
                  <div className="mt-2 text-[12px] text-subtle">Keep typing to search.</div>
                )}
                {term.trim().length >= 2 && (
                  <div className="mt-2 max-h-[240px] overflow-y-auto rounded-[10px] border border-border-default">
                    {matches.isLoading ? (
                      <div className="px-3.5 py-3 text-[12.5px] text-subtle">Searching…</div>
                    ) : (matches.data ?? []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12.5px] text-subtle">No student matched that search.</div>
                    ) : (
                      (matches.data ?? []).map((m) => (
                        <button
                          key={m.student_id}
                          type="button"
                          onClick={() => pick(m)}
                          className="flex w-full items-center gap-3 border-b border-divider px-3.5 py-2.5 text-left last:border-b-0 hover:bg-surface-muted"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13.5px] font-bold text-ink">{m.name}</div>
                            <div className="mt-0.5 truncate text-[11.5px] text-muted">
                              {[m.roll_no, m.room_number ? "Room " + m.room_number : null, m.hostel_name].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          {m.is_currently_out && <Badge tone="accentDark">OUT</Badge>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
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
  // Searched in the database rather than over the loaded page: the previous
  // client-side filter only looked at rows already fetched, and did not cover
  // roll or register numbers at all.
  const log = useGateLog({
    entry_type: filter === "all" ? undefined : filter,
    q: search.trim() || undefined,
    page_size: 100,
  });

  const rows = log.data?.data ?? [];

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
        <SearchBar className="min-w-[260px] max-w-[360px]" placeholder="Search name, roll no, register no or room" value={search} onChange={(e) => setSearch(e.target.value)} />
        <PillTabs
          options={[
            { key: "history", label: "History" },
            { key: "out", label: "Out" },
            { key: "in", label: "In" },
          ]}
          value={filter === "all" ? "history" : filter}
          onChange={(k) => setFilter(k === "history" ? "all" : (k as EntryType))}
        />
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
