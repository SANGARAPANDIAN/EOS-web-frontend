"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Icon, Input, Select, type BadgeTone } from "@/components/ui";
import {
  useEquipment,
  useEquipmentDetail,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  type Equipment,
  type EquipmentCategory,
  type EquipmentCondition,
  type EquipmentStatus,
} from "@/modules/media-room/api/equipment";
import { formatDisplayDate, formatDayAndTime } from "@/lib/utils/date";

const STATUS_TONE: Record<EquipmentStatus, BadgeTone> = {
  available: "accent",
  checked_out: "accentDark",
  in_service: "neutral",
  retired: "danger",
};

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  available: "Available",
  checked_out: "Checked out",
  in_service: "In service",
  retired: "Retired",
};

const CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  camera: "Camera",
  lens: "Lens",
  support: "Support",
  audio: "Audio",
  lighting: "Lighting",
  aerial: "Aerial",
};

const CONDITION_LABEL: Record<string, string> = { good: "Good", fair: "Fair", needs_repair: "Needs repair" };

function money(value: string | null): string {
  if (!value) return "—";
  const n = Number(value);
  return `₹${n.toLocaleString("en-IN")}`;
}

function AddEquipmentModal({ onClose }: { onClose: () => void }) {
  const create = useCreateEquipment();
  const [assetTag, setAssetTag] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<EquipmentCategory>("camera");
  const [serialNo, setSerialNo] = useState("");
  const [invoiceValue, setInvoiceValue] = useState("");
  const [warrantyTill, setWarrantyTill] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Equipment name is required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        asset_tag: assetTag.trim() || undefined,
        name: name.trim(),
        category,
        serial_no: serialNo.trim() || undefined,
        invoice_value: invoiceValue ? Number(invoiceValue) : undefined,
        warranty_till: warrantyTill || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not add this asset.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[520px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">Add asset to the register</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3.5 px-[26px] py-[22px]">
          <Input placeholder="Asset tag (e.g. MR-CAM-015)" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} />
          <Select value={category} onChange={(e) => setCategory(e.target.value as EquipmentCategory)}>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input className="col-span-2" placeholder="Equipment (e.g. Sony FX30 cinema camera)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Serial number" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
          <Input placeholder="Invoice value (₹)" type="number" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} />
          <div className="col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Warranty till</label>
            <Input className="mt-1.5" type="date" value={warrantyTill} onChange={(e) => setWarrantyTill(e.target.value)} />
          </div>
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add asset"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Edits the asset record itself — its identity and purchase fields. Status is
 * deliberately absent: it moves through the Issue / Send to service / Mark
 * returned actions, which also write a movement note, so editing it here would
 * leave the movement history lying about where the asset went.
 */
