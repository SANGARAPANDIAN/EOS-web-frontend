"use client";

import { useState } from "react";
import type { BadgeTone } from "@/components/ui/Badge";
import { Card, Badge, Button, Input, Modal, Select, Textarea, DataTable, type DataTableColumn } from "@/components/ui";
import {
  useFitnessTests,
  useCreateFitnessTest,
  useUpdateFitnessTest,
  useDeleteFitnessTest,
  type FitnessTest,
  type FitnessStatus,
} from "@/modules/sports-admin/api/fitness";
import { ApiError } from "@/types/api";
import { formatDisplayDate } from "@/lib/utils/date";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";

const STATUS_TONE: Record<FitnessStatus, BadgeTone> = {
  fit: "accent",
  rest: "neutral",
  injured: "accentDark",
};

export default function FitnessPage() {
  const [status, setStatus] = useState<string>("");

  const fitnessTests = useFitnessTests({
    status: (status as FitnessStatus) || undefined,
  });
  const createFitnessTest = useCreateFitnessTest();
  const updateFitnessTest = useUpdateFitnessTest();
  const deleteFitnessTest = useDeleteFitnessTest();

  const [showForm, setShowForm] = useState(false);
  const [student, setStudent] = useState<PickedPerson | null>(null);
  const [testName, setTestName] = useState("");
  const [score, setScore] = useState("");
  const [testDate, setTestDate] = useState("");
  const [formStatus, setFormStatus] = useState<FitnessStatus>("fit");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTestName, setEditTestName] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editTestDate, setEditTestDate] = useState("");
  const [editStatus, setEditStatus] = useState<FitnessStatus>("fit");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal(row: FitnessTest) {
    setEditingId(row.id);
    setEditTestName(row.test_name);
    setEditScore(row.score ?? "");
    setEditTestDate(row.test_date);
    setEditStatus(row.status);
    setEditNotes(row.notes ?? "");
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (editingId === null) return;
    try {
      await updateFitnessTest.mutateAsync({
        id: editingId,
        test_name: editTestName,
        score: editScore || undefined,
        test_date: editTestDate,
        status: editStatus,
        notes: editNotes || undefined,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function resetForm() {
    setStudent(null);
    setTestName("");
    setScore("");
    setTestDate("");
    setFormStatus("fit");
    setNotes("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!student) return;
    try {
      await createFitnessTest.mutateAsync({
        student_id: student.id,
        test_name: testName,
        score: score || undefined,
        test_date: testDate,
        status: formStatus,
        notes: notes || undefined,
      });
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<FitnessTest>[] = [
    { key: "athlete", header: "Athlete", width: "1.2fr", render: (f) => <span className="font-bold text-ink">{f.student.name}</span> },
    { key: "test", header: "Test", width: "1.1fr", render: (f) => <span className="text-body">{f.test_name}</span> },
    { key: "reading", header: "Reading", width: "0.8fr", render: (f) => <span className="font-mono text-[12.5px] text-muted">{f.score ?? "—"}</span> },
    {
      key: "date",
      header: "Date",
      width: "0.9fr",
      render: (f) => <span className="text-body">{formatDisplayDate(f.test_date)}</span>,
    },
    { key: "status", header: "Status", width: "0.8fr", render: (f) => <Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge> },
    {
      key: "actions",
      header: "",
      width: "0.6fr",
      align: "right",
      render: (f) => (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => openEditModal(f)} className="text-[12px] font-bold text-primary hover:text-primary-dark">
            Edit
          </button>
          <button
            onClick={() => deleteFitnessTest.mutate(f.id)}
            className="text-[12px] font-bold text-muted hover:text-danger-fg"
          >
            Remove
          </button>
        </div>
      ),
    },
  ];

  const rows = fitnessTests.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Fitness tests</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {rows.length > 0 ? `${rows.length} test${rows.length === 1 ? "" : "s"} on record` : " "}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Record test"}
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="fit">Fit</option>
          <option value="rest">Rest</option>
          <option value="injured">Injured</option>
        </Select>
      </Card>

      {showForm && (
        <Card className="max-w-[520px]">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Student</label>
              <PersonPicker type="student" value={student} onChange={setStudent} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Test name</label>
              <Input required value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. VO2 max" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Reading (optional)</label>
              <Input value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 52 ml/kg/min" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Test date</label>
              <Input required type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Status</label>
              <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value as FitnessStatus)}>
                <option value="fit">Fit</option>
                <option value="rest">Rest</option>
                <option value="injured">Injured</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Notes (optional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional observations…" rows={3} />
            </div>
            {error && (
              <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                {error}
              </div>
            )}
            <Button type="submit" disabled={!student || !testName || !testDate || createFitnessTest.isPending}>
              {createFitnessTest.isPending ? "Recording…" : "Record test"}
            </Button>
          </form>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(f) => f.id}
        emptyMessage={fitnessTests.isLoading ? "Loading…" : "No fitness tests match these filters."}
      />

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit fitness test"
        subtitle={rows.find((r) => r.id === editingId)?.student.name}
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Test name</label>
            <Input required value={editTestName} onChange={(e) => setEditTestName(e.target.value)} placeholder="e.g. VO2 max" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Reading (optional)</label>
              <Input value={editScore} onChange={(e) => setEditScore(e.target.value)} placeholder="e.g. 58 or 2:21.4" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Test date</label>
              <Input required type="date" value={editTestDate} onChange={(e) => setEditTestDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Status</label>
            <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as FitnessStatus)}>
              <option value="fit">Fit</option>
              <option value="rest">Rest</option>
              <option value="injured">Injured</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Notes (optional)</label>
            <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Additional observations…" rows={3} />
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
              disabled={!editTestName || !editTestDate || updateFitnessTest.isPending}
            >
              {updateFitnessTest.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
