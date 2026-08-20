"use client";

import { useState } from "react";
import type { BadgeTone } from "@/components/ui/Badge";
import { Badge, Button, Icon, Input, Modal, Select, SegmentedTabs, DataTable, type DataTableColumn } from "@/components/ui";
import {
  useAchievements,
  useCreateAchievement,
  useUpdateAchievement,
  useDeleteAchievement,
  type Achievement,
} from "@/modules/sports-admin/api/achievements";
import { useTeams } from "@/modules/sports-admin/api/teams";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { ApiError } from "@/types/api";

const NEUTRAL_BADGE_HINTS = ["runner", "second", "third"];

function badgeTone(badge: string): BadgeTone {
  const lower = badge.toLowerCase();
  return NEUTRAL_BADGE_HINTS.some((hint) => lower.includes(hint)) ? "neutral" : "accent";
}

export default function AchievementsPage() {
  const achievements = useAchievements();
  const createAchievement = useCreateAchievement();
  const updateAchievement = useUpdateAchievement();
  const deleteAchievement = useDeleteAchievement();
  const teams = useTeams();

  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState("");
  const [result, setResult] = useState("");
  const [achievementDate, setAchievementDate] = useState("");
  const [level, setLevel] = useState("");
  const [venue, setVenue] = useState("");
  const [subjectType, setSubjectType] = useState<"individual" | "team">("individual");
  const [teamId, setTeamId] = useState("");
  const [athlete, setAthlete] = useState<PickedPerson | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editResult, setEditResult] = useState("");
  const [editAchievementDate, setEditAchievementDate] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editCertificateUrl, setEditCertificateUrl] = useState("");
  const [editSubjectType, setEditSubjectType] = useState<"individual" | "team">("individual");
  const [editTeamId, setEditTeamId] = useState("");
  const [editAthlete, setEditAthlete] = useState<PickedPerson | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal(row: Achievement) {
    setEditingId(row.id);
    setEditEventName(row.event_name);
    setEditResult(row.result);
    setEditAchievementDate(row.achievement_date);
    setEditLevel(row.level ?? "");
    setEditVenue(row.venue ?? "");
    setEditCertificateUrl(row.certificate_url ?? "");
    setEditSubjectType(row.athlete_student_id ? "individual" : "team");
    setEditTeamId(String(row.team_id ?? ""));
    setEditAthlete(null);
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (editingId === null) return;
    try {
      await updateAchievement.mutateAsync({
        id: editingId,
        event_name: editEventName,
        result: editResult,
        achievement_date: editAchievementDate,
        level: editLevel || undefined,
        venue: editVenue || undefined,
        certificate_url: editCertificateUrl || undefined,
        team_id: editSubjectType === "team" && editTeamId ? Number(editTeamId) : undefined,
        athlete_student_id: editSubjectType === "individual" && editAthlete ? editAthlete.id : undefined,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function openModal() {
    setEventName("");
    setResult("");
    setAchievementDate("");
    setLevel("");
    setVenue("");
    setSubjectType("individual");
    setTeamId("");
    setAthlete(null);
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createAchievement.mutateAsync({
        event_name: eventName,
        result,
        achievement_date: achievementDate,
        level: level || undefined,
        venue: venue || undefined,
        team_id: subjectType === "team" && teamId ? Number(teamId) : undefined,
        athlete_student_id: subjectType === "individual" && athlete ? athlete.id : undefined,
      });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const subjectValid = subjectType === "individual" ? Boolean(athlete) : Boolean(teamId);

  const columns: DataTableColumn<Achievement>[] = [
    { key: "event", header: "Event", width: "1.4fr", render: (a) => <span className="font-bold text-ink">{a.title}</span> },
    { key: "who", header: "Athlete / Team", width: "1.2fr", render: (a) => <span className="text-body">{a.sub}</span> },
    { key: "month", header: "Month", width: "0.9fr", render: (a) => <span className="font-mono text-[12.5px] text-muted">{a.meta}</span> },
    {
      key: "result",
      header: "Result",
      width: "0.8fr",
      render: (a) => <Badge tone={badgeTone(a.badge)}>{a.badge}</Badge>,
    },
    {
      key: "actions",
      header: "",
      width: "0.6fr",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => openEditModal(a)}
            className="text-[12px] font-bold text-primary hover:text-primary-dark"
          >
            Edit
          </button>
          <button
            onClick={() => deleteAchievement.mutate(a.id)}
            className="text-[12px] font-bold text-muted hover:text-danger-fg"
          >
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Achievements</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {achievements.data ? `${achievements.data.length} result${achievements.data.length === 1 ? "" : "s"} on record` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Add result
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={achievements.data ?? []}
        rowKey={(a) => a.id}
        emptyMessage={achievements.isLoading ? "Loading…" : "No achievements yet. Use Add result to log the first one."}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add result" subtitle="Recorded to the achievements register">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Event name</label>
            <Input required value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. State Athletics Meet" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Result</label>
              <Input required value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. Gold medal" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Achievement date</label>
              <Input required type="date" value={achievementDate} onChange={(e) => setAchievementDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Level (optional)</label>
              <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. State" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Venue (optional)</label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. National Stadium" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Subject</label>
            <SegmentedTabs
              options={[
                { key: "individual", label: "Individual" },
                { key: "team", label: "Team" },
              ]}
              value={subjectType}
              onChange={(k) => setSubjectType(k as "individual" | "team")}
            />
          </div>
          {subjectType === "individual" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Athlete</label>
              <PersonPicker type="student" value={athlete} onChange={setAthlete} />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Team</label>
              <Select required value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">Select a team…</option>
                {(teams.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primarySmall"
              className="px-6"
              disabled={!eventName || !result || !achievementDate || !subjectValid || createAchievement.isPending}
            >
              {createAchievement.isPending ? "Adding…" : "Add result"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit result" subtitle={editEventName}>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Event name</label>
            <Input required value={editEventName} onChange={(e) => setEditEventName(e.target.value)} placeholder="e.g. State Athletics Meet" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Result</label>
              <Input required value={editResult} onChange={(e) => setEditResult(e.target.value)} placeholder="e.g. Gold medal" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Achievement date</label>
              <Input required type="date" value={editAchievementDate} onChange={(e) => setEditAchievementDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Level (optional)</label>
              <Input value={editLevel} onChange={(e) => setEditLevel(e.target.value)} placeholder="e.g. State" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Venue (optional)</label>
              <Input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} placeholder="e.g. National Stadium" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Subject</label>
            <SegmentedTabs
              options={[
                { key: "individual", label: "Individual" },
                { key: "team", label: "Team" },
              ]}
              value={editSubjectType}
              onChange={(k) => setEditSubjectType(k as "individual" | "team")}
            />
          </div>
          {editSubjectType === "individual" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Athlete</label>
              <PersonPicker type="student" value={editAthlete} onChange={setEditAthlete} />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Team</label>
              <Select value={editTeamId} onChange={(e) => setEditTeamId(e.target.value)}>
                <option value="">Select a team…</option>
                {(teams.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Certificate URL (optional)</label>
            <Input value={editCertificateUrl} onChange={(e) => setEditCertificateUrl(e.target.value)} placeholder="https://…" />
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
              disabled={!editEventName || !editResult || !editAchievementDate || updateAchievement.isPending}
            >
              {updateAchievement.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
