"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import {
  PageHeader,
  Button,
  Input,
  Select,
  SegmentedPillToggle,
  Badge,
  DataTable,
  NumberedPagination,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useCategories } from "@/modules/library/api/categories";
import { useEResources, useDeleteEResource, type EResource, type EResourcePublishState } from "@/modules/library/api/eResources";
import { EResourceFormModal } from "@/modules/library/components/ebooks/EResourceFormModal";

const DEFAULT_PAGE_SIZE = 20;
type PublishFilter = "all" | EResourcePublishState;

export default function EBooksPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [formTarget, setFormTarget] = useState<EResource | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EResource | null>(null);
  const { show } = useToast();

  const { data: categories } = useCategories();
  const { data, isLoading, error } = useEResources({
    q: debouncedQuery || undefined,
    category_id: categoryId,
    publish_state: publishFilter === "all" ? undefined : publishFilter,
    page,
    page_size: pageSize,
  });
  const deleteResource = useDeleteEResource();

  const columns: DataTableColumn<EResource>[] = [
    { key: "title", header: "eBook", render: (row) => <span className="font-semibold text-admin-ink">{row.title}</span> },
    { key: "format", header: "Format", render: (row) => row.format ?? "—" },
    {
      key: "file_size_bytes",
      header: "Size",
      render: (row) => (row.file_size_bytes ? `${(row.file_size_bytes / 1_000_000).toFixed(1)} MB` : "—"),
    },
    { key: "category_name", header: "Category", render: (row) => row.category_name ?? "—" },
    {
      key: "publish_state",
      header: "Status",
      render: (row) => (
        <Badge tone={row.publish_state === "published" ? "success" : "neutral"}>
          {row.publish_state === "published" ? "Published" : "Draft"}
        </Badge>
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
            aria-label={`Edit ${row.title}`}
          >
            <Icon name="edit" size={17} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-danger-bg hover:text-admin-danger"
            aria-label={`Delete ${row.title}`}
          >
            <Icon name="delete" size={17} />
          </button>
        </div>
      ),
    },
  ];

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteResource.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("eBook deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/library/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">eBooks</span>
      </nav>

      <PageHeader
        title="eBooks"
        description="Digital copies available to members through the ERP student portal."
        actions={
          <Button variant="primary" onClick={() => setFormTarget("new")}>
            <Icon name="add" size={16} /> Add eBook
          </Button>
        }
      />

      <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-sm flex-1">
          <Input
            leadingIcon="search"
            placeholder="Title"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Category"
            className="w-44"
            value={categoryId ?? ""}
            onChange={(e) => {
              setCategoryId(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <SegmentedPillToggle
            options={[
              { value: "all", label: "All" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
            ]}
            value={publishFilter}
            onChange={(v) => {
              setPublishFilter(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load eBooks." : null}
        emptyTitle="No eBooks found"
        footer={
          data && (
            <NumberedPagination
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )
        }
      />

      <EResourceFormModal
        open={formTarget !== null}
        resource={formTarget === "new" ? null : formTarget}
        onClose={() => setFormTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete eBook"
        message={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteResource.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
