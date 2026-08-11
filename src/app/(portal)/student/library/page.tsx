"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, EmptyState, Icon, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useLibraryBooks, useMyBorrowRecords, useBorrowBook, useEResources, type LibraryBook, type MyBorrowRecord } from "@/modules/student/api/library";
import { formatDisplayDate, todayDateOnly } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "mine" | "catalog" | "eresources" | "history";

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

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

function CatalogRow({ book }: { book: LibraryBook }) {
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [borrowing, setBorrowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const borrow = useBorrowBook();
  const available = book.available_copies > 0;

  async function handleBorrow() {
    setError(null);
    try {
      await borrow.mutateAsync({ bookId: book.id, dueDate });
      setDone(true);
      setBorrowing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not borrow this book.");
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-divider py-3 first:border-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13.5px] font-bold text-ink">{book.title}</div>
          <div className="text-[12px] text-muted">
            {book.author ?? "Unknown author"} {book.rack && `· Shelf ${book.rack.rack_code}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={available ? "accent" : "accentDark"}>
            {available ? `${book.available_copies} available` : "Unavailable"}
          </Badge>
          {available && !done && (
            <Button variant="primarySmall" onClick={() => setBorrowing((v) => !v)}>
              Borrow
            </Button>
          )}
          {done && <Badge tone="accentDark">Borrowed</Badge>}
        </div>
      </div>
      {borrowing && (
        <div className="flex items-center gap-3 pl-1">
          <label className="text-[12px] font-bold text-muted">Return by</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-40" />
          <Button variant="primarySmall" onClick={handleBorrow} disabled={borrow.isPending}>
            {borrow.isPending ? "Borrowing…" : "Confirm"}
          </Button>
        </div>
      )}
      {error && <div className="text-[12px] font-semibold text-danger-fg">{error}</div>}
    </div>
  );
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const borrowed = useMyBorrowRecords("borrowed");
  const history = useMyBorrowRecords();
  const catalog = useLibraryBooks(query, availableOnly);
  const eResources = useEResources();

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

  const nonBorrowedHistory = useMemo(() => (history.data ?? []).filter((r) => r.status !== "borrowed"), [history.data]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Library</h1>
        <SegmentedTabs
          options={[
            { key: "mine", label: "My books" },
            { key: "catalog", label: "Catalog" },
            { key: "eresources", label: "E-resources" },
            { key: "history", label: "History" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "mine" &&
        (borrowed.isLoading ? (
          <Card>
            <EmptyState message="Loading…" />
          </Card>
        ) : !borrowed.data || borrowed.data.length === 0 ? (
          <Card>
            <EmptyState message="You have no books currently borrowed." />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {borrowed.data.map((r) => (
              <BorrowedBookRow key={r.id} record={r} />
            ))}
          </div>
        ))}

      {tab === "catalog" && (
        <Card>
          <div className="mb-3 flex items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or author"
              className="max-w-[360px]"
            />
            <label className="flex items-center gap-2 text-[13px] text-body">
              <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="accent-primary" />
              Available only
            </label>
          </div>
          {catalog.isLoading ? (
            <EmptyState message="Loading…" />
          ) : !catalog.data || catalog.data.data.length === 0 ? (
            <EmptyState message="No titles match that search." />
          ) : (
            <div className="flex flex-col">
              {catalog.data.data.map((b) => (
                <CatalogRow key={b.id} book={b} />
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "eresources" && (
        <div className="grid grid-cols-3 gap-4">
          {eResources.isLoading ? (
            <Card>
              <EmptyState message="Loading…" />
            </Card>
          ) : !eResources.data || eResources.data.data.length === 0 ? (
            <Card>
              <EmptyState message="No e-resources published yet." />
            </Card>
          ) : (
            eResources.data.data.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <Icon name="language" size={20} className="text-primary" />
                  {r.format && <Badge tone="accent">{r.format}</Badge>}
                </div>
                <div className="mt-2 text-[14.5px] font-bold text-ink">{r.title}</div>
                {r.category_name && <div className="mt-0.5 text-[12px] text-muted">{r.category_name}</div>}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-primary"
                >
                  Open portal <Icon name="arrow_forward" size={14} />
                </a>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "history" &&
        (history.isLoading ? (
          <Card>
            <EmptyState message="Loading…" />
          </Card>
        ) : (
          <DataTable columns={historyColumns} data={nonBorrowedHistory} rowKey={(r) => r.id} emptyMessage="No past borrow history yet." />
        ))}
    </div>
  );
}
