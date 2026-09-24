"use client";

import { useState } from "react";
import { Button, Card, Badge, SearchBar, Modal, ConfirmDialog, Input, Select, Toggle, PillTabs, EmptyState, Icon } from "@/components/ui";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import {
  useDishCategories,
  useCreateDishCategory,
  useDishes,
  useCreateDish,
  useUpdateDish,
  useDeleteDish,
  type CanteenDish,
} from "@/modules/canteen-admin/api/dishes";

function money(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

interface FormState {
  name: string;
  category_id: string;
  price: string;
  stock_quantity: string;
  is_veg: boolean;
  is_available: boolean;
  parcel_available: boolean;
}

const EMPTY_FORM: FormState = { name: "", category_id: "", price: "", stock_quantity: "", is_veg: true, is_available: true, parcel_available: true };

function toFormState(row: CanteenDish): FormState {
  return {
    name: row.name,
    category_id: row.category ? String(row.category.id) : "",
    price: String(row.price),
    stock_quantity: String(row.stock_quantity),
    is_veg: row.is_veg,
    is_available: row.is_available,
    parcel_available: row.parcel_available,
  };
}

export default function CanteenDishesPage() {
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data: categories } = useDishCategories();
  const { data: dishes, isLoading, error } = useDishes(categoryId, search || undefined);
  const createDish = useCreateDish();
  const updateDish = useUpdateDish();
  const deleteDish = useDeleteDish();
  const createCategory = useCreateDishCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CanteenDish | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CanteenDish | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const isSaving = createDish.isPending || updateDish.isPending;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(undefined);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: CanteenDish) {
    setEditing(row);
    setForm(toFormState(row));
    setImageFile(undefined);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    const name = form.name.trim();
    const price = Number(form.price);
    const stockQuantity = form.stock_quantity === "" ? undefined : Number(form.stock_quantity);
    const categoryIdNum = form.category_id === "" ? undefined : Number(form.category_id);

    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (form.price === "" || Number.isNaN(price) || price <= 0) {
      setFormError("Enter a valid price.");
      return;
    }

    const input = {
      name,
      price,
      category_id: categoryIdNum,
      stock_quantity: stockQuantity,
      is_veg: form.is_veg,
      is_available: form.is_available,
      parcel_available: form.parcel_available,
      image: imageFile,
    };

    try {
      if (editing) {
        await updateDish.mutateAsync({ id: editing.id, input });
      } else {
        await createDish.mutateAsync(input);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDish.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteTarget(null);
      alert(err instanceof ApiError ? err.message : "Could not delete this dish.");
    }
  }

  async function handleCreateCategory() {
    setCategoryError(null);
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Category name is required.");
      return;
    }
    try {
      await createCategory.mutateAsync(name);
      setNewCategoryName("");
      setCategoryModalOpen(false);
    } catch (err) {
      setCategoryError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Dishes</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted">Manage the menu — pricing, stock and availability.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" className="w-auto" onClick={() => setCategoryModalOpen(true)}>
            + Category
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={openCreate}>
            + Add Dish
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[320px]" />
        <Select
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-auto max-w-[220px]"
        >
          <option value="">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.dish_count})
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <Card>
          <EmptyState message={error instanceof Error ? error.message : "Could not load dishes."} />
        </Card>
      ) : isLoading && !dishes ? (
        <SkeletonCardGrid count={6} columns={3} />
      ) : !dishes || dishes.length === 0 ? (
        <Card>
          <EmptyState message={search || categoryId ? "No dishes match your filters." : "No dishes yet — add your first one."} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dishes.map((dish) => (
            <Card key={dish.id} className="flex flex-col gap-3 p-4">
              <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-[10px] bg-surface-input">
                {dish.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- storage domain isn't in next.config's image allowlist, same pattern as ProfilePhoto
                  <img src={dish.image_url} alt={dish.name} className="size-full object-cover" />
                ) : (
                  <Icon name="restaurant" size={36} className="text-subtle" />
                )}
                {!dish.is_available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="rounded-pill bg-white px-2.5 py-1 text-[11px] font-extrabold text-ink">Unavailable</span>
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[14.5px] font-bold text-ink">{dish.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted">{dish.category?.name ?? "Uncategorized"}</div>
                </div>
                <Badge tone={dish.is_veg ? "accent" : "danger"}>{dish.is_veg ? "Veg" : "Non-Veg"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-extrabold text-ink">{money(dish.price)}</span>
                <span className="text-[12.5px] text-muted">Stock: {dish.stock_quantity}</span>
              </div>
              {!dish.parcel_available && <Badge tone="neutral">No parcel</Badge>}
              <div className="flex items-center justify-between border-t border-border-default pt-3">
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={dish.is_available}
                    onChange={(checked) =>
                      updateDish.mutate({
                        id: dish.id,
                        input: {
                          name: dish.name,
                          category_id: dish.category?.id,
                          price: dish.price,
                          stock_quantity: dish.stock_quantity,
                          is_veg: dish.is_veg,
                          is_available: checked,
                          parcel_available: dish.parcel_available,
                        },
                      })
                    }
                  />
                  <span className="text-[12px] font-semibold text-muted">Available</span>
                </div>
                <div className="flex gap-3">
                  <button type="button" className="text-[12.5px] font-bold text-primary hover:text-primary-dark" onClick={() => openEdit(dish)}>
                    Edit
                  </button>
                  <button type="button" className="text-[12.5px] font-bold text-danger-fg hover:opacity-80" onClick={() => setDeleteTarget(dish)}>
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Dish" : "Add Dish"}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Name</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Veg Fried Rice" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Category</label>
              <Select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                <option value="">Uncategorized</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Price (₹)</label>
              <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Stock Quantity</label>
              <Input type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Dish Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0])}
                className="w-full text-[12.5px] text-muted file:mr-3 file:rounded-[8px] file:border-0 file:bg-icon-chip file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-primary"
              />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Type</label>
              <PillTabs
                options={[
                  { key: "veg", label: "Veg" },
                  { key: "nonveg", label: "Non-Veg" },
                ]}
                value={form.is_veg ? "veg" : "nonveg"}
                onChange={(key) => setForm((f) => ({ ...f, is_veg: key === "veg" }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Availability</label>
              <PillTabs
                options={[
                  { key: "available", label: "Available" },
                  { key: "unavailable", label: "Unavailable" },
                ]}
                value={form.is_available ? "available" : "unavailable"}
                onChange={(key) => setForm((f) => ({ ...f, is_available: key === "available" }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Parcel</label>
              <PillTabs
                options={[
                  { key: "yes", label: "Available as parcel" },
                  { key: "no", label: "Not available as parcel" },
                ]}
                value={form.parcel_available ? "yes" : "no"}
                onChange={(key) => setForm((f) => ({ ...f, parcel_available: key === "yes" }))}
              />
            </div>
          </div>
          {formError && <p className="text-[12.5px] font-semibold text-danger-fg">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2.5">
            <Button variant="secondary" className="w-auto" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primarySmall" className="w-auto" loading={isSaving} onClick={handleSave}>
              {editing ? "Save Changes" : "Add Dish"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="New Category">
        <div className="flex flex-col gap-4">
          <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Beverages" />
          {categoryError && <p className="text-[12.5px] font-semibold text-danger-fg">{categoryError}</p>}
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" className="w-auto" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primarySmall" className="w-auto" loading={createCategory.isPending} onClick={handleCreateCategory}>
              Add Category
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This can't be undone. If it has a recipe linked to it, remove the recipe first."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
