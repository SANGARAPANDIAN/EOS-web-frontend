"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Card, EmptyState, Input, ProgressBar, type BadgeTone } from "@/components/ui";
import {
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  type TeamMember,
  type TeamMemberStatus,
} from "@/modules/media-room/api/team";
import { useShootAssignments, type ShootAssignment } from "@/modules/media-room/api/shoots";
import { formatDisplayDate, formatDayAndTime } from "@/lib/utils/date";

const STATUS_TONE: Record<TeamMemberStatus, BadgeTone> = { active: "accent", inactive: "neutral" };
const OPEN_STATUSES = new Set(["planned", "confirmed"]);

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const create = useCreateTeamMember();
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!fullName.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        full_name: fullName.trim(),
        designation: designation.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        skills: skills.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not add this member.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[460px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">Add team member</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3.5 px-[26px] py-[22px]">
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="Designation (e.g. Photographer)" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Skills (comma separated)" value={skills} onChange={(e) => setSkills(e.target.value)} />
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add member"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MemberDetailModal({ member, shoots, onClose }: { member: TeamMember; shoots: ShootAssignment[]; onClose: () => void }) {
  const update = useUpdateTeamMember();
  const remove = useDeleteTeamMember();

  const openJobs = shoots.filter((s) => OPEN_STATUSES.has(s.status));
  const delivered = shoots.filter((s) => s.status === "delivered").length;

  async function toggleStatus() {
    await update.mutateAsync({ id: member.id, status: member.status === "active" ? "inactive" : "active" });
  }

  async function removeMember() {
    await remove.mutateAsync(member.id);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="flex max-h-[85vh] w-full max-w-[520px] flex-col rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">{member.full_name}</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-[26px] py-[22px]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-[16px] font-extrabold text-white">
                {initials(member.full_name)}
              </div>
              <div>
                <div className="text-[15.5px] font-bold text-ink">{member.designation ?? "—"}</div>
                <Badge tone={STATUS_TONE[member.status]}>{member.status === "active" ? "Active" : "Inactive"}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-divider pt-3">
              <div className="rounded-[10px] border border-border-default p-3">
                <div className="text-[12px] text-muted">Active jobs</div>
                <div className="mt-1 text-[22px] font-extrabold text-ink">{openJobs.length}</div>
              </div>
              <div className="rounded-[10px] border border-border-default p-3">
                <div className="text-[12px] text-muted">Shoots delivered</div>
                <div className="mt-1 text-[22px] font-extrabold text-ink">{delivered}</div>
                <div className="mt-0.5 text-[11.5px] text-subtle">{shoots.length} total assigned</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <div className="font-bold uppercase tracking-[.05em] text-subtle">Email</div>
                <div className="mt-0.5 text-body">{member.email ?? "—"}</div>
              </div>
              <div>
                <div className="font-bold uppercase tracking-[.05em] text-subtle">Phone</div>
                <div className="mt-0.5 text-body">{member.phone ?? "—"}</div>
              </div>
              <div>
                <div className="font-bold uppercase tracking-[.05em] text-subtle">Joined</div>
                <div className="mt-0.5 text-body">{member.joined_on ? formatDisplayDate(member.joined_on) : "—"}</div>
              </div>
            </div>
            {member.skills && (
              <div className="border-t border-divider pt-3">
                <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Skills</div>
                <p className="mt-1 text-[13.5px] text-body">{member.skills}</p>
              </div>
            )}

            {shoots.length > 0 && (
              <div className="border-t border-divider pt-3">
                <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Assigned shoots</div>
                <div className="mt-2 flex flex-col">
                  {shoots.slice(0, 6).map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 border-b border-border-default py-2 last:border-0">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{s.media_request?.event_name ?? "Untitled event"}</span>
                      <span className="text-[11.5px] text-subtle">{s.scheduled_at ? formatDayAndTime(s.scheduled_at) : "—"}</span>
                      <Badge tone={s.status === "delivered" ? "accent" : "neutral"}>{s.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <button
            type="button"
            onClick={removeMember}
            disabled={remove.isPending}
            className="rounded-[7px] border border-danger-border px-3.5 py-2 text-[12.5px] font-bold text-danger-fg hover:bg-danger-bg"
          >
            Remove
          </button>
          <Button variant="primarySmall" className="w-auto" onClick={toggleStatus} disabled={update.isPending}>
            Mark {member.status === "active" ? "inactive" : "active"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function MediaTeamPage() {
  const team = useTeamMembers();
  const shoots = useShootAssignments();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);

  const notReady = team.data && !team.data.ready;
  const rows = team.data?.data ?? [];
  const allShoots = shoots.data?.ready ? shoots.data.data : [];

  const shootsFor = (memberId: number) => allShoots.filter((s) => s.assigned_to?.id === memberId);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Media team</h1>
          <p className="mt-1 text-[13px] text-muted">{rows.length} member{rows.length === 1 ? "" : "s"} · current load and speciality.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)} disabled={notReady}>
          + Add member
        </Button>
      </div>

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} />}
      {selected && <MemberDetailModal member={selected} shoots={shootsFor(selected.id)} onClose={() => setSelected(null)} />}

      {notReady ? (
        <EmptyState message="The media team roster isn't set up yet — ask an admin to run the pending database migration." />
      ) : team.isLoading ? (
        <EmptyState message="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No team members yet." />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {rows.map((m) => {
            const memberShoots = shootsFor(m.id);
            const activeJobs = memberShoots.filter((s) => OPEN_STATUSES.has(s.status)).length;
            return (
              <Card
                key={m.id}
                className="cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift"
                onClick={() => setSelected(m)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-white">
                    {initials(m.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15.5px] font-bold text-ink">{m.full_name}</div>
                    <div className="truncate text-[13.5px] text-muted">{m.designation ?? "—"}</div>
                  </div>
                </div>
                {shoots.data?.ready && (
                  <>
                    <div className="mt-4 flex justify-between text-[13.5px] text-muted">
                      <span>Active jobs</span>
                      <b className="text-ink">{activeJobs}</b>
                    </div>
                    <ProgressBar percent={Math.min(100, activeJobs * 25)} height={6} className="mt-2" />
                  </>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-divider pt-3">
                  <Badge tone={STATUS_TONE[m.status]}>{m.status === "active" ? "Active" : "Inactive"}</Badge>
                  {m.phone && <span className="text-[12px] text-subtle">{m.phone}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