function EditEquipmentModal({ item, onClose }: { item: Equipment; onClose: () => void }) {
  const update = useUpdateEquipment();
  const [assetTag, setAssetTag] = useState(item.asset_tag ?? "");
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<EquipmentCategory>(item.category);
  const [serialNo, setSerialNo] = useState(item.serial_no ?? "");
  const [condition, setCondition] = useState<EquipmentCondition>(item.condition);
  const [purchasedOn, setPurchasedOn] = useState(item.purchased_on ? item.purchased_on.slice(0, 10) : "");
  const [invoiceValue, setInvoiceValue] = useState(item.invoice_value ?? "");
  const [warrantyTill, setWarrantyTill] = useState(item.warranty_till ? item.warranty_till.slice(0, 10) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Equipment name is required.");
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({
        id: item.id,
        name: name.trim(),
        category,
        condition,
        // Cleared fields go as undefined rather than "" so the column stays
        // null instead of holding an empty string.
        asset_tag: assetTag.trim() || undefined,
        serial_no: serialNo.trim() || undefined,
        purchased_on: purchasedOn || undefined,
        invoice_value: invoiceValue !== "" ? Number(invoiceValue) : undefined,
        warranty_till: warrantyTill || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this asset.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Edit asset</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{item.asset_tag ?? item.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body"
          >
            &#10005;
          </button>
        </div>

        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Asset tag</label>
              <Input className="mt-1.5" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Serial no</label>
              <Input className="mt-1.5" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Name</label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Category</label>
              <Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value as EquipmentCategory)}>
                {(Object.keys(CATEGORY_LABEL) as EquipmentCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Condition</label>
              <Select className="mt-1.5" value={condition} onChange={(e) => setCondition(e.target.value as EquipmentCondition)}>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs_repair">Needs repair</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Purchased on</label>
              <Input className="mt-1.5" type="date" value={purchasedOn} onChange={(e) => setPurchasedOn(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Invoice value</label>
              <Input className="mt-1.5" type="number" min="0" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Warranty till</label>
              <Input className="mt-1.5" type="date" value={warrantyTill} onChange={(e) => setWarrantyTill(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Notes</label>
            <Input className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AssetRow({ item }: { item: Equipment }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detail = useEquipmentDetail(open ? item.id : null);
  const update = useUpdateEquipment();
  const remove = useDeleteEquipment();

  function issue() {
    const holder = window.prompt("Issue to (name):");
    if (holder) update.mutate({ id: item.id, status: "checked_out", checked_out_to: holder });
  }

  function sendToService() {
    update.mutate({ id: item.id, status: "in_service" });
  }

  function markReturned() {
    update.mutate({ id: item.id, status: "available" });
  }

  return (
    <div>
      <div
        onClick={() => setOpen((v) => !v)}
        className="grid cursor-pointer grid-cols-[1.1fr_1.7fr_1fr_1.2fr_1fr_0.9fr] items-center gap-4 border-b border-divider px-[26px] py-[16px] hover:bg-surface-tint"
      >
        <span className="font-mono text-[13.5px] font-semibold text-primary">{item.asset_tag ?? "—"}</span>
        <div>
          <div className="text-[15px] font-bold text-ink">{item.name}</div>
          <div className="text-[12.5px] text-muted">{item.serial_no ?? "No serial"}</div>
        </div>
        <span className="text-[13.5px] text-body">{CATEGORY_LABEL[item.category]}</span>
        <span className="text-[13.5px] text-body">{item.checked_out_to ?? "Media room"}</span>
        <span className="text-[13.5px] text-body">{CONDITION_LABEL[item.condition] ?? item.condition}</span>
        <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
      </div>
      {open && (
        <div className="border-b border-divider bg-surface-tint px-[26px] py-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Asset details</div>
              <div className="mt-3 flex flex-col gap-2 text-[13.5px]">
                <div className="flex justify-between">
                  <span className="text-muted">Purchased</span>
                  <span className="font-bold text-ink">{item.purchased_on ? formatDisplayDate(item.purchased_on) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Invoice value</span>
                  <span className="font-bold text-ink">{money(item.invoice_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Warranty till</span>
                  <span className="font-bold text-ink">{item.warranty_till ? formatDisplayDate(item.warranty_till) : "—"}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {item.status === "available" && (
                  <button type="button" onClick={issue} className="rounded-[8px] border border-border-default px-3 py-2 text-[13px] font-bold text-body hover:bg-surface">
                    Issue
                  </button>
                )}
                {item.status !== "in_service" && (
                  <button type="button" onClick={sendToService} className="rounded-[8px] border border-border-default px-3 py-2 text-[13px] font-bold text-body hover:bg-surface">
                    Send to service
                  </button>
                )}
                {item.status !== "available" && (
                  <button type="button" onClick={markReturned} className="rounded-[8px] border border-border-default px-3 py-2 text-[13px] font-bold text-body hover:bg-surface">
                    Mark returned
                  </button>
                )}

                {/* Editing the record and removing the asset sit apart from the
                    status actions above: they change the asset itself, not
                    where it currently is. */}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] border border-border-default px-3 py-2 text-[13px] font-bold text-body hover:bg-surface"
                >
                  <Icon name="edit" size={15} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-border-default px-3 py-2 text-[13px] font-bold text-danger-fg hover:bg-surface"
                >
                  <Icon name="delete" size={15} />
                  Delete
                </button>
              </div>
              {error && <div className="mt-2 text-[12.5px] font-semibold text-danger-fg">{error}</div>}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Movement history</div>
              <div className="mt-2.5 flex flex-col">
                {detail.isLoading ? (
                  <span className="py-2 text-[13px] text-muted">Loading…</span>
                ) : !detail.data || detail.data.movements.length === 0 ? (
                  <span className="py-2 text-[13px] text-muted">No movements logged yet.</span>
                ) : (
                  detail.data.movements.map((m) => (
                    <div key={m.id} className="flex gap-3 border-b border-border-default py-2.5 last:border-0">
                      <span className="w-[130px] shrink-0 font-mono text-[12px] text-subtle">{formatDayAndTime(m.moved_at)}</span>
                      <span className="text-[13.5px] text-ink">{m.note}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && <EditEquipmentModal item={item} onClose={() => setEditing(false)} />}

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title="Delete this asset?"
        description={`${item.asset_tag ? item.asset_tag + " · " : ""}${item.name} will be removed from the inventory permanently, along with its movement history.`}
        confirmLabel={remove.isPending ? "Deleting…" : "Delete asset"}
        onConfirm={() => {
          setError(null);
          remove.mutate(item.id, {
            onSuccess: () => setConfirmDelete(false),
            onError: (err: unknown) => {
              // The API refuses while an asset is still checked out or is
              // referenced by an indent, and says which, so show it verbatim.
              setError((err as { message?: string })?.message ?? "Could not delete this asset.");
              setConfirmDelete(false);
            },
          });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default function InventoryPage() {
  const equipment = useEquipment();
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EquipmentStatus>("all");

  const notReady = equipment.data && !equipment.data.ready;
  const allRows = equipment.data?.data ?? [];
  const rows = allRows
    .filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))
    .filter((r) => (query.trim() ? `${r.name} ${r.category} ${r.serial_no ?? ""} ${r.asset_tag ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()) : true));

  const totalValue = allRows.reduce((sum, r) => sum + (r.invoice_value ? Number(r.invoice_value) : 0), 0);
  const availableCount = allRows.filter((r) => r.status === "available").length;
  const checkedOutCount = allRows.filter((r) => r.status === "checked_out").length;
  const inServiceCount = allRows.filter((r) => r.status === "in_service").length;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Inventory</h1>
          <p className="mt-1 text-[13px] text-muted">Cameras, lenses, audio and lighting equipment register · issue, return and service history per unit.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)} disabled={!!notReady}>
          + Add asset
        </Button>
      </div>

      {showAdd && <AddEquipmentModal onClose={() => setShowAdd(false)} />}

      {notReady ? (
        <EmptyState message="The equipment register isn't set up yet — ask an admin to run the pending database migration." />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-[18px_20px]">
              <div className="text-[13px] font-bold text-muted">Total assets</div>
              <div className="mt-2 text-[28px] font-extrabold text-ink">{allRows.length}</div>
              <div className="mt-1 text-[12px] text-subtle">book value {money(totalValue.toString())}</div>
            </div>
            <div data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-[18px_20px]">
              <div className="text-[13px] font-bold text-muted">Available</div>
              <div className="mt-2 text-[28px] font-extrabold text-primary">{availableCount}</div>
              <div className="mt-1 text-[12px] text-subtle">ready to issue</div>
            </div>
            <div data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-[18px_20px]">
              <div className="text-[13px] font-bold text-muted">Issued out</div>
              <div className="mt-2 text-[28px] font-extrabold text-primary">{checkedOutCount}</div>
              <div className="mt-1 text-[12px] text-subtle">currently with crew</div>
            </div>
            <div data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-[18px_20px]">
              <div className="text-[13px] font-bold text-muted">In service</div>
              <div className="mt-2 text-[28px] font-extrabold text-ink">{inServiceCount}</div>
              <div className="mt-1 text-[12px] text-subtle">under repair</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Input className="min-w-[240px] max-w-[360px]" placeholder="Search name, category, tag or serial no." value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select className="w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | EquipmentStatus)}>
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="checked_out">Checked out</option>
              <option value="in_service">In service</option>
              <option value="retired">Retired</option>
            </Select>
            <span className="ml-auto text-[13px] text-muted">{rows.length} of {allRows.length} assets</span>
          </div>

          {equipment.isLoading ? (
            <EmptyState message="Loading…" />
          ) : rows.length === 0 ? (
            <EmptyState message="No equipment matches this view." />
          ) : (
            <Card data-mr-lift="1" className="overflow-hidden p-0">
              <div className="grid grid-cols-[1.1fr_1.7fr_1fr_1.2fr_1fr_0.9fr] gap-4 border-b border-divider bg-surface-tint px-[26px] py-3">
                {["Asset tag", "Equipment", "Category", "Holder / location", "Condition", "Status"].map((h) => (
                  <span key={h} className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">
                    {h}
                  </span>
                ))}
              </div>
              {rows.map((item) => (
                <AssetRow key={item.id} item={item} />
              ))}
              <div className="flex items-center justify-center gap-1.5 px-[26px] py-3 text-[12px] text-subtle">
                <Icon name="info" size={13} />
                Click a row to see purchase details and movement history.
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
