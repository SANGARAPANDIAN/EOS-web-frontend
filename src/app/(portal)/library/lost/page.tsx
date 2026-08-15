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
  SegmentedPillToggle,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useBorrowRecords,
  useCreateReplacementIndent,
  useSettleCharge,
  type BorrowRecord,
} from "@/modules/library/api/borrowRecords";
import { borrowerName, formatCurrency, formatDate } from "@/modules/library/lib/borrow-record-format";

const PAGE_SIZE = 20;
type CauseTab = "lost" | "damaged";
type SettlementTab = "unsettled" | "settled";

export default function LostAndDamagedPage() {
  const [causeTab, setCauseTab] = useState<CauseTab>("lost");
  const [settlementTab, setSettlementTab] = useState<SettlementTab>("unsettled");
  const [page, setPage] = useState(1);
  const [settleTarget, setSettleTarget] = useState<BorrowRecord | null>(null);
  const { show } = useToast();

  const { data, isLoading, error } = useBorrowRecords({
    status: causeTab,
    damage_lost_settled: settlementTab === "settled",
    page,
    page_size: PAGE_SIZE,
  });
  const settleCharge = useSettleCharge();
  const createReplacementIndent = useCreateReplacementIndent();

  const columns: DataTableColumn<BorrowRecord>[] = [
    { key: "accession", header: "Accession", render: (row) => row.book.qr_code },
    { key: "title", header: "Title", render: (row) => row.book.title },
    { key: "member", header: "Member", render: (row) => borrowerName(row) },
    { key: "declared", header: "Declared", render: (row) => formatDate(row.damage_lost_declared_at) },
    {
      key: "cause",
      header: "Cause",
      render: (row) => <Badge tone="danger">{row.is_lost ? "Lost" : "Damaged"}</Badge>,
    },
    {
      key: "charge",
      header: "Charge",
      align: "right",
      render: (row) => formatCurrency(row.damage_lost_charge_amount),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) =>
        settlementTab === "unsettled" ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="primary" onClick={() => setSettleTarget(row)}>
              Collect
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={createReplacementIndent.isPending && createReplacementIndent.variables === row.id}
              onClick={() => handleReplacementIndent(row)}
            >
              {createReplacementIndent.isPending && createReplacementIndent.variables === row.id
                ? "Requesting…"
                : "Replacement"}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-admin-muted">{formatDate(row.damage_lost_settled_at)}</span>
        ),
    },
  ];

  function handleSettleConfirm() {
    if (!settleTarget) return;
    settleCharge.mutate(settleTarget.id, {
      onSuccess: () => {
        show(`Charge settled for "${settleTarget.book.title}".`, "success");
        setSettleTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  function handleReplacementIndent(row: BorrowRecord) {
    createReplacementIndent.mutate(row.id, {
      onSuccess: (result) => show(result.message, "success"),
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Lost & damaged books"
        description="Copies written off the shelf — what was charged, what was recovered and what is still open."
      />

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedPillToggle<CauseTab>
          options={[
            { value: "lost", label: "Lost" },
            { value: "damaged", label: "Damaged" },
          ]}
          value={causeTab}
          onChange={(v) => {
            setCauseTab(v);
            setPage(1);
          }}
        />
        <SegmentedPillToggle<SettlementTab>
          options={[
            { value: "unsettled", label: "Unsettled" },
            { value: "settled", label: "Settled" },
          ]}
          value={settlementTab}
          onChange={(v) => {
            setSettlementTab(v);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle="No records found."
        footer={
          data ? (
            <NumberedPagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
          ) : null
        }
      />

      <ConfirmDialog
        open={settleTarget !== null}
        title="Collect charge"
        message={`Collect ${formatCurrency(settleTarget?.damage_lost_charge_amount ?? null)} from ${settleTarget ? borrowerName(settleTarget) : ""} for "${settleTarget?.book.title}"?`}
        confirmLabel="Collect charge"
        isConfirming={settleCharge.isPending}
        onConfirm={handleSettleConfirm}
        onClose={() => setSettleTarget(null)}
      />
    </div>
  );
}
