"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/utils/errors";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  NumberedPagination,
  PageHeader,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useBorrowRecords,
  useUpdateBorrowRecord,
  type BorrowRecord,
  type BorrowRecordAction,
} from "@/modules/library/api/borrowRecords";
import { borrowStatusLabel, borrowStatusTone, borrowerName, formatDate } from "@/modules/library/lib/borrow-record-format";

const PAGE_SIZE = 20;

const ACTION_COPY: Record<BorrowRecordAction, { title: string; verb: string; destructive: boolean }> = {
  return: { title: "Return book", verb: "Return", destructive: false },
  renew: { title: "Renew book", verb: "Renew", destructive: false },
  damaged: { title: "Mark as damaged", verb: "Mark damaged", destructive: true },
  lost: { title: "Mark as lost", verb: "Mark lost", destructive: true },
};

interface PendingAction {
  record: BorrowRecord;
  action: BorrowRecordAction;
}

export default function ReturnsPage() {
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const { show } = useToast();

  const { data, isLoading, error } = useBorrowRecords({
    status: "borrowed",
    page,
    page_size: PAGE_SIZE,
  });
  const updateRecord = useUpdateBorrowRecord();

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
    {
      key: "issue",
      header: "Issue / renewals",
      render: (row) => `${formatDate(row.borrowed_date)} · ${row.renewal_count} renewal(s)`,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={borrowStatusTone(row)}>{borrowStatusLabel(row)}</Badge>,
    },
    { key: "due_date", header: "Due date", render: (row) => formatDate(row.due_date) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="primary" onClick={() => setPending({ record: row, action: "return" })}>
            Return
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPending({ record: row, action: "renew" })}>
            Renew
          </Button>
          <Button size="sm" variant="danger" onClick={() => setPending({ record: row, action: "damaged" })}>
            Damaged
          </Button>
          <Button size="sm" variant="danger" onClick={() => setPending({ record: row, action: "lost" })}>
            Lost
          </Button>
        </div>
      ),
    },
  ];

  function handleConfirm() {
    if (!pending) return;
    updateRecord.mutate(
      { id: pending.record.id, input: { action: pending.action } },
      {
        onSuccess: () => {
          show(`${ACTION_COPY[pending.action].verb} recorded for "${pending.record.book.title}".`, "success");
          setPending(null);
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Returns & renewals"
        description="Receive copies, renew borrowings and settle overdue, lost or damaged items."
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle="No books currently borrowed."
        footer={
          data ? (
            <NumberedPagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
          ) : null
        }
      />

      <ConfirmDialog
        open={pending !== null}
        title={pending ? ACTION_COPY[pending.action].title : ""}
        message={
          pending
            ? `${ACTION_COPY[pending.action].verb} "${pending.record.book.title}" for ${borrowerName(pending.record)}?`
            : ""
        }
        confirmLabel={pending ? ACTION_COPY[pending.action].verb : "Confirm"}
        destructive={pending ? ACTION_COPY[pending.action].destructive : false}
        isConfirming={updateRecord.isPending}
        onConfirm={handleConfirm}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
