"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Avatar, Icon, Input, Modal, Select, Textarea, EmptyState } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useCoachDetail, useUpdateCoachProfile, type DutyStatus } from "@/modules/sports-admin/api/coaches";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

export default function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const coachId = Number(id);
  const coach = useCoachDetail(coachId);
  const updateCoach = useUpdateCoachProfile();
  const disciplines = useDisciplines();
  const c = coach.data;
  const statusTone: BadgeTone = c?.status === "active" ? "accent" : "neutral";

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisciplineId, setEditDisciplineId] = useState("");
  const [editCoachingExperienceYears, setEditCoachingExperienceYears] = useState("");
  const [editDutyStatus, setEditDutyStatus] = useState<DutyStatus>("on_duty");
  const [editCertifications, setEditCertifications] = useState("");
  const [editResponsibilities, setEditResponsibilities] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal() {
    if (!c) return;
    setEditDisciplineId(c.discipline ? String(c.discipline.id) : "");
    setEditCoachingExperienceYears(c.coaching_experience_years != null ? String(c.coaching_experience_years) : "");
    setEditDutyStatus(c.duty_status);
    setEditCertifications(c.certifications.join("\n"));
    setEditResponsibilities(c.responsibilities.join("\n"));
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await updateCoach.mutateAsync({
        id: coachId,
        discipline_id: editDisciplineId ? Number(editDisciplineId) : undefined,
        coaching_experience_years: editCoachingExperienceYears ? Number(editCoachingExperienceYears) : undefined,
        duty_status: editDutyStatus,
        certifications: editCertifications
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        responsibilities: editResponsibilities
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/sports-admin/coaches")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Coaches
      </button>

      {!c ? (
        <Card>
          <EmptyState message={coach.isLoading ? "Loading…" : "Coach not found."} />
        </Card>
      ) : (
        <>
          <Card className="flex gap-6 p-6">
            <Avatar name={c.name} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-[26px] font-extrabold tracking-[-.02em] text-ink">{c.name}</h1>
                <Badge tone={statusTone}>{c.status}</Badge>
                <Button variant="secondary" onClick={openEditModal}>
                  Edit
                </Button>
              </div>
              <p className="mt-1 text-[13.5px] text-muted">
                {[c.designation, c.department?.name].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { label: "Discipline", value: c.discipline?.name ?? "—" },
                  { label: "Coaching experience", value: c.coaching_experience_years != null ? `${c.coaching_experience_years} yrs` : "—" },
                  { label: "Duty status", value: c.duty_status },
                  { label: "Teams", value: c.teams.length },
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
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Contact & background</h2>
              <div className="mt-3 flex flex-col">
                {[
                  { label: "Mobile", value: c.mobile ?? "—" },
                  { label: "Email", value: c.email ?? "—" },
                  { label: "Qualification", value: c.qualification ?? "—" },
                  { label: "Specialization", value: c.specialization ?? "—" },
                  { label: "Joined", value: c.joined ? formatDisplayDate(c.joined) : "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-divider py-2.5 first:border-0">
                    <span className="text-[12.5px] font-semibold text-muted">{row.label}</span>
                    <span className="text-right text-[13.5px] font-bold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Certifications</h2>
                <div className="mt-3 flex flex-col">
                  {c.certifications.length === 0 ? (
                    <EmptyState message="No certifications on file." />
                  ) : (
                    c.certifications.map((cert, i) => (
                      <div key={i} className="flex items-center gap-2.5 border-t border-divider py-2.5 first:border-0">
                        <Icon name="check_circle" size={16} className="shrink-0 text-primary" />
                        <span className="text-[13px] font-semibold text-ink">{cert}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Responsibilities</h2>
                <div className="mt-3 flex flex-col">
                  {c.responsibilities.length === 0 ? (
                    <EmptyState message="No responsibilities on file." />
                  ) : (
                    c.responsibilities.map((resp, i) => (
                      <div key={i} className="flex items-center gap-2.5 border-t border-divider py-2.5 first:border-0">
                        <Icon name="check_circle" size={16} className="shrink-0 text-primary" />
                        <span className="text-[13px] font-semibold text-ink">{resp}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Teams handled</h2>
            <div className="mt-3">
              {c.teams.length === 0 ? (
                <EmptyState message="Not currently assigned to any squad." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {c.teams.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-pill border border-border-default bg-surface-muted px-3 py-1 text-[12px] font-bold text-ink"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-divider pt-4">
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Achievements</h2>
              <Badge>{c.achievements.length} result{c.achievements.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="mt-3 flex flex-col">
              {c.achievements.length === 0 ? (
                <EmptyState message="No results recorded for this coach yet." />
              ) : (
                c.achievements.map((ach, i) => (
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

          <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit coach" subtitle={c.name}>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
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
                  <label className="text-[13px] font-bold text-primary">Coaching experience (years)</label>
                  <Input
                    type="number"
                    value={editCoachingExperienceYears}
                    onChange={(e) => setEditCoachingExperienceYears(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Duty status</label>
                <Select value={editDutyStatus} onChange={(e) => setEditDutyStatus(e.target.value as DutyStatus)}>
                  <option value="on_duty">On duty</option>
                  <option value="on_leave">On leave</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Certifications</label>
                <Textarea
                  rows={3}
                  value={editCertifications}
                  onChange={(e) => setEditCertifications(e.target.value)}
                  placeholder="One certification per line"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-primary">Responsibilities</label>
                <Textarea
                  rows={3}
                  value={editResponsibilities}
                  onChange={(e) => setEditResponsibilities(e.target.value)}
                  placeholder="One responsibility per line"
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
                <Button type="submit" variant="primarySmall" className="px-6" disabled={updateCoach.isPending}>
                  {updateCoach.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
