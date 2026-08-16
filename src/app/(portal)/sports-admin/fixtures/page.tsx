"use client";

import { useState } from "react";
import { Badge, Button, Icon, Input, Modal, Select, DataTable, type DataTableColumn } from "@/components/ui";
import {
  useFixtures,
  useCreateFixture,
  useUpdateFixture,
  useDeleteFixture,
  useConfirmFixture,
  type Fixture,
} from "@/modules/sports-admin/api/fixtures";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { useTeams } from "@/modules/sports-admin/api/teams";
import { useFacilities } from "@/modules/sports-admin/api/facilities";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

export default function FixturesPage() {
  const fixtures = useFixtures();
  const disciplines = useDisciplines();
  const teams = useTeams();
  const facilities = useFacilities();
  const createFixture = useCreateFixture();
  const updateFixture = useUpdateFixture();
  const deleteFixture = useDeleteFixture();
  const confirmFixture = useConfirmFixture();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [opponent, setOpponent] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [fixtureDate, setFixtureDate] = useState("");
  const [fixtureTime, setFixtureTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDisciplineId, setEditDisciplineId] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editFacilityId, setEditFacilityId] = useState("");
  const [editIsHome, setEditIsHome] = useState(true);
  const [editFixtureDate, setEditFixtureDate] = useState("");
  const [editFixtureTime, setEditFixtureTime] = useState("");
  const [editResult, setEditResult] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openModal() {
    setTitle("");
    setDisciplineId("");
    setTeamId("");
    setOpponent("");
    setFacilityId("");
    setIsHome(true);
    setFixtureDate("");
    setFixtureTime("");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createFixture.mutateAsync({
        title,
        discipline_id: disciplineId ? Number(disciplineId) : undefined,
        team_id: teamId ? Number(teamId) : undefined,
        opponent: opponent || undefined,
        facility_id: facilityId ? Number(facilityId) : undefined,
        is_home: isHome,
        fixture_date: fixtureDate,
        fixture_time: fixtureTime || undefined,
      });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function openEditModal(row: Fixture) {
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditDisciplineId(row.discipline ? String(row.discipline.id) : "");
    setEditTeamId(row.team ? String(row.team.id) : "");
    setEditOpponent(row.opponent ?? "");
    setEditFacilityId(row.facility ? String(row.facility.id) : "");
    setEditIsHome(row.is_home);
    setEditFixtureDate(row.fixture_date);
    setEditFixtureTime(row.fixture_time ?? "");
    setEditResult(row.result ?? "");
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (editingId === null) return;
    try {
      await updateFixture.mutateAsync({
        id: editingId,
        title: editTitle,
        discipline_id: editDisciplineId ? Number(editDisciplineId) : undefined,
        team_id: editTeamId ? Number(editTeamId) : undefined,
        opponent: editOpponent || undefined,
        facility_id: editFacilityId ? Number(editFacilityId) : undefined,
        is_home: editIsHome,
        fixture_date: editFixtureDate,
        fixture_time: editFixtureTime || undefined,
        result: editResult || undefined,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<Fixture>[] = [
    { key: "title", header: "Fixture", width: "1.4fr", render: (f) => <span className="font-bold text-ink">{f.title}</span> },
    {
      key: "venue",
      header: "Venue · squad",
      width: "1.3fr",
      render: (f) => (
        <span className="text-body">
          {[f.facility?.name, f.is_home ? "Home" : "Away", f.opponent].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      width: "1fr",
      render: (f) => (
        <span className="font-mono text-[12.5px] text-muted">
          {formatDisplayDate(f.fixture_date)}
          {f.fixture_time ? ` · ${f.fixture_time}` : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "0.8fr",
      render: (f) => <Badge tone={f.status === "confirmed" ? "accent" : "neutral"}>{f.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      width: "1fr",
      align: "right",
      render: (f) => (
        <div className="flex items-center justify-end gap-3.5">
          <button onClick={() => openEditModal(f)} className="text-[12px] font-bold text-primary hover:text-primary-dark">
            Edit
          </button>
          {f.status === "pending" && (
            <button
              onClick={() => confirmFixture.mutate(f.id)}
              className="text-[12px] font-bold text-primary hover:text-primary-dark"
            >
              Confirm
            </button>
          )}
          <button
            onClick={() => deleteFixture.mutate(f.id)}
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
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Fixtures</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {fixtures.data ? `${fixtures.data.length} fixture${fixtures.data.length === 1 ? "" : "s"} scheduled` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Add fixture
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={fixtures.data ?? []}
        rowKey={(f) => f.id}
        emptyMessage={fixtures.isLoading ? "Loading…" : "No fixtures yet. Use Add fixture to schedule the first one."}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add fixture" subtitle="Added to the fixtures calendar">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Title</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. U19 Basketball vs St. Xavier's" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Discipline</label>
              <Select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
                <option value="">Not set</option>
                {disciplines.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Team</label>
              <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">Not set</option>
                {teams.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Opponent</label>
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. St. Xavier's School" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Facility</label>
              <Select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                <option value="">Not set</option>
                {facilities.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-[13px] font-semibold text-body">
            <input
              type="checkbox"
              checked={isHome}
              onChange={(e) => setIsHome(e.target.checked)}
              className="size-[16px] rounded-[5px] border border-border-default accent-primary"
            />
            Home fixture
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Fixture date</label>
              <Input type="date" required value={fixtureDate} onChange={(e) => setFixtureDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Fixture time</label>
              <Input type="time" value={fixtureTime} onChange={(e) => setFixtureTime(e.target.value)} />
            </div>
          </div>
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!title || !fixtureDate || createFixture.isPending}>
              {createFixture.isPending ? "Adding…" : "Add fixture"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit fixture" subtitle={editTitle}>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Title</label>
            <Input required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. U19 Basketball vs St. Xavier's" />
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
              <label className="text-[13px] font-bold text-primary">Team</label>
              <Select value={editTeamId} onChange={(e) => setEditTeamId(e.target.value)}>
                <option value="">Not set</option>
                {teams.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Opponent</label>
              <Input value={editOpponent} onChange={(e) => setEditOpponent(e.target.value)} placeholder="e.g. St. Xavier's School" />
            </div>
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
          </div>
          <label className="flex items-center gap-2.5 text-[13px] font-semibold text-body">
            <input
              type="checkbox"
              checked={editIsHome}
              onChange={(e) => setEditIsHome(e.target.checked)}
              className="size-[16px] rounded-[5px] border border-border-default accent-primary"
            />
            Home fixture
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Fixture date</label>
              <Input type="date" required value={editFixtureDate} onChange={(e) => setEditFixtureDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Fixture time</label>
              <Input type="time" value={editFixtureTime} onChange={(e) => setEditFixtureTime(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Result</label>
            <Input value={editResult} onChange={(e) => setEditResult(e.target.value)} placeholder="e.g. Winners" />
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
              disabled={!editTitle || !editFixtureDate || updateFixture.isPending}
            >
              {updateFixture.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
