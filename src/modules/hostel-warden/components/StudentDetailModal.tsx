"use client";

import { createPortal } from "react-dom";
import { Badge, EmptyState, Icon, type BadgeTone } from "@/components/ui";
import { useStudentDetail } from "@/modules/hostel-warden/api/residents";
import { formatDayAndTime } from "@/lib/utils/date";

const STATUS_TONE: Record<string, BadgeTone> = {
  in_hostel: "accent",
  on_leave: "accentDark",
  pending: "accentDark",
  approved: "accent",
  rejected: "danger",
  open: "danger",
  in_progress: "accentDark",
  resolved: "accent",
};

const STATUS_LABEL: Record<string, string> = {
  in_hostel: "In hostel",
  on_leave: "On leave",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

/** Shared "click a student name" detail view — reused across every hostel warden list page. */
export function StudentDetailModal({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const detail = useStudentDetail(studentId);
  const s = detail.data;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-10">
      <div className="w-full max-w-[640px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">{s?.name ?? "Loading…"}</div>
            <div className="mt-0.5 text-[13px] text-muted">
              {s
                ? `${s.student_id_no} · ${s.course} · ${s.hostel?.name ?? "—"}${
                    s.room ? ` · ${s.room.block ? `${s.room.block.name} · ` : ""}Room ${s.room.room_number}` : ""
                  }`
                : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        {detail.isLoading ? (
          <div className="px-[26px] py-[40px]">
            <EmptyState message="Loading…" />
          </div>
        ) : !s ? (
          <div className="px-[26px] py-[40px]">
            <EmptyState message="Could not load this resident." />
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-[26px] py-[22px]">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[11px] border border-border-default p-4">
                <div className="text-[12.5px] text-muted">Status</div>
                <div className="mt-1">
                  <Badge tone={STATUS_TONE[s.current_status]}>{STATUS_LABEL[s.current_status]}</Badge>
                </div>
              </div>
              <div className="rounded-[11px] border border-border-default p-4">
                <div className="text-[12.5px] text-muted">Sharing</div>
                <div className="mt-1 text-[14px] font-bold text-ink">{s.sharing ?? "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13.5px]">
              <div className="flex flex-col gap-2 rounded-[11px] border border-border-default p-4">
                <div className="mb-1 text-[13px] font-extrabold text-ink">Allotment</div>
                {[
                  ["Batch", s.batch],
                  ["Block", s.room?.block?.name ?? "—"],
                  ["Floor", s.room?.floor?.name ?? "—"],
                  ["Room", s.room?.room_number ?? "—"],
                  ["Allotted on", s.allocated_date ? s.allocated_date.slice(0, 10) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-muted">{label}</span>
                    <span className="font-bold text-ink">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 rounded-[11px] border border-border-default p-4">
                <div className="mb-1 text-[13px] font-extrabold text-ink">Contact</div>
                {[
                  ["Roll no.", s.roll_no ?? "—"],
                  ["Guardian", s.guardian_name ?? "—"],
                  ["Guardian phone", s.guardian_phone ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-muted">{label}</span>
                    <span className="font-bold text-ink">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-extrabold text-ink">Recent movements</div>
              {s.movements.length === 0 ? (
                <div className="text-[13px] text-subtle">No gate movements recorded yet.</div>
              ) : (
                <div className="flex flex-col">
                  {s.movements.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 border-t border-divider py-2.5 first:border-0 first:pt-0">
                      <Icon name={m.direction === "in" ? "login" : "logout"} size={16} className="text-primary" />
                      <span className="text-[13px] text-body">{m.direction === "in" ? "In" : "Out"}</span>
                      <span className="ml-auto font-mono text-[12px] text-subtle">{formatDayAndTime(m.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-[13px] font-extrabold text-ink">Gate passes &amp; leave</div>
              {s.outings.length === 0 ? (
                <div className="text-[13px] text-subtle">No requests raised yet.</div>
              ) : (
                <div className="flex flex-col">
                  {s.outings.map((o) => (
                    <div key={o.id} className="flex items-center gap-2.5 border-t border-divider py-2.5 first:border-0 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-ink">{o.reason ?? "No reason given"}</div>
                        <div className="font-mono text-[11.5px] text-subtle">
                          {o.from_date} → {o.to_date}
                        </div>
                      </div>
                      <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-[13px] font-extrabold text-ink">Complaints</div>
              {s.complaints.length === 0 ? (
                <div className="text-[13px] text-subtle">No complaints raised yet.</div>
              ) : (
                <div className="flex flex-col">
                  {s.complaints.map((c) => (
                    <div key={c.id} className="flex items-center gap-2.5 border-t border-divider py-2.5 first:border-0 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-ink">{c.title}</div>
                        <div className="text-[11.5px] capitalize text-subtle">{c.category}</div>
                      </div>
                      <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status] ?? c.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
