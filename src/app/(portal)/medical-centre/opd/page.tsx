"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, EmptyState, Icon, Input, Select, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import {
  useOpdQueue,
  useAddWalkin,
  useAdvanceQueue,
  useOpdPatientSearch,
  type QueueRow,
  type QueueStatus,
  type OpdPatientMatch,
} from "@/modules/medical-centre/api/opd";
import { useSickRoomBeds, useAdmitBed } from "@/modules/medical-centre/api/sickroom";

const STATUS_LABEL: Record<QueueStatus, string> = { waiting: "Waiting", consult: "In consultation", done: "Completed" };
const STATUS_TONE: Record<QueueStatus, BadgeTone> = { waiting: "neutral", consult: "accentDark", done: "accent" };
const NEXT_ACTION: Record<QueueStatus, string> = { waiting: "Call in", consult: "Complete", done: "Reopen" };

type FilterKey = "all" | QueueStatus;

function AddWalkinModal({ onClose }: { onClose: () => void }) {
  const addWalkin = useAddWalkin();
  const [visitorType, setVisitorType] = useState<"student" | "faculty">("student");
  const [identifier, setIdentifier] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Whoever is at the counter is found by searching, not by typing an exact
  // id from memory. The search covers students and staff and is
  // case-insensitive across name, roll no, register no and staff code.
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<OpdPatientMatch | null>(null);
  const matches = useOpdPatientSearch(picked ? "" : term, visitorType);

  function pick(match: OpdPatientMatch) {
    setPicked(match);
    // The walk-in endpoint identifies a student by roll/register number and a
    // faculty member by their code, which is exactly what `identifier` holds.
    setIdentifier(match.identifier ?? "");
    setError(null);
  }

  function clearPick() {
    setPicked(null);
    setIdentifier("");
    setTerm("");
  }

  async function submit() {
    if (!identifier.trim()) {
      setError("Search for and select the patient first.");
      return;
    }
    setError(null);
    try {
      await addWalkin.mutateAsync({ visitor_type: visitorType, identifier: identifier.trim(), reason: reason.trim() || undefined });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not add this walk-in.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[460px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">Add walk-in</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Visitor</label>
            <Select
              className="mt-1.5"
              value={visitorType}
              onChange={(e) => {
                setVisitorType(e.target.value as "student" | "faculty");
                // Switching register invalidates whoever was picked from the
                // other one.
                clearPick();
              }}
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Patient</label>
            {picked ? (
              <div className="mt-1.5 flex items-center gap-3 rounded-[10px] border border-border-default bg-surface-tint px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-extrabold text-ink">{picked.name}</div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">
                    {[picked.identifier, picked.department].filter(Boolean).join(" \u00b7 ")}
                  </div>
                </div>
                <Badge tone={picked.kind === "student" ? "accent" : "accentDark"}>{picked.kind}</Badge>
                <button type="button" onClick={clearPick} className="shrink-0 text-[12.5px] font-bold text-primary">
                  Change
                </button>
              </div>
            ) : (
              <>
                <Input
                  className="mt-1.5"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={visitorType === "student" ? "Search name, roll no or register no" : "Search name or staff code"}
                />
                {term.trim().length > 0 && term.trim().length < 2 && (
                  <div className="mt-2 text-[12px] text-subtle">Keep typing to search.</div>
                )}
                {term.trim().length >= 2 && (
                  <div className="mt-2 max-h-[220px] overflow-y-auto rounded-[10px] border border-border-default">
                    {matches.isLoading ? (
                      <div className="px-3.5 py-3 text-[12.5px] text-subtle">Searching\u2026</div>
                    ) : (matches.data ?? []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12.5px] text-subtle">Nobody matched that search.</div>
                    ) : (
                      (matches.data ?? []).map((m) => (
                        <button
                          key={`${m.kind}-${m.student_id ?? m.faculty_id}`}
                          type="button"
                          onClick={() => pick(m)}
                          className="flex w-full items-center gap-3 border-b border-divider px-3.5 py-2.5 text-left last:border-b-0 hover:bg-surface-tint"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13.5px] font-bold text-ink">{m.name}</div>
                            <div className="mt-0.5 truncate text-[11.5px] text-muted">
                              {[m.identifier, m.department].filter(Boolean).join(" \u00b7 ")}
                            </div>
                          </div>
                          <Badge tone={m.kind === "student" ? "accent" : "accentDark"}>{m.kind}</Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Complaint</label>
            <Input className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={addWalkin.isPending}>
            Add to queue
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function HistoryModal({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const history = useOpdQueue(date);
  const rows = history.data ?? [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[85vh] w-full max-w-[720px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">OPD history</div>
            <div className="mt-0.5 text-[13px] text-muted">Pick a date to see that day&apos;s visits</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <Input type="date" max={today} className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          {history.isLoading ? (
            <EmptyState message="Loading…" />
          ) : rows.length === 0 ? (
            <EmptyState message="No visits recorded on this date." />
          ) : (
            <div className="flex flex-col">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                  <span className="font-mono text-[12.5px] font-bold text-primary">{row.token}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink">{row.name}</div>
                    <div className="text-[12.5px] text-subtle">{row.dept}</div>
                  </div>
                  <div className="min-w-0 flex-1 text-[13px] text-body">{row.complaint}</div>
                  <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ToSickRoomModal({ row, onClose }: { row: QueueRow; onClose: () => void }) {
  const beds = useSickRoomBeds();
  const admit = useAdmitBed();
  const [error, setError] = useState<string | null>(null);
  const freeBeds = (beds.data ?? []).filter((b) => !b.occupied);

  async function pick(bedId: number) {
    setError(null);
    try {
      await admit.mutateAsync({ bedId, visit_id: row.id, reason: row.complaint !== "—" ? row.complaint : undefined });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not admit to this bed.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[420px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Move to sick room</div>
            <div className="mt-0.5 text-[13px] text-muted">{row.name}</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2.5 px-[26px] py-[22px]">
          {beds.isLoading ? (
            <EmptyState message="Loading…" />
          ) : freeBeds.length === 0 ? (
            <EmptyState message="No free beds right now." />
          ) : (
            freeBeds.map((bed) => (
              <button
                key={bed.id}
                type="button"
                onClick={() => pick(bed.bedId)}
                disabled={admit.isPending}
                className="flex items-center justify-between rounded-[9px] border border-border-default px-4 py-3 text-left hover:border-primary hover:bg-surface-tint"
              >
                <span className="font-mono font-bold text-ink">{bed.id}</span>
                <span className="text-[13px] text-muted">{bed.wing} wing</span>
              </button>
            ))
          )}
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function OpdQueuePage() {
  const queue = useOpdQueue();
  const advance = useAdvanceQueue();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toSickRoom, setToSickRoom] = useState<QueueRow | null>(null);

  const rows = queue.data ?? [];
  const counts = {
    all: rows.length,
    waiting: rows.filter((q) => q.status === "waiting").length,
    consult: rows.filter((q) => q.status === "consult").length,
    done: rows.filter((q) => q.status === "done").length,
  };
  const filtered = filter === "all" ? rows : rows.filter((q) => q.status === filter);

  const columns: DataTableColumn<QueueRow>[] = [
    { key: "token", header: "Token", width: "0.7fr", render: (row) => <span className="font-mono font-bold text-primary">{row.token}</span> },
    {
      key: "name",
      header: "Student / Staff",
      width: "1.5fr",
      render: (row) => (
        <div>
          <div className="font-bold text-ink">{row.name}</div>
          <div className="text-[12px] text-subtle">{row.dept}</div>
        </div>
      ),
    },
    { key: "complaint", header: "Complaint", width: "1.6fr", render: (row) => <span className="text-body">{row.complaint}</span> },
    { key: "wait", header: "Waiting", width: "0.8fr", render: (row) => <span className="font-mono text-body">{row.wait}</span> },
    { key: "status", header: "Status", width: "1fr", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "action",
      header: "Action",
      width: "1.7fr",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => advance.mutate(row.id)}
            className="rounded-[7px] bg-primary px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
          >
            {NEXT_ACTION[row.status]}
          </button>
          <button
            type="button"
            onClick={() => setToSickRoom(row)}
            className="rounded-[7px] border border-border-default px-2.5 py-1.5 text-[12.5px] font-bold text-primary hover:bg-surface-tint"
          >
            To sick room
          </button>
        </div>
      ),
    },
  ];

  const FILTER_TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "waiting", label: "Waiting", count: counts.waiting },
    { key: "consult", label: "In consultation", count: counts.consult },
    { key: "done", label: "Completed", count: counts.done },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">OPD queue</h1>
        <p className="mt-1 text-[13px] text-muted">Walk-ins from hostels, departments and the sports ground.</p>
      </div>

      {showAdd && <AddWalkinModal onClose={() => setShowAdd(false)} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
      {toSickRoom && <ToSickRoomModal row={toSickRoom} onClose={() => setToSickRoom(null)} />}

      <div className="flex flex-wrap items-center gap-2.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors ${
              filter === tab.key ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft hover:bg-surface-tint"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 rounded-[9px] border border-border-default bg-surface px-4 py-2.5 text-[14px] font-bold text-primary hover:bg-surface-tint"
        >
          <Icon name="calendar_month" size={16} />
          History
        </button>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)}>
          Add walk-in
        </Button>
      </div>

      {queue.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} emptyMessage="Nothing in this view." hoverableRows />
      )}
    </div>
  );
}
