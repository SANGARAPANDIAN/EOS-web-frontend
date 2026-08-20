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
  NumberedPagination,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useRacks, useDeleteRack, type Rack } from "@/modules/library/api/racks";
import { RackFormModal } from "@/modules/library/components/catalogue-setup/RackFormModal";

const DEFAULT_PAGE_SIZE = 20;

export function RacksPanel() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [formTarget, setFormTarget] = useState<Rack | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rack | null>(null);
  const { show } = useToast();

  const { data, isLoading, error } = useRacks({ q: debouncedQuery || undefined, page, page_size: pageSize });
  const deleteRack = useDeleteRack();

  const columns: DataTableColumn<Rack>[] = [
    { key: "rack_code", header: "Rack code", render: (row) => <span className="font-mono">{row.rack_code}</span> },
    { key: "shelves", header: "Shelves", render: (row) => row.shelves ?? "—" },
    { key: "subject_range", header: "Subject range", render: (row) => row.subject_range ?? "—" },
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
            aria-label={`Edit rack ${row.rack_code}`}
          >
            <Icon name="edit" size={17} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-danger-bg hover:text-admin-danger"
            aria-label={`Delete rack ${row.rack_code}`}
          >
            <Icon name="delete" size={17} />
          </button>
        </div>
      ),
    },
  ];

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteRack.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Rack deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div>
      <PageHeader
        title="Racks"
        description="Shelf ranges books are physically stored on."
        actions={
          <Button variant="primary" onClick={() => setFormTarget("new")}>
            <Icon name="add" size={16} /> Add rack
          </Button>
        }
      />

      <div className="mt-5 mb-4 max-w-sm">
        <Input
          leadingIcon="search"
          placeholder="Search racks"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load racks." : null}
        emptyTitle="No racks yet"
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

      <RackFormModal
        open={formTarget !== null}
        rack={formTarget === "new" ? null : formTarget}
        onClose={() => setFormTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete rack"
        message={`Delete rack "${deleteTarget?.rack_code}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteRack.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
