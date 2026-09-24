"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import { PageHeader, Button, Input, Select, DataTable, ConfirmDialog, useToast, type DataTableColumn } from "@/modules/admin/components/ui";
import {
  CATEGORY_NAME,
  STATIONERY_CATEGORIES,
  useStationeryProducts,
  useSetStationeryProductActive,
  useDeleteStationeryProduct,
  type StationeryProduct,
} from "@/modules/stationery-store/api/products";
import { ProductFormModal } from "@/modules/stationery-store/components/ProductFormModal";

export default function StationeryProductsPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formTarget, setFormTarget] = useState<StationeryProduct | "new" | null>(null);
  const [toggleTarget, setToggleTarget] = useState<StationeryProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StationeryProduct | null>(null);
  const { show } = useToast();

  const { data: products, isLoading, error } = useStationeryProducts();
  const setActive = useSetStationeryProductActive();
  const deleteProduct = useDeleteStationeryProduct();

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = debouncedQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;
      return true;
    });
  }, [products, debouncedQuery, categoryFilter, statusFilter]);

  const columns: DataTableColumn<StationeryProduct>[] = [
    {
      key: "name",
      header: "Product",
      render: (row) => (
        <div>
          <p className="font-semibold text-admin-ink">{row.name}</p>
          <p className="text-xs text-admin-muted">₹{row.price}{row.original_price ? ` (was ₹${row.original_price})` : ""}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (row) => CATEGORY_NAME[row.category] },
    { key: "price", header: "Price", align: "right", render: (row) => `₹${row.price}` },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      render: (row) => (
        <span className={row.stock_quantity <= row.low_stock_threshold ? "font-bold text-admin-primary" : "font-semibold text-admin-ink"}>
          {row.stock_quantity}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span
          className={
            row.is_active
              ? "rounded-admin-pill bg-admin-tint-strong px-2.5 py-1 text-xs font-semibold text-admin-primary-deep"
              : "rounded-admin-pill bg-admin-tint px-2.5 py-1 text-xs font-semibold text-admin-muted"
          }
        >
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setFormTarget(row)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
            aria-label={`Edit ${row.name}`}
          >
            <Icon name="edit" size={17} />
          </button>
          <button
            type="button"
            onClick={() => setToggleTarget(row)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-primary"
            aria-label={row.is_active ? `Deactivate ${row.name}` : `Activate ${row.name}`}
          >
            <Icon name={row.is_active ? "visibility_off" : "visibility"} size={17} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-danger-bg hover:text-admin-danger"
            aria-label={`Delete ${row.name}`}
          >
            <Icon name="delete" size={17} />
          </button>
        </div>
      ),
    },
  ];

  function handleToggleConfirm() {
    if (!toggleTarget) return;
    setActive.mutate(
      { id: toggleTarget.id, active: !toggleTarget.is_active },
      {
        onSuccess: () => {
          show(toggleTarget.is_active ? "Product deactivated." : "Product activated.", "success");
          setToggleTarget(null);
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Product deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description={products ? `${products.length} products across 5 categories` : "Every item in the store's catalogue"}
        actions={
          <Button variant="primary" onClick={() => setFormTarget("new")}>
            <Icon name="add" size={16} /> Add product
          </Button>
        }
      />

      <div className="mt-5 mb-4 flex flex-wrap gap-3">
        <div className="min-w-[220px] max-w-sm flex-1">
          <Input leadingIcon="search" placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
          <option value="all">All categories</option>
          {STATIONERY_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load products." : null}
        emptyTitle="No products match your filters"
      />

      <ProductFormModal open={formTarget !== null} product={formTarget === "new" ? null : formTarget} onClose={() => setFormTarget(null)} />

      <ConfirmDialog
        open={toggleTarget !== null}
        title={toggleTarget?.is_active ? "Deactivate product" : "Activate product"}
        message={
          toggleTarget?.is_active
            ? `Hide "${toggleTarget?.name}" from students? It stays in past orders.`
            : `Make "${toggleTarget?.name}" visible to students again?`
        }
        confirmLabel={toggleTarget?.is_active ? "Deactivate" : "Activate"}
        isConfirming={setActive.isPending}
        onConfirm={handleToggleConfirm}
        onClose={() => setToggleTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete product"
        message={`Permanently delete "${deleteTarget?.name}"? This can't be undone. Products with order history can't be deleted — deactivate those instead.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteProduct.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
