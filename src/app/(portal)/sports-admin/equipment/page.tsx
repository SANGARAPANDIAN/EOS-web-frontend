"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Input, Modal, SearchBar, Select, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useEquipmentList,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  type Equipment,
  type EquipmentStatus,
} from "@/modules/sports-admin/api/equipment";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useFacilities } from "@/modules/sports-admin/api/facilities";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<EquipmentStatus, BadgeTone> = {
  available: "accent",
  in_service: "accentDark",
  retired: "neutral",
};

export default function EquipmentPage() {
  const router = useRouter();
  const facilities = useFacilities();
  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  const equipment = useEquipmentList({
    q: q || undefined,
    status: (status as EquipmentStatus) || undefined,
  });

  const rows = useMemo(() => equipment.data ?? [], [equipment.data]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The same modal serves add and edit: null = adding, an item = editing it.
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [status_, setStatus_] = useState<EquipmentStatus>("available");
  const [deleting, setDeleting] = useState<Equipment | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openModal() {
    setEditing(null);
    setName("");
    setCategory("");
    setTotalQuantity("");
    setFacilityId("");
    setReorderLevel("");
    setStatus_("available");
    setError(null);
    setShowModal(true);
  }

  function openEdit(item: Equipment) {
    setEditing(item);
    setName(item.name);
    setCategory(item.category ?? "");
    setTotalQuantity(String(item.total_quantity ?? ""));
    setFacilityId(item.facility ? String(item.facility.id) : "");
    setReorderLevel(item.reorder_level != null ? String(item.reorder_level) : "");
    setStatus_(item.status);
    setError(null);
    setShowModal(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    setRowError(null);
    try {
      await deleteEquipment.mutateAsync(deleting.id);
      setDeleting(null);
    } catch (err) {
      // The server refuses while units are still issued out, and says so —
      // that message is more useful than a generic failure.
      setRowError(err instanceof ApiError ? err.message : "Could not delete this item.");
      setDeleting(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      category: category || undefined,
      total_quantity: totalQuantity ? Number(totalQuantity) : undefined,
      facility_id: facilityId ? Number(facilityId) : undefined,
      reorder_level: reorderLevel ? Number(reorderLevel) : undefined,
    };
    try {
      if (editing) {
        await updateEquipment.mutateAsync({ id: editing.id, ...payload, status: status_ });
      } else {
        await createEquipment.mutateAsync(payload);
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const saving = editing ? updateEquipment.isPending : createEquipment.isPending;

  const columns: DataTableColumn<Equipment>[] = [
    {
      key: "name",
      header: "Item",
      width: "1.3fr",
      render: (e) => (
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            router.push(`/sports-admin/equipment/${e.id}`);
          }}
          className="font-bold text-ink hover:text-primary"
        >
          {e.name}
        </button>
      ),
    },
    {
      key: "detail",
      header: "Details",
      width: "1.5fr",
      render: (e) => <span className="text-body">{[e.category, e.facility?.name].filter(Boolean).join(" · ") || "—"}</span>,
    },
    {
      key: "quantity",
      header: "Quantity",
      width: "0.9fr",
      render: (e) => (
        <span className="font-mono text-[12.5px] text-muted">
          {e.available_count} / {e.total_quantity}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "0.8fr",
      render: (e) => <Badge tone={STATUS_TONE[e.status]}>{e.status.replace("_", " ")}</Badge>,
    },
    {
      key: "actions",
      header: "",
      width: "1.3fr",
      align: "right",
      render: (e) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              router.push(`/sports-admin/equipment/${e.id}`);
            }}
            className="rounded-[8px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary"
          >
            Open
          </button>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              openEdit(e);
            }}
            className="rounded-[8px] border border-border-default px-3 py-1.5 text-[12px] font-bold text-body hover:text-primary"
          >
            Edit
          </button>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              setDeleting(e);
            }}
            className="rounded-[8px] border border-border-default px-3 py-1.5 text-[12px] font-bold text-muted hover:text-danger-fg"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Equipment</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {rows.length > 0 ? `${rows.length} item type${rows.length === 1 ? "" : "s"} tracked in inventory` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          New item
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <SearchBar placeholder="Search equipment…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="in_service">In service</option>
          <option value="retired">Retired</option>
        </Select>
      </Card>

      {rowError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {rowError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(e) => e.id}
        onRowClick={(e) => router.push(`/sports-admin/equipment/${e.id}`)}
        emptyMessage={equipment.isLoading ? "Loading…" : "No equipment matches these filters."}
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit equipment" : "Add equipment"}
        subtitle={
          editing
            ? "Updates this item type in the sports equipment inventory"
            : "Adds a new item type to the sports equipment inventory"
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Item name</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Basketball" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Ball sports" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Total quantity</label>
              <Input type="number" value={totalQuantity} onChange={(e) => setTotalQuantity(e.target.value)} placeholder="e.g. 20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Facility (optional)</label>
              <Select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                <option value="">Not set</option>
                {(facilities.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Reorder level</label>
              <Input type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="e.g. 5" />
            </div>
          </div>
          {/* Status is only editable on an existing item — a new one always
              starts available. */}
          {editing && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Status</label>
              <Select value={status_} onChange={(e) => setStatus_(e.target.value as EquipmentStatus)}>
                <option value="available">Available</option>
                <option value="in_service">In service</option>
                <option value="retired">Retired</option>
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
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!name || saving}>
              {saving ? (editing ? "Saving…" : "Adding…") : editing ? "Save changes" : "Add item"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting != null}
        title="Delete this equipment item?"
        description={
          deleting
            ? `${deleting.name} will be removed from the inventory. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
