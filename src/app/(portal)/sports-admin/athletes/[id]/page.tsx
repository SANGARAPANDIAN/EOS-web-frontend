"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, ProfilePhoto, Icon, Input, Modal, Select, EmptyState } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useAthleteDetail, useUpdateAthlete, type AthleteStatus } from "@/modules/sports-admin/api/athletes";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "accent",
  rest: "neutral",
  injured: "accentDark",
};

export default function AthleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const athleteId = Number(id);
  const athlete = useAthleteDetail(athleteId);
  const updateAthlete = useUpdateAthlete();
  const disciplines = useDisciplines();
  const a = athlete.data;

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisciplineId, setEditDisciplineId] = useState("");
  const [editStatus, setEditStatus] = useState<AthleteStatus>("active");
  const [editRegisteredAcademicYear, setEditRegisteredAcademicYear] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal() {
    if (!a) return;
    setEditDisciplineId(a.discipline ? String(a.discipline.id) : "");
    setEditStatus(a.status);
    setEditRegisteredAcademicYear(a.registered_academic_year ?? "");
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await updateAthlete.mutateAsync({
        id: athleteId,
        primary_discipline_id: editDisciplineId ? Number(editDisciplineId) : undefined,
        status: editStatus,
        registered_academic_year: editRegisteredAcademicYear || undefined,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/sports-admin/athletes")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Athletes
      </button>

      {!a ? (
        <Card>
          <EmptyState message={athlete.isLoading ? "Loading…" : "Athlete not found."} />
        </Card>
      ) : (
        <>
          <Card className="flex gap-6 p-6">
            <div className="flex flex-col items-center gap-2">
              <ProfilePhoto photoUrl={a.photo_url} name={a.name} size={72} />
              <span className="font-mono text-[11px] text-muted">SPT-{String(a.student_id).padStart(4, "0")}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-[26px] font-extrabold tracking-[-.02em] text-ink">{a.name}</h1>
                <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Badge>
                <Button variant="secondary" onClick={openEditModal}>
                  Edit
                </Button>
              </div>
              <p className="mt-1 text-[13.5px] text-muted">
                {[a.department?.name, a.discipline?.name].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { label: "Register no.", value: a.reg_no ?? "—" },
                  { label: "Year", value: a.year ?? "—" },
                  { label: "Section", value: a.section ?? "—" },
                  { label: "Attendance", value: `${a.attendance_pct}%` },
                ].map((k) => (
                  <div key={k.label} className="rounded-card-sm border border-border-default bg-surface-muted p-3">
                    <div className="text-[10px] font-extrabold tracking-[.07em] text-subtle uppercase">{k.label}</div>
                    <div className="mt-1 text-[14.5px] font-bold text-ink">{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 items-start gap-4">
            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Personal details</h2>
              <div className="mt-3 flex flex-col">
                {[
                  { label: "Date of birth", value: a.dob ? formatDisplayDate(a.dob) : "—" },
                  { label: "Gender", value: a.gender ?? "—" },
                  { label: "Course", value: a.course?.name ?? "—" },
                  { label: "Mobile", value: a.mobile ?? "—" },
                  { label: "Email", value: a.email ?? "—" },
                  { label: "Registered for", value: a.registered_academic_year ?? "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-divider py-2.5 first:border-0">
                    <span className="text-[12.5px] font-semibold text-muted">{row.label}</span>
                    <span className="text-right text-[13.5px] font-bold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Teams</h2>
              <div className="mt-3 flex flex-col">
                {a.teams.length === 0 ? (
                  <EmptyState message="Not part of any squad yet." />
                ) : (
                  a.teams.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-4 border-t border-divider py-2.5 first:border-0">
                      <div>
                        <div className="text-[13.5px] font-bold text-ink">{t.name}</div>
                        {t.squad_role && <div className="text-[12px] text-muted">{t.squad_role}</div>}
                      </div>
                      {t.jersey_no && <span className="font-mono text-[12px] text-muted">#{t.jersey_no}</span>}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Achievements</h2>
              <Badge>{a.achievements.length} result{a.achievements.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="mt-3 flex flex-col">
              {a.achievements.length === 0 ? (
                <EmptyState message="No results recorded for this athlete yet." />
              ) : (
                a.achievements.map((ach, i) => (
                  <div key={i} className="flex items-center gap-3.5 border-t border-divider py-3 first:border-0">
                    <Icon name="emoji_events" size={18} className="shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold text-ink">{ach.title}</div>
                      <div className="text-[12px] text-muted">{ach.meta}</div>
                    </div>
                    {ach.level && <Badge tone="neutral">{ach.level}</Badge>}
                    <span className="text-[12.5px] font-bold text-primary">{ach.award}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit athlete" subtitle={a.name}>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Primary discipline</label>
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
                  <label className="text-[13px] font-bold text-primary">Status</label>
                  <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as AthleteStatus)}>
                    <option value="active">Active</option>
                    <option value="injured">Injured</option>
                    <option value="rest">Rest</option>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Registered academic year</label>
                <Input
                  value={editRegisteredAcademicYear}
                  onChange={(e) => setEditRegisteredAcademicYear(e.target.value)}
                  placeholder="2026-27"
                />
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
                <Button type="submit" variant="primarySmall" className="px-6" disabled={updateAthlete.isPending}>
                  {updateAthlete.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
