"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Input, Modal, Select, DataTable, EmptyState, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useEquipment,
  useToggleEquipmentCondition,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  conditionValueOf,
  type Equipment,
  type Condition,
  type ConditionValue,
} from "@/modules/medical-centre/api/equipment";
import { ApiError } from "@/types/api";

const CONDITION_TONE: Record<Condition, BadgeTone> = { Working: "accent", "Under service": "accentDark" };
type FilterKey = "all" | Condition;

export default function EquipmentRegisterPage() {
  const equipment = useEquipment();
  const toggle = useToggleEquipmentCondition();
  const [filter, setFilter] = useState<FilterKey>("all");

  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();

  const [editing, setEditing] = useState<Equipment | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Equipment | null>(null);
  const [form, setForm] = useState<{ name: string; quantity: string; location: string; condition: ConditionValue }>({
    name: "",
    quantity: "",
    location: "",
    condition: "working",
  });
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", quantity: "", location: "", condition: "working" });
    setError(null);
    setOpen(true);
  }

  function openEdit(row: Equipment) {
    setEditing(row);
    // The list carries display labels ("Working"); the API stores values
    // ("working"), so the row is converted back on the way into the form.
    setForm({
      name: row.name,
      quantity: String(row.qty ?? ""),
      location: row.place ?? "",
      condition: conditionValueOf(row.condition),
    });
    setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      quantity: form.quantity === "" ? undefined : Number(form.quantity),
      location: form.location || undefined,
      condition: form.condition,
    };
    try {
      if (editing) await updateEquipment.mutateAsync({ id: editing.id, ...payload });
      else await createEquipment.mutateAsync(payload);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this equipment.");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setRowError(null);
    try {
      await deleteEquipment.mutateAsync(deleting.id);
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete this equipment.");
    } finally {
      setDeleting(null);
    }
  }

  const saving = editing ? updateEquipment.isPending : createEquipment.isPending;

  const data = equipment.data ?? [];
  const totalUnits = data.reduce((sum, e) => sum + e.qty, 0);
  const underServiceCount = data.filter((e) => e.condition === "Under service").length;

  const rows = useMemo(() => (filter === "all" ? data : data.filter((e) => e.condition === filter)), [data, filter]);

  const columns: DataTableColumn<Equipment>[] = [
    { key: "name", header: "Equipment", width: "1.6fr", render: (row) => <span className="font-bold text-ink">{row.name}</span> },
    { key: "qty", header: "Qty", width: "0.6fr", render: (row) => <span className="font-mono text-body">{row.qty}</span> },
    { key: "place", header: "Location", width: "1.4fr", render: (row) => <span className="text-body">{row.place}</span> },
    { key: "condition", header: "Condition", width: "1fr", render: (row) => <Badge tone={CONDITION_TONE[row.condition]}>{row.condition}</Badge> },
    {
      key: "action",
      header: "Action",
      width: "1.2fr",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => toggle.mutate(row.id)} disabled={toggle.isPending} className="text-[13px] font-bold text-primary hover:underline">
            {row.condition === "Working" ? "Send for service" : "Mark working"}
          </button>
          <button type="button" onClick={() => openEdit(row)} className="text-[13px] font-bold text-body hover:text-primary">
            Edit
          </button>
          <button type="button" onClick={() => setDeleting(row)} className="text-[13px] font-bold text-muted hover:text-danger-fg">
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
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Equipment register</h1>
        <p className="mt-1 text-[13px] text-muted">
          Quantity, location and working condition · {totalUnits} units across {data.length} equipment types.
        </p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={openAdd}>
          Add equipment
        </Button>
      </div>

      {rowError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {rowError}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-pill border px-4 py-2 text-[13px] font-bold ${filter === "all" ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft"}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("Working")}
          className={`rounded-pill border px-4 py-2 text-[13px] font-bold ${filter === "Working" ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft"}`}
        >
          Working
        </button>
        <button
          type="button"
          onClick={() => setFilter("Under service")}
          className={`rounded-pill border px-4 py-2 text-[13px] font-bold ${filter === "Under service" ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft"}`}
        >
          Under service ({underServiceCount})
        </button>
      </div>

      {equipment.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={rows} rowKey={(row) => row.id} emptyMessage="No equipment recorded yet." hoverableRows />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit equipment" : "Add equipment"}
        subtitle={editing ? "Updates this entry in the equipment register" : "Adds an item to the medical centre equipment register"}
      >
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Equipment name</label>
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Nebuliser" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Quantity</label>
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Location</label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Dressing room" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Condition</label>
            <Select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as ConditionValue }))}>
              <option value="working">Working</option>
              <option value="under_service">Under service</option>
            </Select>
          </div>
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{error}</div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!form.name || saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add equipment"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting != null}
        title="Delete this equipment?"
        description={deleting ? `${deleting.name} will be removed from the register.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
