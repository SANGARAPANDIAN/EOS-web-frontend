"use client";

import { useState } from "react";
import { Badge, Button, Icon, Input, Modal, Select, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useFacilities,
  useCreateFacility,
  useUpdateFacility,
  useDeleteFacility,
  type Facility,
  type FacilityType,
  type FacilityStatus,
} from "@/modules/sports-admin/api/facilities";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<Facility["status"], BadgeTone> = {
  available: "accent",
  under_repair: "accentDark",
  closed: "neutral",
};

const TYPE_LABEL: Record<FacilityType, string> = {
  ground: "Ground",
  court: "Court",
  hall: "Hall",
  gym: "Gym",
  pool: "Pool",
  other: "Other",
};

const STATUS_LABEL: Record<FacilityStatus, string> = {
  available: "Available",
  under_repair: "Under repair",
  closed: "Closed",
};

export default function FacilitiesPage() {
  const facilities = useFacilities();
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const deleteFacility = useDeleteFacility();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [facilityType, setFacilityType] = useState<FacilityType>("ground");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editFacilityType, setEditFacilityType] = useState<FacilityType>("ground");
  const [editCapacity, setEditCapacity] = useState("");
  const [editStatus, setEditStatus] = useState<FacilityStatus>("available");
  const [editError, setEditError] = useState<string | null>(null);

  function openModal() {
    setName("");
    setLocation("");
    setFacilityType("ground");
    setCapacity("");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createFacility.mutateAsync({
        name,
        location: location || undefined,
        facility_type: facilityType,
        capacity: capacity ? Number(capacity) : undefined,
      });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function openEditModal(row: Facility) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditLocation(row.location ?? "");
    setEditFacilityType(row.facility_type);
    setEditCapacity(row.capacity ? String(row.capacity) : "");
    setEditStatus(row.status);
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (editingId === null) return;
    try {
      await updateFacility.mutateAsync({
        id: editingId,
        name: editName,
        location: editLocation || undefined,
        facility_type: editFacilityType,
        capacity: editCapacity ? Number(editCapacity) : undefined,
        status: editStatus,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<Facility>[] = [
    { key: "name", header: "Venue", width: "1.3fr", render: (f) => <span className="font-bold text-ink">{f.name}</span> },
    {
      key: "type",
      header: "Type",
      width: "0.9fr",
      render: (f) => <Badge tone="neutral">{TYPE_LABEL[f.facility_type]}</Badge>,
    },
    {
      key: "details",
      header: "Details",
      width: "1.3fr",
      render: (f) => (
        <span className="text-body">
          {[f.location, f.capacity ? `Capacity ${f.capacity}` : null].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    {
      key: "utilisation",
      header: "Utilisation",
      width: "1.2fr",
      render: (f) => (
        <div>
          <div className="mb-1 flex justify-between text-[12.5px] font-semibold text-ink">
            <span className="font-mono text-muted">{f.usage_pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-tint">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${f.usage_pct}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "0.9fr",
      render: (f) => <Badge tone={STATUS_TONE[f.status]}>{f.status.replace("_", " ")}</Badge>,
    },
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
            onClick={() => deleteFacility.mutate(f.id)}
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
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Facilities</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {facilities.data ? `${facilities.data.length} venue${facilities.data.length === 1 ? "" : "s"} registered for sports use` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Add venue
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={facilities.data ?? []}
        rowKey={(f) => f.id}
        emptyMessage={facilities.isLoading ? "Loading…" : "No facilities yet. Use Add venue to create the first one."}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add venue" subtitle="Registered for sports use">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Venue name</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Ground" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Location</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. North campus" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Type</label>
              <Select value={facilityType} onChange={(e) => setFacilityType(e.target.value as FacilityType)}>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Capacity</label>
              <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 200" />
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
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!name || createFacility.isPending}>
              {createFacility.isPending ? "Adding…" : "Add venue"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit venue" subtitle={editName}>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Venue name</label>
            <Input required value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Main Ground" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Location</label>
            <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. North campus" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Type</label>
              <Select value={editFacilityType} onChange={(e) => setEditFacilityType(e.target.value as FacilityType)}>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Capacity</label>
              <Input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} placeholder="e.g. 200" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Status</label>
            <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as FacilityStatus)}>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!editName || updateFacility.isPending}>
              {updateFacility.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
