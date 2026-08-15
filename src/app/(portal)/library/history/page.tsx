"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/utils/errors";
import {
  Badge,
  ConfirmDialog,
  DataTable,
  NumberedPagination,
  PageHeader,
  SegmentedPillToggle,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useBorrowRecords,
  useDeleteBorrowRecord,
  type BorrowRecord,
  type BorrowStatusFilter,
} from "@/modules/library/api/borrowRecords";
import {
  borrowStatusLabel,
  borrowStatusTone,
  borrowerName,
  formatCurrency,
  formatDate,
} from "@/modules/library/lib/borrow-record-format";

const PAGE_SIZE = 20;
type StatusTab = "all" | BorrowStatusFilter;

export default function BorrowingHistoryPage() {
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<BorrowRecord | null>(null);
  const { show } = useToast();

  const { data, isLoading, error } = useBorrowRecords({
    status: statusTab === "all" ? undefined : statusTab,
    page,
    page_size: PAGE_SIZE,
  });
  const deleteRecord = useDeleteBorrowRecord();

  const columns: DataTableColumn<BorrowRecord>[] = [
    {
      key: "book",
      header: "Book",
      render: (row) => (
        <div>
          <p className="font-medium text-admin-ink">{row.book.title}</p>
          <p className="text-xs text-admin-muted">{row.book.qr_code}</p>
        </div>
      ),
    },
    { key: "borrower", header: "Borrower", render: (row) => borrowerName(row) },
    { key: "borrowed_date", header: "Borrowed", render: (row) => formatDate(row.borrowed_date) },
    { key: "due_date", header: "Due", render: (row) => formatDate(row.due_date) },
    { key: "returned_date", header: "Returned", render: (row) => formatDate(row.returned_date) },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={borrowStatusTone(row)}>{borrowStatusLabel(row)}</Badge>,
    },
    { key: "fine_amount", header: "Fine", align: "right", render: (row) => formatCurrency(row.fine_amount) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) =>
        row.status === "borrowed" ? (
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="text-admin-muted hover:text-admin-danger"
            aria-label="Delete borrow record"
          >
            <Icon name="delete" size={17} />
          </button>
        ) : null,
    },
  ];

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteRecord.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Borrow record deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Borrowing history"
        description="Every borrowing closed or open — borrowed, returned, overdue and lost, with how each was settled."
      />

      <SegmentedPillToggle<StatusTab>
        options={[
          { value: "all", label: "All" },
          { value: "borrowed", label: "Borrowed" },
          { value: "returned", label: "Returned" },
          { value: "overdue", label: "Overdue" },
          { value: "lost", label: "Lost" },
          { value: "damaged", label: "Damaged" },
        ]}
        value={statusTab}
        onChange={(v) => {
          setStatusTab(v);
          setPage(1);
        }}
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle="No borrow records found."
        footer={
          data ? (
            <NumberedPagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
          ) : null
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete borrow record"
        message={`Delete this borrow record for "${deleteTarget?.book.title}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteRecord.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
