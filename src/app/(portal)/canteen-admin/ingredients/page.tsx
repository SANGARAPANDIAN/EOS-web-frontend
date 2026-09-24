"use client";

import { useMemo, useState } from "react";
import { Button, Card, StatCard, Badge, SearchBar, Modal, ConfirmDialog, Input, DataTable, EmptyState, type BadgeTone } from "@/components/ui";
import { SkeletonStatTiles } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import {
  useCanteenIngredients,
  useCreateIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
  type CanteenIngredient,
  type IngredientStatus,
} from "@/modules/canteen-admin/api/ingredients";

function money(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const STATUS_LABEL: Record<IngredientStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};
const STATUS_TONE: Record<IngredientStatus, BadgeTone> = {
  in_stock: "accent",
  low_stock: "neutral",
  out_of_stock: "danger",
};

interface FormState {
  name: string;
  stock_quantity: string;
  price_per_unit: string;
  threshold: string;
}

const EMPTY_FORM: FormState = { name: "", stock_quantity: "", price_per_unit: "", threshold: "" };

function toFormState(row: CanteenIngredient): FormState {
  return {
    name: row.name,
    stock_quantity: String(row.stock_quantity),
    price_per_unit: String(row.price_per_unit),
    threshold: String(row.threshold),
  };
}

export default function CanteenIngredientsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useCanteenIngredients(search || undefined);
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CanteenIngredient | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CanteenIngredient | null>(null);

  const isSaving = createIngredient.isPending || updateIngredient.isPending;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: CanteenIngredient) {
    setEditing(row);
    setForm(toFormState(row));
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    const name = form.name.trim();
    const pricePerUnit = Number(form.price_per_unit);
    const stockQuantity = form.stock_quantity === "" ? undefined : Number(form.stock_quantity);
    const threshold = form.threshold === "" ? undefined : Number(form.threshold);

    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (form.price_per_unit === "" || Number.isNaN(pricePerUnit) || pricePerUnit < 0) {
      setFormError("Enter a valid price per unit.");
      return;
    }

    try {
      if (editing) {
        await updateIngredient.mutateAsync({
          id: editing.id,
          input: { name, price_per_unit: pricePerUnit, stock_quantity: stockQuantity, threshold },
        });
      } else {
        await createIngredient.mutateAsync({ name, price_per_unit: pricePerUnit, stock_quantity: stockQuantity, threshold });
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteIngredient.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteTarget(null);
      alert(err instanceof ApiError ? err.message : "Could not delete this ingredient.");
    }
  }

  const columns = useMemo(
    () => [
      { key: "name", header: "Ingredient", width: "1.6fr", render: (row: CanteenIngredient) => <span className="font-semibold text-ink">{row.name}</span>, sortValue: (row: CanteenIngredient) => row.name },
      { key: "stock", header: "Stock", width: "1fr", render: (row: CanteenIngredient) => row.stock_quantity, sortValue: (row: CanteenIngredient) => row.stock_quantity },
      { key: "threshold", header: "Threshold", width: "1fr", render: (row: CanteenIngredient) => row.threshold },
      { key: "price", header: "Price / Unit", width: "1fr", render: (row: CanteenIngredient) => money(row.price_per_unit) },
      { key: "value", header: "Value", width: "1fr", render: (row: CanteenIngredient) => money(row.value), sortValue: (row: CanteenIngredient) => row.value },
      { key: "status", header: "Status", width: "1.1fr", render: (row: CanteenIngredient) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
      {
        key: "actions",
        header: "",
        width: "110px",
        align: "right" as const,
        render: (row: CanteenIngredient) => (
          <div className="flex justify-end gap-3">
            <button type="button" className="text-[12.5px] font-bold text-primary hover:text-primary-dark" onClick={() => openEdit(row)}>
              Edit
            </button>
            <button type="button" className="text-[12.5px] font-bold text-danger-fg hover:opacity-80" onClick={() => setDeleteTarget(row)}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Ingredients</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted">Track stock levels and inventory value.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={openCreate}>
          + Add Ingredient
        </Button>
      </div>

      {isLoading && !data ? (
        <SkeletonStatTiles count={4} />
      ) : (
        data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Total Items" value={data.summary.total_items} icon="inventory_2" />
            <StatCard label="Low Stock" value={data.summary.low_stock} icon="warning" />
            <StatCard label="Out of Stock" value={data.summary.out_of_stock} icon="error" />
            <StatCard label="Total Value" value={money(data.summary.total_value)} icon="payments" />
          </div>
        )
      )}

      <Card className="p-0">
        <div className="border-b border-border-default p-4">
          <SearchBar placeholder="Search ingredients…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {error ? (
          <EmptyState message={error instanceof Error ? error.message : "Could not load ingredients."} />
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyMessage={search ? "No ingredients match your search." : "No ingredients yet — add your first one."}
            hoverableRows
          />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Ingredient" : "Add Ingredient"}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Name</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Rice" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Stock Quantity</label>
              <Input type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Low-Stock Threshold</label>
              <Input type="number" min={0} value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Price per Unit (₹)</label>
            <Input type="number" min={0} step="0.01" value={form.price_per_unit} onChange={(e) => setForm((f) => ({ ...f, price_per_unit: e.target.value }))} placeholder="0.00" />
          </div>
          {formError && <p className="text-[12.5px] font-semibold text-danger-fg">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2.5">
            <Button variant="secondary" className="w-auto" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primarySmall" className="w-auto" loading={isSaving} onClick={handleSave}>
              {editing ? "Save Changes" : "Add Ingredient"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This can't be undone. If it's used in a recipe, remove it from the recipe first."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
