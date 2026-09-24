"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { friendlyError } from "@/lib/utils/errors";
import {
  Button,
  ConfirmDialog,
  DataTable,
  IconButton,
  Input,
  KpiCard,
  PageHeader,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useDeleteVendor, useVendors, type Vendor } from "@/modules/admin/api/vendors";
import { VendorDialog } from "@/modules/admin/components/vendors/VendorDialog";

export default function VendorsPage() {
  const { show } = useToast();
  const { data: vendors = [], isLoading, error } = useVendors();
  const deleteVendor = useDeleteVendor();

  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; vendor?: Vendor }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) => v.name.toLowerCase().includes(q) || (v.gst_no ?? "").toLowerCase().includes(q),
    );
  }, [vendors, query]);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteVendor.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Vendor deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => {
        show(err instanceof ApiError ? err.message : friendlyError(err), "error");
        setDeleteTarget(null);
      },
    });
  }

  const columns: DataTableColumn<Vendor>[] = [
    { key: "name", header: "Name", render: (v) => <span className="font-semibold text-admin-ink">{v.name}</span> },
    { key: "contact", header: "Contact info", render: (v) => v.contact_info ?? "—" },
    { key: "gst", header: "GST number", render: (v) => v.gst_no ?? "—" },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (v) => (
        <div className="flex justify-end gap-1.5">
          <IconButton icon="edit" size={32} iconSize={16} aria-label="Edit" title="Edit" onClick={() => setDialog({ open: true, vendor: v })} />
          <IconButton icon="delete" size={32} iconSize={16} aria-label="Delete" title="Delete" onClick={() => setDeleteTarget(v)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Vendors</span>
      </nav>

      <PageHeader
        title="Vendors"
        description="Suppliers used across purchase and service order procurement. A vendor must exist here before it can be assigned to an approved order."
        actions={
          <Button variant="primary" onClick={() => setDialog({ open: true })}>
            <Icon name="add_business" size={16} /> Add vendor
          </Button>
        }
      />

      <div className="mt-5 mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Total vendors" value={vendors.length.toLocaleString()} icon="storefront" />
      </div>

      <div className="mb-4 max-w-sm">
        <Input leadingIcon="search" placeholder="Search by name or GST number…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(v) => v.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load vendors." : null}
        emptyIcon="storefront"
        emptyTitle="No vendors found"
        emptyDescription="Add the first vendor to unblock purchase/service order procurement."
      />

      {dialog.open && <VendorDialog open={dialog.open} onClose={() => setDialog({ open: false })} vendor={dialog.vendor} />}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete vendor"
        message={`Delete "${deleteTarget?.name}"? This can't be undone. Vendors already used on a purchase/service order or quotation can't be deleted.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteVendor.isPending}
      />
    </div>
  );
}
