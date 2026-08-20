"use client";

import { useState } from "react";
import { Badge, Button, Icon, Input, Modal, DataTable, type DataTableColumn } from "@/components/ui";
import {
  useDisciplines,
  useCreateDiscipline,
  useUpdateDiscipline,
  useDeleteDiscipline,
  type Discipline,
} from "@/modules/sports-admin/api/disciplines";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { ApiError } from "@/types/api";

export default function DisciplinesPage() {
  const disciplines = useDisciplines();
  const createDiscipline = useCreateDiscipline();
  const updateDiscipline = useUpdateDiscipline();
  const deleteDiscipline = useDeleteDiscipline();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editHeadCoach, setEditHeadCoach] = useState<PickedPerson | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  function openModal() {
    setName("");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createDiscipline.mutateAsync({ name });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function openEditModal(row: Discipline) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditHeadCoach(row.head_coach ? { id: row.head_coach.id, name: row.head_coach.name, meta: "" } : null);
    setEditIsActive(row.is_active);
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (editingId === null) return;
    try {
      await updateDiscipline.mutateAsync({
        id: editingId,
        name: editName,
        head_coach_faculty_id: editHeadCoach ? editHeadCoach.id : undefined,
        is_active: editIsActive,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<Discipline>[] = [
    { key: "name", header: "Discipline", width: "1.4fr", render: (d) => <span className="font-bold text-ink">{d.name}</span> },
    {
      key: "coach",
      header: "Head coach",
      width: "1.2fr",
      render: (d) => <span className="text-body">{d.head_coach?.name ?? "—"}</span>,
    },
    {
      key: "athletes",
      header: "Athletes · teams",
      width: "1fr",
      render: (d) => (
        <span className="font-mono text-[12.5px] text-muted">
          {d.athlete_count} · {d.team_count}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "0.8fr",
      render: (d) => <Badge tone={d.is_active ? "accent" : "neutral"}>{d.is_active ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      width: "0.6fr",
      align: "right",
      render: (d) => (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => openEditModal(d)} className="text-[12px] font-bold text-primary hover:text-primary-dark">
            Edit
          </button>
          <button
            onClick={() => deleteDiscipline.mutate(d.id)}
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
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Disciplines</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {disciplines.data ? `${disciplines.data.length} discipline${disciplines.data.length === 1 ? "" : "s"} with an assigned coach and venue` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Add discipline
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={disciplines.data ?? []}
        rowKey={(d) => d.id}
        emptyMessage={disciplines.isLoading ? "Loading…" : "No disciplines yet. Use Add discipline to create the first one."}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add discipline" subtitle="Added to the sports program list">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Discipline name</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Athletics" />
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
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!name || createDiscipline.isPending}>
              {createDiscipline.isPending ? "Adding…" : "Add discipline"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit discipline" subtitle={editName}>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Discipline name</label>
            <Input required value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Athletics" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Head coach</label>
            <PersonPicker type="faculty" value={editHeadCoach} onChange={setEditHeadCoach} />
          </div>
          <label className="flex items-center gap-2.5 text-[13px] font-semibold text-body">
            <input
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="size-[16px] rounded-[5px] border border-border-default accent-primary"
            />
            Active
          </label>
          {editError && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {editError}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!editName || updateDiscipline.isPending}>
              {updateDiscipline.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
