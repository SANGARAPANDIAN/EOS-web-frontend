"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Input, Modal, Select, EmptyState } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useTeamDetail,
  useConfirmTeam,
  useUpdateTeam,
  useAddRosterEntry,
  useRemoveRosterEntry,
} from "@/modules/sports-admin/api/teams";
import type { SportsTeamStatus } from "@/modules/sports-admin/api/types";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { useFacilities } from "@/modules/sports-admin/api/facilities";
import { formatDisplayDate } from "@/lib/utils/date";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<SportsTeamStatus, BadgeTone> = {
  pending: "neutral",
  confirmed: "accent",
};

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const teamId = Number(id);
  const team = useTeamDetail(teamId);
  const confirmTeam = useConfirmTeam();
  const updateTeam = useUpdateTeam();
  const addRosterEntry = useAddRosterEntry(teamId);
  const removeRosterEntry = useRemoveRosterEntry(teamId);
  const disciplines = useDisciplines();
  const facilities = useFacilities();
  const t = team.data;

  const [student, setStudent] = useState<PickedPerson | null>(null);
  const [jerseyNo, setJerseyNo] = useState("");
  const [squadRole, setSquadRole] = useState("Player");
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDisciplineId, setEditDisciplineId] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCoach, setEditCoach] = useState<PickedPerson | null>(null);
  const [editCaptain, setEditCaptain] = useState<PickedPerson | null>(null);
  const [editViceCaptain, setEditViceCaptain] = useState<PickedPerson | null>(null);
  const [editManagerName, setEditManagerName] = useState("");
  const [editFacilityId, setEditFacilityId] = useState("");
  const [editPracticeSchedule, setEditPracticeSchedule] = useState("");
  const [editFormedDate, setEditFormedDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal() {
    if (!t) return;
    setEditName(t.name);
    setEditDisciplineId(t.discipline ? String(t.discipline.id) : "");
    setEditCategory(t.category ?? "");
    setEditCoach(t.coach ? { id: t.coach.id, name: t.coach.name, meta: "" } : null);
    setEditCaptain(t.captain ? { id: t.captain.id, name: t.captain.name, meta: "" } : null);
    setEditViceCaptain(t.vice_captain ? { id: t.vice_captain.id, name: t.vice_captain.name, meta: "" } : null);
    setEditManagerName(t.manager_name ?? "");
    setEditFacilityId(t.facility ? String(t.facility.id) : "");
    setEditPracticeSchedule(t.practice_schedule ?? "");
    setEditFormedDate(t.formed_date ?? "");
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await updateTeam.mutateAsync({
        id: teamId,
        name: editName,
        discipline_id: editDisciplineId ? Number(editDisciplineId) : undefined,
        category: editCategory || undefined,
        coach_faculty_id: editCoach ? editCoach.id : undefined,
        captain_student_id: editCaptain ? editCaptain.id : undefined,
        vice_captain_student_id: editViceCaptain ? editViceCaptain.id : undefined,
        manager_name: editManagerName || undefined,
        facility_id: editFacilityId ? Number(editFacilityId) : undefined,
        practice_schedule: editPracticeSchedule || undefined,
        formed_date: editFormedDate || undefined,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!student) return;
    try {
      await addRosterEntry.mutateAsync({
        student_id: student.id,
        jersey_no: jerseyNo || undefined,
        squad_role: squadRole || undefined,
      });
      setStudent(null);
      setJerseyNo("");
      setSquadRole("Player");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/sports-admin/teams")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Teams
      </button>

      {!t ? (
        <Card>
          <EmptyState message={team.isLoading ? "Loading…" : "Team not found."} />
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[26px] font-extrabold tracking-[-.02em] text-ink">{t.name}</h1>
                  <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  <span className="font-mono text-[12px] text-subtle">{t.code}</span>
                </div>
                <p className="mt-1 text-[13.5px] text-muted">
                  {[t.discipline?.name, t.category].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2.5">
                <Button variant="secondary" onClick={openEditModal}>
                  Edit
                </Button>
                {t.status === "pending" && (
                  <Button
                    variant="secondary"
                    onClick={() => confirmTeam.mutate(teamId)}
                    disabled={confirmTeam.isPending}
                  >
                    {confirmTeam.isPending ? "Confirming…" : "Confirm squad"}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Coach", value: t.coach?.name ?? "—" },
                { label: "Captain", value: t.captain?.name ?? "—" },
                { label: "Record", value: `${t.played} played · ${t.won}W ${t.lost}L ${t.drawn}D` },
                { label: "Practice", value: t.practice_schedule ?? "—" },
              ].map((k) => (
                <div key={k.label} className="rounded-card-sm border border-border-default bg-surface-muted p-3">
                  <div className="text-[10px] font-extrabold tracking-[.07em] text-subtle uppercase">{k.label}</div>
                  <div className="mt-1 text-[14.5px] font-bold text-ink">{k.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 items-start gap-4">
            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Team details</h2>
              <div className="mt-3 flex flex-col">
                {[
                  { label: "Facility", value: t.facility?.name ?? "—" },
                  { label: "Manager", value: t.manager_name ?? "—" },
                  { label: "Formed", value: t.formed_date ? formatDisplayDate(t.formed_date) : "—" },
                  { label: "Vice captain", value: t.vice_captain?.name ?? "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-divider py-2.5 first:border-0">
                    <span className="text-[12.5px] font-semibold text-muted">{row.label}</span>
                    <span className="text-right text-[13.5px] font-bold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Squad list</h2>

              <form onSubmit={handleAddPlayer} className="mt-3 flex flex-wrap items-end gap-2">
                <div className="w-[220px]">
                  <PersonPicker
                    type="student"
                    value={student}
                    onChange={setStudent}
                    placeholder="Student"
                    required
                    excludeIds={t.roster.map((r) => r.student_id)}
                  />
                </div>
                <Input
                  value={jerseyNo}
                  onChange={(e) => setJerseyNo(e.target.value)}
                  placeholder="Jersey #"
                  className="w-[90px]"
                />
                <Select value={squadRole} onChange={(e) => setSquadRole(e.target.value)} className="w-[110px]">
                  <option value="Player">Player</option>
                  <option value="Substitute">Substitute</option>
                </Select>
                <Button variant="primarySmall" type="submit" disabled={!student || addRosterEntry.isPending}>
                  {addRosterEntry.isPending ? "Adding…" : "Add player"}
                </Button>
              </form>
              {error && <div className="mt-2 text-[12px] font-semibold text-danger-fg">{error}</div>}

              <div className="mt-3 flex flex-col">
                {t.roster.length === 0 ? (
                  <EmptyState message="No players added to this squad yet." />
                ) : (
                  t.roster.map((r) => (
                    <div key={r.student_id} className="flex items-center gap-3 border-t border-divider py-2.5 first:border-0">
                      <span className="w-[28px] shrink-0 font-mono text-[12px] text-muted">{r.jersey_no ?? "—"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-bold text-ink">{r.name}</div>
                        <div className="text-[12px] text-muted">{r.dept_year}</div>
                      </div>
                      {r.squad_role && <span className="text-[12px] font-semibold text-muted">{r.squad_role}</span>}
                      <button
                        onClick={() => removeRosterEntry.mutate(r.student_id)}
                        disabled={removeRosterEntry.isPending}
                        className="text-[12px] font-bold text-danger-fg disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Recent results</h2>
              <Badge>{t.results.length} result{t.results.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="mt-3 flex flex-col">
              {t.results.length === 0 ? (
                <EmptyState message="No results recorded for this squad yet." />
              ) : (
                t.results.map((res, i) => (
                  <div key={i} className="flex items-center gap-3.5 border-t border-divider py-3 first:border-0">
                    <Icon name="emoji_events" size={18} className="shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold text-ink">{res.title}</div>
                      <div className="text-[12px] text-muted">{res.meta}</div>
                    </div>
                    {res.level && <Badge tone="neutral">{res.level}</Badge>}
                    <span className="text-[12.5px] font-bold text-primary">{res.award}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit squad" subtitle={t.name}>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Team name</label>
                <Input required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Discipline</label>
                  <Select value={editDisciplineId} onChange={(e) => setEditDisciplineId(e.target.value)}>
                    <option value="">Not set</option>
                    {disciplines.data?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Category</label>
                  <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="e.g. Men's / Under-19" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Coach faculty</label>
                  <PersonPicker type="faculty" value={editCoach} onChange={setEditCoach} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Captain student</label>
                  <PersonPicker type="student" value={editCaptain} onChange={setEditCaptain} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Vice captain student</label>
                  <PersonPicker type="student" value={editViceCaptain} onChange={setEditViceCaptain} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Manager name</label>
                  <Input value={editManagerName} onChange={(e) => setEditManagerName(e.target.value)} placeholder="e.g. R. Kumar" />
                </div>
              </div>
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
                  <label className="text-[13px] font-bold text-primary">Practice schedule</label>
                  <Input
                    value={editPracticeSchedule}
                    onChange={(e) => setEditPracticeSchedule(e.target.value)}
                    placeholder="e.g. Mon/Wed/Fri 5–7pm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Formed date</label>
                <Input type="date" value={editFormedDate} onChange={(e) => setEditFormedDate(e.target.value)} />
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
                <Button type="submit" variant="primarySmall" className="px-6" disabled={!editName || updateTeam.isPending}>
                  {updateTeam.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
