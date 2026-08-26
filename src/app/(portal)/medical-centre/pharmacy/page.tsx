"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Input, Modal, DataTable, EmptyState, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  usePharmacyStock,
  useDispenseStock,
  useRestockStock,
  useCreateStockItem,
  useUpdateStockItem,
  useDeleteStockItem,
  type StockItem,
} from "@/modules/medical-centre/api/pharmacy";
import { ApiError } from "@/types/api";

const EXPIRY_CHIPS = [
  { key: "all", label: "All items" },
  { key: "low", label: "Below reorder" },
  { key: "2026", label: "Expiry in 2026" },
  { key: "2027", label: "Expiry in 2027" },
  { key: "noexp", label: "No expiry" },
];

function stockTone(item: StockItem): BadgeTone {
  if (item.qty === 0) return "danger";
  if (item.qty <= item.reorder) return "accentDark";
  return "accent";
}

function stockLabel(item: StockItem): string {
  if (item.qty === 0) return "Out of stock";
  if (item.qty <= item.reorder) return "Below reorder";
  return "In stock";
}

export default function PharmacyStockPage() {
  const stock = usePharmacyStock();
  const dispense = useDispenseStock();
  const restock = useRestockStock();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const createItem = useCreateStockItem();
  const updateItem = useUpdateStockItem();
  const deleteItem = useDeleteStockItem();

  // One modal for both add and edit: null = adding, a row = editing it.
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<StockItem | null>(null);
  const [form, setForm] = useState({ name: "", use_case: "", form: "", quantity: "", reorder_level: "", expiry_date: "", rate: "" });
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", use_case: "", form: "", quantity: "", reorder_level: "", expiry_date: "", rate: "" });
    setError(null);
    setOpen(true);
  }

  function openEdit(row: StockItem) {
    setEditing(row);
    // The list uses short display names; the write endpoints use the column
    // names, so the mapping happens here where both are visible.
    setForm({
      name: row.name,
      use_case: row.use ?? "",
      form: row.form ?? "",
      quantity: String(row.qty ?? ""),
      reorder_level: String(row.reorder ?? ""),
      expiry_date: row.expiry ?? "",
      rate: String(row.rate ?? ""),
    });
    setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      use_case: form.use_case || undefined,
      form: form.form || undefined,
      quantity: form.quantity === "" ? undefined : Number(form.quantity),
      reorder_level: form.reorder_level === "" ? undefined : Number(form.reorder_level),
      expiry_date: form.expiry_date || undefined,
      rate: form.rate === "" ? undefined : Number(form.rate),
    };
    try {
      if (editing) await updateItem.mutateAsync({ id: editing.id, ...payload });
      else await createItem.mutateAsync(payload);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this medicine.");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setRowError(null);
    try {
      await deleteItem.mutateAsync(deleting.id);
    } catch (err) {
      // A dispensed medicine is intentionally undeletable; the server says so.
      setRowError(err instanceof ApiError ? err.message : "Could not delete this medicine.");
    } finally {
      setDeleting(null);
    }
  }

  const saving = editing ? updateItem.isPending : createItem.isPending;

  const data = stock.data ?? [];
  const lowCount = data.filter((s) => s.qty <= s.reorder).length;

  const filtered = useMemo(() => {
    return data.filter((s) => {
      if (query && !`${s.name} ${s.use} ${s.form}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter === "low" && s.qty > s.reorder) return false;
      if (filter === "2026" && (!s.expiry || !s.expiry.startsWith("2026"))) return false;
      if (filter === "2027" && (!s.expiry || !s.expiry.startsWith("2027"))) return false;
      if (filter === "noexp" && s.expiry) return false;
      return true;
    });
  }, [data, query, filter]);

  const columns: DataTableColumn<StockItem>[] = [
    {
      key: "name",
      header: "Medicine",
      width: "1.6fr",
      render: (row) => (
        <div>
          <div className="font-bold text-ink">{row.name}</div>
          <div className="text-[12px] text-subtle">{row.use}</div>
        </div>
      ),
    },
    { key: "form", header: "Form", width: "1.2fr", render: (row) => <span className="text-body">{row.form}</span> },
    {
      key: "qty",
      header: "In stock",
      width: "1fr",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-ink">{row.qty}</span>
          <div className="mt-0.5">
            <Badge tone={stockTone(row)}>{stockLabel(row)}</Badge>
          </div>
        </div>
      ),
    },
    { key: "reorder", header: "Reorder at", width: "0.9fr", render: (row) => <span className="font-mono text-body">{row.reorder}</span> },
    { key: "expiry", header: "Expiry", width: "1fr", render: (row) => <span className="font-mono text-[12.5px] text-body">{row.expiry ?? "No expiry"}</span> },
    {
      key: "action",
      header: "Action",
      width: "1.5fr",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dispense.mutate({ id: row.id, quantity: 1 })}
            disabled={row.qty === 0 || dispense.isPending}
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
          >
            Dispense
          </button>
          <button
            type="button"
            onClick={() => restock.mutate({ id: row.id, quantity: 50 })}
            disabled={restock.isPending}
            className="text-[12.5px] font-bold text-subtle hover:text-ink"
          >
            Restock 50
          </button>
          <button type="button" onClick={() => openEdit(row)} className="text-[12.5px] font-bold text-body hover:text-primary">
            Edit
          </button>
          <button type="button" onClick={() => setDeleting(row)} className="text-[12.5px] font-bold text-muted hover:text-danger-fg">
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
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Pharmacy stock</h1>
          <p className="mt-1 text-[13px] text-muted">Counter held by Mr. P. Selvaraj · indent raised to the purchase office every Monday.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={openAdd}>
          Add medicine
        </Button>
      </div>

      {rowError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {rowError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-border-default bg-surface p-[16px_18px]">
        <Input className="min-w-[220px] flex-1" placeholder="Search by name, use or form" value={query} onChange={(e) => setQuery(e.target.value)} />
        {EXPIRY_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={`shrink-0 rounded-pill border px-3.5 py-2 text-[12.5px] font-bold ${
              filter === c.key ? "border-primary bg-accent-50 text-primary" : "border-border-default text-ink-soft"
            }`}
          >
            {c.label} {c.key === "low" ? `(${lowCount})` : ""}
          </button>
        ))}
      </div>

      {stock.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} emptyMessage="No medicines recorded yet." hoverableRows />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit medicine" : "Add medicine"}
        subtitle={editing ? "Corrects this stock line. Dispensing and restocking stay on their own buttons." : "Adds a new medicine to the pharmacy stock list"}
      >
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Name</label>
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Paracetamol 500mg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Used for</label>
              <Input value={form.use_case} onChange={(e) => setForm((f) => ({ ...f, use_case: e.target.value }))} placeholder="e.g. Fever" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Form</label>
              <Input value={form.form} onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))} placeholder="e.g. Tablet" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Quantity</label>
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Reorder at</label>
              <Input type="number" min="0" value={form.reorder_level} onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Rate (Rs.)</label>
              <Input type="number" min="0" step="0.01" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Expiry date</label>
            <Input type="date" value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
          </div>
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{error}</div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!form.name || saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add medicine"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting != null}
        title="Delete this medicine?"
        description={deleting ? `${deleting.name} will be removed from the stock list.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
