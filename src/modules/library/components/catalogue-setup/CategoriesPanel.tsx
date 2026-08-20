"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import {
  PageHeader,
  Button,
  Input,
  DataTable,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useCategories, useDeleteCategory, type BookCategory } from "@/modules/library/api/categories";
import { CategoryFormModal } from "@/modules/library/components/catalogue-setup/CategoryFormModal";

export function CategoriesPanel() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [formTarget, setFormTarget] = useState<BookCategory | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookCategory | null>(null);
  const { show } = useToast();

  const { data, isLoading, error } = useCategories(debouncedQuery || undefined);
  const deleteCategory = useDeleteCategory();

  const columns: DataTableColumn<BookCategory>[] = [
    { key: "name", header: "Category", render: (row) => row.name },
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

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Category deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Subject categories used to classify books and eBooks."
        actions={
          <Button variant="primary" onClick={() => setFormTarget("new")}>
            <Icon name="add" size={16} /> Add category
          </Button>
        }
      />

      <div className="mt-5 mb-4 max-w-sm">
        <Input leadingIcon="search" placeholder="Search categories" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load categories." : null}
        emptyTitle="No categories yet"
      />

      <CategoryFormModal
        open={formTarget !== null}
        category={formTarget === "new" ? null : formTarget}
        onClose={() => setFormTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete category"
        message={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteCategory.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
