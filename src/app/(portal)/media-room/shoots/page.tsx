"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Card, EmptyState, Select, type BadgeTone } from "@/components/ui";
import {
  useShootAssignments,
  useCreateShootAssignment,
  useUpdateShootAssignment,
  type ShootAssignment,
  type ShootStatus,
} from "@/modules/media-room/api/shoots";
import { useMediaRequests } from "@/modules/media-room/api/mediaRequests";
import { useTeamMembers } from "@/modules/media-room/api/team";
import { formatDayAndTime, formatDisplayDate } from "@/lib/utils/date";

const STATUS_TONE: Record<ShootStatus, BadgeTone> = {
  planned: "neutral",
  confirmed: "accentDark",
  delivered: "accent",
  cancelled: "danger",
};

const STATUS_LABEL: Record<ShootStatus, string> = {
  planned: "Planned",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function ShootFormModal({ shoot, onClose }: { shoot: ShootAssignment | null; onClose: () => void }) {
  const approved = useMediaRequests("approved", 50);
  const team = useTeamMembers();
  const create = useCreateShootAssignment();
  const update = useUpdateShootAssignment();

  const [requestId, setRequestId] = useState<number | undefined>(shoot?.media_request?.id);
  const [memberId, setMemberId] = useState<number | undefined>(shoot?.assigned_to?.id);
  const [scheduledAt, setScheduledAt] = useState(shoot?.scheduled_at ? shoot.scheduled_at.slice(0, 16) : "");
  const [crew, setCrew] = useState(shoot?.crew ?? "");
  const [gear, setGear] = useState(shoot?.gear_issued ?? "");
  const [output, setOutput] = useState(shoot?.output_type ?? "");
  const [status, setStatus] = useState<ShootStatus>(shoot?.status ?? "planned");
  const [error, setError] = useState<string | null>(null);

  const members = team.data?.ready ? team.data.data : [];
  const busy = create.isPending || update.isPending;

  async function submit() {
    if (!shoot && !requestId) {
      setError("Pick an approved request to assign.");
      return;
    }
    setError(null);
    try {
      const scheduled_at = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
      if (shoot) {
        await update.mutateAsync({ id: shoot.id, assigned_to_member_id: memberId, crew, gear_issued: gear, output_type: output, scheduled_at, status });
      } else {
        await create.mutateAsync({ media_request_id: requestId!, assigned_to_member_id: memberId, crew, gear_issued: gear, output_type: output, scheduled_at });
      }
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this assignment.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[560px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">{shoot ? "Edit shoot assignment" : "New shoot assignment"}</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3.5 px-[26px] py-[22px]">
          {!shoot && (
            <div className="col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Event</label>
              <Select className="mt-1.5" value={requestId ?? ""} onChange={(e) => setRequestId(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Select an approved request</option>
                {(approved.data?.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.event_name ?? "Untitled"} · {r.event_date ? formatDisplayDate(r.event_date) : "no date"}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {shoot && (
            <div className="col-span-2 rounded-[9px] bg-surface-tint px-3.5 py-2.5 text-[13.5px] font-bold text-ink">
              {shoot.media_request?.event_name ?? shoot.event_title ?? "Untitled event"}
              {(shoot.media_request?.venues?.name ?? shoot.venue) ? ` · ${shoot.media_request?.venues?.name ?? shoot.venue}` : ""}
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">When</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1.5 w-full rounded-[9px] border border-border-default bg-surface px-3 py-2 text-[13.5px] text-body outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Assign to</label>
            <Select className="mt-1.5" value={memberId ?? ""} onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Crew</label>
            <input
              placeholder="e.g. Vignesh, Meera"
              value={crew}
              onChange={(e) => setCrew(e.target.value)}
              className="mt-1.5 w-full rounded-[9px] border border-border-default bg-surface px-3 py-2 text-[13.5px] text-body outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Gear issued</label>
            <input
              placeholder="e.g. R6, Rode kit"
              value={gear}
              onChange={(e) => setGear(e.target.value)}
              className="mt-1.5 w-full rounded-[9px] border border-border-default bg-surface px-3 py-2 text-[13.5px] text-body outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Output</label>
            <input
              placeholder="e.g. Photos + reel"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              className="mt-1.5 w-full rounded-[9px] border border-border-default bg-surface px-3 py-2 text-[13.5px] text-body outline-none focus:border-primary"
            />
          </div>
          {shoot && (
            <div className="col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Status</label>
              <Select className="mt-1.5" value={status} onChange={(e) => setStatus(e.target.value as ShootStatus)}>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : shoot ? "Save changes" : "Add assignment"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ShootAssignmentsPage() {
  const shoots = useShootAssignments();
  const [formTarget, setFormTarget] = useState<ShootAssignment | "new" | null>(null);

  const notReady = shoots.data && !shoots.data.ready;
  const rows = shoots.data?.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Shoot assignments</h1>
          <p className="mt-1 text-[13px] text-muted">Who is shooting what this week · crew, gear and post-production owner.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setFormTarget("new")} disabled={!!notReady}>
          + Add shoot assignment
        </Button>
      </div>

      {formTarget && <ShootFormModal shoot={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} />}

      {notReady ? (
        <EmptyState message="Shoot assignments aren't set up yet — ask an admin to run the pending database migration." />
      ) : shoots.isLoading ? (
        <EmptyState message="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No shoot assignments yet." />
      ) : (
        <Card data-mr-lift="1" className="overflow-hidden p-0">
          <div className="grid grid-cols-[1.1fr_1.6fr_1fr_1fr_0.9fr_0.8fr_0.6fr] gap-4 border-b border-divider bg-surface-tint px-[26px] py-3">
            {["When", "Event", "Crew", "Gear issued", "Output", "Status", ""].map((h) => (
              <span key={h} className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">
                {h}
              </span>
            ))}
          </div>
          {rows.map((s) => (
            <div key={s.id} className="grid grid-cols-[1.1fr_1.6fr_1fr_1fr_0.9fr_0.8fr_0.6fr] items-center gap-4 border-b border-divider px-[26px] py-[16px] last:border-0">
              <span className="font-mono text-[13px] text-ink">{s.scheduled_at ? formatDayAndTime(s.scheduled_at) : "—"}</span>
              <div>
                <div className="text-[15px] font-bold text-ink">{s.media_request?.event_name ?? s.event_title ?? "Untitled event"}</div>
                <div className="text-[12.5px] text-muted">{s.media_request?.venues?.name ?? s.venue ?? "—"}</div>
              </div>
              <span className="text-[13.5px] text-ink">{s.crew ?? (s.assigned_to?.full_name ?? "—")}</span>
              <span className="text-[13.5px] text-body">{s.gear_issued ?? "—"}</span>
              <span className="text-[13.5px] text-body">{s.output_type ?? "—"}</span>
              <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
              <button
                type="button"
                onClick={() => setFormTarget(s)}
                className="justify-self-end rounded-[7px] border border-border-default px-3 py-1.5 text-[12.5px] font-bold text-primary hover:bg-surface"
              >
                Edit
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
