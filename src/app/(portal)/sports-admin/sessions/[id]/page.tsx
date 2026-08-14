"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Input, Modal, Select, EmptyState } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useSessionDetail,
  useMarkAttendance,
  useMarkAllPresent,
  useUpdateSession,
  type SessionStatus,
} from "@/modules/sports-admin/api/sessions";
import type { AttendanceMark } from "@/modules/sports-admin/api/types";
import { useFacilities } from "@/modules/sports-admin/api/facilities";
import { formatDisplayDate, formatTime12h } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<SessionStatus, BadgeTone> = {
  pending: "neutral",
  confirmed: "accent",
  done: "accent",
  cancelled: "accentDark",
};

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sessionId = Number(id);
  const router = useRouter();
  const session = useSessionDetail(sessionId);
  const markAttendance = useMarkAttendance(sessionId);
  const markAllPresent = useMarkAllPresent(sessionId);
  const updateSession = useUpdateSession();
  const facilities = useFacilities();
  const s = session.data;

  const [marks, setMarks] = useState<Record<number, AttendanceMark>>({});
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFacilityId, setEditFacilityId] = useState("");
  const [editCoach, setEditCoach] = useState<PickedPerson | null>(null);
  const [editSessionDate, setEditSessionDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editStatus, setEditStatus] = useState<SessionStatus>("pending");
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal() {
    if (!s) return;
    setEditFacilityId(s.facility ? String(s.facility.id) : "");
    setEditCoach(s.coach ? { id: s.coach.id, name: s.coach.name, meta: "" } : null);
    setEditSessionDate(s.session_date);
    setEditStartTime(s.start_time ?? "");
    setEditEndTime(s.end_time ?? "");
    setEditStatus(s.status);
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await updateSession.mutateAsync({
        id: sessionId,
        facility_id: editFacilityId ? Number(editFacilityId) : undefined,
        coach_faculty_id: editCoach ? editCoach.id : undefined,
        session_date: editSessionDate || undefined,
        start_time: editStartTime || undefined,
        end_time: editEndTime || undefined,
        status: editStatus,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  // Re-seed local marks from the roster whenever a *different* session's
  // detail arrives, without an effect (React docs: "adjusting state during
  // render" avoids the extra commit a useEffect + setState round-trip costs).
  const [seededFor, setSeededFor] = useState<number | null>(null);
  if (s && seededFor !== s.id) {
    const seeded: Record<number, AttendanceMark> = {};
    for (const r of s.roster) {
      if (r.status) seeded[r.student_id] = r.status;
    }
    setMarks(seeded);
    setSeededFor(s.id);
  }

  function setMark(studentId: number, status: AttendanceMark) {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    setError(null);
    try {
      await markAttendance.mutateAsync(
        Object.entries(marks).map(([studentId, status]) => ({ student_id: Number(studentId), status })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleMarkAllPresent() {
    setError(null);
    try {
      await markAllPresent.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/sports-admin/sessions")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Sessions
      </button>

      {!s ? (
        <Card>
          <EmptyState message={session.isLoading ? "Loading…" : "Session not found."} />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[26px] font-extrabold tracking-[-.02em] text-ink">{s.discipline?.name}</h1>
                <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
              </div>
              <p className="mt-1 text-[13.5px] text-muted">
                {[
                  formatDisplayDate(s.session_date),
                  s.start_time ? formatTime12h(s.start_time) : null,
                  s.facility?.name,
                  s.coach?.name,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={openEditModal}>
                Edit
              </Button>
              <Button variant="secondary" onClick={handleMarkAllPresent} disabled={markAllPresent.isPending}>
                {markAllPresent.isPending ? "Marking…" : "Mark all present"}
              </Button>
              <Button onClick={handleSave} disabled={markAttendance.isPending}>
                {markAttendance.isPending ? "Saving…" : "Save attendance"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Session roster</h2>
              <Badge>{s.roster.length} athlete{s.roster.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="mt-3 flex flex-col">
              {s.roster.length === 0 ? (
                <EmptyState message="No athletes assigned to this session yet." />
              ) : (
                s.roster.map((r) => {
                  const current = marks[r.student_id];
                  return (
                    <div key={r.student_id} className="flex items-center justify-between gap-4 border-t border-divider py-3 first:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-bold text-ink">{r.name}</div>
                        <div className="text-[12px] text-muted">{r.meta}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMark(r.student_id, "present")}
                          className={cn(
                            "rounded-[8px] border px-3 py-1.5 text-[12px] font-bold transition-colors",
                            current === "present"
                              ? "border-border-accent bg-accent-50 text-primary"
                              : "border-border-default bg-surface text-muted",
                          )}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => setMark(r.student_id, "absent")}
                          className={cn(
                            "rounded-[8px] border px-3 py-1.5 text-[12px] font-bold transition-colors",
                            current === "absent"
                              ? "border-danger-border bg-danger-bg text-danger-fg"
                              : "border-border-default bg-surface text-muted",
                          )}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => setMark(r.student_id, "on_duty")}
                          className={cn(
                            "text-[12px] font-bold underline-offset-2",
                            current === "on_duty" ? "text-primary underline" : "text-subtle hover:underline",
                          )}
                        >
                          On duty
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit session" subtitle={s.discipline?.name}>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Facility</label>
                  <Select value={editFacilityId} onChange={(e) => setEditFacilityId(e.target.value)}>
                    <option value="">Not set</option>
                    {facilities.data?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Coach faculty</label>
                  <PersonPicker type="faculty" value={editCoach} onChange={setEditCoach} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Session date</label>
                <Input
                  required
                  type="date"
                  value={editSessionDate}
                  onChange={(e) => setEditSessionDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Start time</label>
                  <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">End time</label>
                  <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Status</label>
                <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as SessionStatus)}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
              {editError && (
                <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                  {editError}
                </div>
              )}
              <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primarySmall"
                  className="px-6"
                  disabled={!editSessionDate || updateSession.isPending}
                >
                  {updateSession.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
