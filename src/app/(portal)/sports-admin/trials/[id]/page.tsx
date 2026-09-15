"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Input, Avatar, Icon, EmptyState, Modal, Select } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { EntityDetailHeader } from "@/components/shared/EntityDetailHeader";
import {
  useTrialDetail,
  useSelectTrial,
  useHoldTrial,
  useUpdateTrial,
  type TrialStatus,
} from "@/modules/sports-admin/api/trials";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { useTeams } from "@/modules/sports-admin/api/teams";
import { useFacilities } from "@/modules/sports-admin/api/facilities";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<TrialStatus, BadgeTone> = {
  pending: "neutral",
  selected: "accent",
  hold: "accentDark",
};

export default function TrialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const trialId = Number(id);
  const trial = useTrialDetail(trialId);
  const selectTrial = useSelectTrial();
  const holdTrial = useHoldTrial();
  const updateTrial = useUpdateTrial();
  const disciplines = useDisciplines();
  const teams = useTeams();
  const facilities = useFacilities();
  const t = trial.data;

  const [recommendation, setRecommendation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisciplineId, setEditDisciplineId] = useState("");
  const [editTargetTeamId, setEditTargetTeamId] = useState("");
  const [editRoundLabel, setEditRoundLabel] = useState("");
  const [editTrialAt, setEditTrialAt] = useState("");
  const [editFacilityId, setEditFacilityId] = useState("");
  const [editPanel, setEditPanel] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal() {
    if (!t) return;
    setEditDisciplineId(String(t.discipline.id));
    setEditTargetTeamId(t.target_team ? String(t.target_team.id) : "");
    setEditRoundLabel(t.round_label ?? "");
    setEditTrialAt(t.trial_at.slice(0, 16));
    setEditFacilityId(t.facility ? String(t.facility.id) : "");
    setEditPanel(t.panel ?? "");
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await updateTrial.mutateAsync({
        id: trialId,
        discipline_id: editDisciplineId ? Number(editDisciplineId) : undefined,
        target_team_id: editTargetTeamId ? Number(editTargetTeamId) : undefined,
        round_label: editRoundLabel || undefined,
        trial_at: editTrialAt || undefined,
        facility_id: editFacilityId ? Number(editFacilityId) : undefined,
        panel: editPanel || undefined,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleSelect() {
    setError(null);
    try {
      await selectTrial.mutateAsync({ id: trialId, recommendation: recommendation || undefined });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleHold() {
    setError(null);
    try {
      await holdTrial.mutateAsync(trialId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/sports-admin/trials")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Trials
      </button>

      {!t ? (
        <Card>
          <EmptyState message={trial.isLoading ? "Loading…" : "Trial not found."} />
        </Card>
      ) : (
        <>
          <EntityDetailHeader
            avatar={
              <div className="flex flex-col items-center gap-2">
                <Avatar name={t.student.name} size={72} />
                <span className="font-mono text-[11px] text-muted">SPT-{String(t.student.id).padStart(4, "0")}</span>
              </div>
            }
            title={t.student.name}
            badge={<Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>}
            actions={
              <Button variant="secondary" onClick={openEditModal}>
                Edit
              </Button>
            }
            subtitle={[t.student.dept?.name, t.discipline?.name].filter(Boolean).join(" · ")}
            fields={[
              { label: "Round", value: t.round_label ?? "—" },
              { label: "Trial date", value: formatDisplayDate(t.trial_at) },
              { label: "Target squad", value: t.target_team?.name ?? "—" },
              { label: "Panel", value: t.panel ?? "—" },
            ]}
          >
            {t.status === "pending" && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-divider pt-4">
                <Input
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  placeholder="Recommendation (optional)"
                  className="max-w-[280px]"
                />
                <Button
                  variant="secondary"
                  onClick={handleSelect}
                  disabled={selectTrial.isPending || holdTrial.isPending}
                >
                  {selectTrial.isPending ? "Selecting…" : "Select for squad"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleHold}
                  disabled={selectTrial.isPending || holdTrial.isPending}
                >
                  {holdTrial.isPending ? "Updating…" : "Keep on hold"}
                </Button>
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                {error}
              </div>
            )}
          </EntityDetailHeader>

          <div className="grid grid-cols-2 items-start gap-4">
            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Candidate details</h2>
              <div className="mt-3 flex flex-col">
                {[
                  { label: "Register no.", value: t.student.reg_no ?? "—" },
                  {
                    label: "Year / sem / section",
                    value: [t.student.year, t.student.sem, t.student.section].filter(Boolean).join(" / ") || "—",
                  },
                  { label: "Mobile", value: t.student.mobile ?? "—" },
                  { label: "Email", value: t.student.email ?? "—" },
                  { label: "Date of birth", value: t.student.dob ? formatDisplayDate(t.student.dob) : "—" },
                  { label: "Gender", value: t.student.gender ?? "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-divider py-2.5 first:border-0">
                    <span className="text-[12.5px] font-semibold text-muted">{row.label}</span>
                    <span className="text-right text-[13.5px] font-bold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Trial scores</h2>
              <div className="mt-3 flex flex-col">
                {t.scores.length === 0 ? (
                  <EmptyState message="No scores recorded yet." />
                ) : (
                  t.scores.map((s, i) => (
                    <div key={s.id ?? i} className="flex items-baseline justify-between gap-4 border-t border-divider py-2.5 first:border-0">
                      <span className="text-[12.5px] font-semibold text-muted">{s.criterion}</span>
                      <span className="text-right font-mono text-[13.5px] font-bold text-ink">{s.score}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Previous achievements</h2>
              <Badge>{t.achievements.length} result{t.achievements.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="mt-3 flex flex-col">
              {t.achievements.length === 0 ? (
                <EmptyState message="No results recorded for this candidate yet." />
              ) : (
                t.achievements.map((ach, i) => (
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

          <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit trial" subtitle={t.student.name}>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Discipline</label>
                  <Select required value={editDisciplineId} onChange={(e) => setEditDisciplineId(e.target.value)}>
                    <option value="">Select discipline</option>
                    {disciplines.data?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Target squad</label>
                  <Select value={editTargetTeamId} onChange={(e) => setEditTargetTeamId(e.target.value)}>
                    <option value="">Not set</option>
                    {teams.data?.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Round</label>
                  <Input
                    value={editRoundLabel}
                    onChange={(e) => setEditRoundLabel(e.target.value)}
                    placeholder="e.g. Trial 1 of 2"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-primary">Trial date &amp; time</label>
                  <Input
                    required
                    type="datetime-local"
                    value={editTrialAt}
                    onChange={(e) => setEditTrialAt(e.target.value)}
                  />
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
                  <label className="text-[13px] font-bold text-primary">Panel</label>
                  <Input
                    value={editPanel}
                    onChange={(e) => setEditPanel(e.target.value)}
                    placeholder="e.g. Mr. X, Mr. Y"
                  />
                </div>
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
                  disabled={!editDisciplineId || !editTrialAt || updateTrial.isPending}
                >
                  {updateTrial.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
