"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, EmptyState, Icon, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildBorrowRecords, type MyBorrowRecord } from "@/modules/parent/api/library";
import { formatDisplayDate, todayDateOnly } from "@/lib/utils/date";

type Tab = "current" | "history";

function BorrowedBookRow({ record }: { record: MyBorrowRecord }) {
  const isOverdue = record.status === "borrowed" && record.due_date < todayDateOnly();
  return (
    <div className="flex items-center gap-4 rounded-card border border-border-default bg-surface p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-icon-chip">
        <Icon name="book_2" size={20} className="text-primary" />
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-bold text-ink">{record.title}</div>
        <div className="text-[12px] text-muted">{record.author ?? "Unknown author"}</div>
        <div className="mt-1 flex items-center gap-3 font-mono text-[11.5px] text-muted">
          <span>Issued {formatDisplayDate(record.borrowed_date)}</span>
          <span>→</span>
          <span>Due {formatDisplayDate(record.due_date)}</span>
        </div>
      </div>
      <Badge tone={isOverdue ? "accentDark" : "accent"}>{isOverdue ? "Overdue" : "Borrowed"}</Badge>
    </div>
  );
}

export default function ParentLibraryPage() {
  const { selectedChildId } = useSelectedChild();
  const [tab, setTab] = useState<Tab>("current");
  const current = useChildBorrowRecords(selectedChildId, "borrowed");
  const history = useChildBorrowRecords(selectedChildId);

  const historyColumns: DataTableColumn<MyBorrowRecord>[] = [
    { key: "title", header: "Title", width: "2fr", render: (r) => r.title },
    { key: "issued", header: "Issued", width: "1fr", render: (r) => formatDisplayDate(r.borrowed_date) },
    { key: "returned", header: "Returned", width: "1fr", render: (r) => (r.returned_date ? formatDisplayDate(r.returned_date) : "—") },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (r) => <Badge tone={r.status === "returned" ? "accent" : "accentDark"}>{r.status}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Library</h1>
        <div className="flex items-center gap-3">
          <ChildSwitcher />
          <SegmentedTabs
            options={[
              { key: "current", label: "Currently borrowed" },
              { key: "history", label: "History" },
            ]}
            value={tab}
            onChange={(k) => setTab(k as Tab)}
          />
        </div>
      </div>

      {tab === "current" ? (
        current.isLoading ? (
          <Card>
            <EmptyState message="Loading…" />
          </Card>
        ) : (current.data ?? []).length === 0 ? (
          <Card>
            <EmptyState message="No books currently borrowed." />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {(current.data ?? []).map((r) => (
              <BorrowedBookRow key={r.id} record={r} />
            ))}
          </div>
        )
      ) : (
        <DataTable
          columns={historyColumns}
          data={history.data ?? []}
          rowKey={(r) => r.id}
          emptyMessage={history.isLoading ? "Loading…" : "No borrow history yet."}
        />
      )}
    </div>
  );
}
