"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/utils/errors";
import {
  Button,
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
  useCollectFine,
  useSendOverdueReminders,
  type BorrowRecord,
} from "@/modules/library/api/borrowRecords";
import { borrowerName, formatCurrency, formatDate } from "@/modules/library/lib/borrow-record-format";

const PAGE_SIZE = 20;
type FineTab = "unpaid" | "collected";

export default function OverdueFinesPage() {
  const [tab, setTab] = useState<FineTab>("unpaid");
  const [page, setPage] = useState(1);
  const [collectTarget, setCollectTarget] = useState<BorrowRecord | null>(null);
  const { show } = useToast();

  // "Collected" needs the closed (returned) records too, not just those
  // still open and overdue — overdue=true only ever matches active
  // borrowed-and-late records, so the Collected tab filters by fine_paid
  // alone instead of layering overdue=true on top.
  const { data, isLoading, error } = useBorrowRecords(
    tab === "unpaid"
      ? { overdue: true, fine_paid: false, page, page_size: PAGE_SIZE }
      : { fine_paid: true, page, page_size: PAGE_SIZE },
  );
  const collectFine = useCollectFine();
  const sendReminders = useSendOverdueReminders();

  const columns: DataTableColumn<BorrowRecord>[] = [
    { key: "accession", header: "Accession", render: (row) => row.book.qr_code },
    { key: "title", header: "Title", render: (row) => row.book.title },
    { key: "borrower", header: "Student", render: (row) => borrowerName(row) },
    { key: "due_date", header: "Due date", render: (row) => formatDate(row.due_date) },
    {
      key: "days_overdue",
      header: "Days overdue",
      render: (row) => (row.status === "borrowed" ? row.days_overdue : row.days_late),
    },
    {
      key: "fine",
      header: "Fine",
      align: "right",
      render: (row) => formatCurrency(tab === "unpaid" ? row.fine_amount : row.fine_paid_amount),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) =>
        tab === "unpaid" ? (
          <Button size="sm" variant="primary" onClick={() => setCollectTarget(row)}>
            Collect
          </Button>
        ) : (
          <span className="text-xs text-admin-muted">{row.fine_paid_at ? formatDate(row.fine_paid_at) : ""}</span>
        ),
    },
  ];

  function handleCollectConfirm() {
    if (!collectTarget) return;
    collectFine.mutate(collectTarget.id, {
      onSuccess: () => {
        show(`Fine collected for "${collectTarget.book.title}".`, "success");
        setCollectTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  function handleSendReminders() {
    sendReminders.mutate(undefined, {
      onSuccess: (result) => show(result.message, "success"),
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Overdue & fines"
        description="Copies past due, the fine each has run up, and how it was settled."
        actions={
          <Button variant="secondary" disabled={sendReminders.isPending} onClick={handleSendReminders}>
            {sendReminders.isPending ? "Sending…" : "Send overdue reminders"}
          </Button>
        }
      />

      <SegmentedPillToggle<FineTab>
        options={[
          { value: "unpaid", label: "Unpaid" },
          { value: "collected", label: "Collected" },
        ]}
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle={tab === "unpaid" ? "No unpaid fines." : "No collected fines."}
        footer={
          data ? (
            <NumberedPagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
          ) : null
        }
      />

      <ConfirmDialog
        open={collectTarget !== null}
        title="Collect fine"
        message={`Collect ${formatCurrency(collectTarget?.fine_amount ?? null)} from ${collectTarget ? borrowerName(collectTarget) : ""} for "${collectTarget?.book.title}"?`}
        confirmLabel="Collect fine"
        isConfirming={collectFine.isPending}
        onConfirm={handleCollectConfirm}
        onClose={() => setCollectTarget(null)}
      />
    </div>
  );
}
