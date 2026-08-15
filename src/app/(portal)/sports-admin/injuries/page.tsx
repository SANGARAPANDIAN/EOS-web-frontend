"use client";

import { useState } from "react";
import type { BadgeTone } from "@/components/ui/Badge";
import { Card, Badge, Button, Icon, Input, Modal, Select, Textarea, DataTable, type DataTableColumn } from "@/components/ui";
import {
  useInjuries,
  useCreateInjury,
  useUpdateInjury,
  useDeleteInjury,
  type Injury,
  type IncidentType,
  type InjuryStatus,
} from "@/modules/sports-admin/api/injuries";
import { ApiError } from "@/types/api";
import { formatDisplayDate } from "@/lib/utils/date";
import { useFacilities } from "@/modules/sports-admin/api/facilities";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";

const STATUS_TONE: Record<InjuryStatus, BadgeTone> = {
  open: "accentDark",
  closed: "accent",
};

export default function InjuriesPage() {
  const [status, setStatus] = useState<string>("");

  const injuries = useInjuries({
    status: (status as InjuryStatus) || undefined,
  });
  const createInjury = useCreateInjury();
  const updateInjury = useUpdateInjury();
  const deleteInjury = useDeleteInjury();
  const facilities = useFacilities();

  const [showModal, setShowModal] = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType>("injury");
  const [student, setStudent] = useState<PickedPerson | null>(null);
  const [facilityId, setFacilityId] = useState("");
  const [incident, setIncident] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [careNotes, setCareNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editIncidentType, setEditIncidentType] = useState<IncidentType>("injury");
  const [editStudent, setEditStudent] = useState<PickedPerson | null>(null);
  const [editFacilityId, setEditFacilityId] = useState("");
  const [editIncident, setEditIncident] = useState("");
  const [editIncidentDate, setEditIncidentDate] = useState("");
  const [editStatus, setEditStatus] = useState<InjuryStatus>("open");
  const [editCareNotes, setEditCareNotes] = useState("");
  const [editReturnToPlayDate, setEditReturnToPlayDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal(row: Injury) {
    setEditingId(row.id);
    setEditIncidentType(row.incident_type);
    setEditStudent(row.student ? { id: row.student.id, name: row.student.name, meta: "" } : null);
    setEditFacilityId(row.facility ? String(row.facility.id) : "");
    setEditIncident(row.incident);
    setEditIncidentDate(row.incident_date);
    setEditStatus(row.status);
    setEditCareNotes(row.care_notes ?? "");
    setEditReturnToPlayDate(row.return_to_play_date ?? "");
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (editingId === null) return;
    try {
      await updateInjury.mutateAsync({
        id: editingId,
        incident_type: editIncidentType,
        student_id: editIncidentType === "injury" && editStudent ? editStudent.id : undefined,
        facility_id: editIncidentType === "facility" && editFacilityId ? Number(editFacilityId) : undefined,
        incident: editIncident,
        incident_date: editIncidentDate,
        status: editStatus,
        care_notes: editCareNotes || undefined,
        return_to_play_date: editReturnToPlayDate || undefined,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function openModal() {
    setIncidentType("injury");
    setStudent(null);
    setFacilityId("");
    setIncident("");
    setIncidentDate("");
    setCareNotes("");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createInjury.mutateAsync({
        incident_type: incidentType,
        student_id: incidentType === "injury" && student ? student.id : undefined,
        facility_id: incidentType === "facility" && facilityId ? Number(facilityId) : undefined,
        incident,
        incident_date: incidentDate,
        care_notes: careNotes || undefined,
      });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<Injury>[] = [
    { key: "case", header: "Case", width: "1.4fr", render: (i) => <span className="font-bold text-ink">{i.incident}</span> },
    {
      key: "who",
      header: "Student / Facility",
      width: "1.1fr",
      render: (i) => <span className="text-body">{i.student?.name ?? i.facility?.name ?? "—"}</span>,
    },
    {
      key: "date",
      header: "Date",
      width: "0.9fr",
      render: (i) => <span className="font-mono text-[12.5px] text-muted">{formatDisplayDate(i.incident_date)}</span>,
    },
    { key: "status", header: "Status", width: "0.8fr", render: (i) => <Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge> },
    {
      key: "actions",
      header: "",
      width: "0.6fr",
      align: "right",
      render: (i) => (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => openEditModal(i)} className="text-[12px] font-bold text-primary hover:text-primary-dark">
            Edit
          </button>
          <button
            onClick={() => deleteInjury.mutate(i.id)}
            className="text-[12px] font-bold text-muted hover:text-danger-fg"
          >
            Remove
          </button>
        </div>
      ),
    },
  ];

  const rows = injuries.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Injuries &amp; incidents</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {rows.length > 0 ? `${rows.length} case${rows.length === 1 ? "" : "s"} on record` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Log incident
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(i) => i.id}
        emptyMessage={injuries.isLoading ? "Loading…" : "No incidents match these filters."}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log incident" subtitle="Recorded to the injuries & incidents register">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Incident type</label>
            <Select value={incidentType} onChange={(e) => setIncidentType(e.target.value as IncidentType)}>
              <option value="injury">Injury</option>
              <option value="facility">Facility</option>
            </Select>
          </div>
          {incidentType === "injury" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Student</label>
              <PersonPicker type="student" value={student} onChange={setStudent} required />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Facility</label>
              <Select required value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                <option value="">Select a facility…</option>
                {(facilities.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Incident</label>
            <Input required value={incident} onChange={(e) => setIncident(e.target.value)} placeholder="e.g. Sprained ankle during practice" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Incident date</label>
            <Input required type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Care notes (optional)</label>
            <Textarea value={careNotes} onChange={(e) => setCareNotes(e.target.value)} placeholder="Treatment given, follow-up plan…" rows={3} />
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
            <Button
              type="submit"
              variant="primarySmall"
              className="px-6"
              disabled={!incident || !incidentDate || (incidentType === "injury" ? !student : !facilityId) || createInjury.isPending}
            >
              {createInjury.isPending ? "Logging…" : "Log incident"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit incident" subtitle={editIncident}>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Incident type</label>
            <Select value={editIncidentType} onChange={(e) => setEditIncidentType(e.target.value as IncidentType)}>
              <option value="injury">Injury</option>
              <option value="facility">Facility</option>
            </Select>
          </div>
          {editIncidentType === "injury" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Student</label>
              <PersonPicker type="student" value={editStudent} onChange={setEditStudent} />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Facility</label>
              <Select value={editFacilityId} onChange={(e) => setEditFacilityId(e.target.value)}>
                <option value="">Select a facility…</option>
                {(facilities.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Incident</label>
            <Input required value={editIncident} onChange={(e) => setEditIncident(e.target.value)} placeholder="e.g. Sprained ankle during practice" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Incident date</label>
              <Input required type="date" value={editIncidentDate} onChange={(e) => setEditIncidentDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Status</label>
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as InjuryStatus)}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Return to play date (optional)</label>
            <Input type="date" value={editReturnToPlayDate} onChange={(e) => setEditReturnToPlayDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Care notes (optional)</label>
            <Textarea value={editCareNotes} onChange={(e) => setEditCareNotes(e.target.value)} placeholder="Treatment given, follow-up plan…" rows={3} />
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
              disabled={
                !editIncident ||
                !editIncidentDate ||
                (editIncidentType === "injury" ? !editStudent : !editFacilityId) ||
                updateInjury.isPending
              }
            >
              {updateInjury.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
