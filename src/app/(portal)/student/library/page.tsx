"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, EmptyState, Icon, DataTable, ConfirmDialog } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  useLibraryBooks,
  useMyBorrowRecords,
  useEResources,
  useCreateBorrowRequest,
  useMyBorrowRequests,
  type LibraryBook,
  type MyBorrowRecord,
  type MyBorrowRequest,
} from "@/modules/student/api/library";
import { formatDisplayDate, todayDateOnly } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "mine" | "catalog" | "eresources" | "history";

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

function PendingRequestRow({ request }: { request: MyBorrowRequest }) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-border-default bg-surface p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-icon-chip">
        <Icon name="hourglass_top" size={20} className="text-primary" />
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-bold text-ink">{request.book?.title ?? "—"}</div>
        <div className="mt-1 font-mono text-[11.5px] text-muted">Requested {formatDisplayDate(request.requested_at)}</div>
      </div>
      <Badge tone="accentDark">Awaiting librarian</Badge>
    </div>
  );
}

// Only ever fetched with available_only=true, so every row here has at
// least one copy free. A student can no longer self-checkout directly —
// clicking Request only creates a pending book_borrow_requests row (see
// useCreateBorrowRequest()); the book is actually borrowed only once a
// librarian accepts it from the Requests queue, which reuses the exact
// same borrow-creation logic (overdue block, duplicate borrow, per-student
// cap, race-safe copy decrement) the desk-issue flow always has.
function CatalogRow({
  book,
  requesting,
  alreadyPending,
  onRequest,
}: {
  book: LibraryBook;
  requesting: boolean;
  alreadyPending: boolean;
  onRequest: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
      <div className="min-w-0">
        <div className="text-[13.5px] font-bold text-ink">{book.title}</div>
        <div className="text-[12px] text-muted">
          {book.author ?? "Unknown author"} {book.rack && `· Shelf ${book.rack.rack_code}`}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Badge tone="accent">{book.available_copies} available</Badge>
        {alreadyPending ? (
          <Badge tone="accentDark">Request pending</Badge>
        ) : (
          <Button variant="primarySmall" className="w-auto" loading={requesting} onClick={onRequest}>
            Request
          </Button>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("catalog");
  const [query, setQuery] = useState("");

  const borrowed = useMyBorrowRecords("borrowed");
  const history = useMyBorrowRecords();
  const catalog = useLibraryBooks(query, true);
  const eResources = useEResources();
  const myRequests = useMyBorrowRequests();
  const createRequest = useCreateBorrowRequest();
  const [requestTarget, setRequestTarget] = useState<LibraryBook | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const pendingRequests = (myRequests.data ?? []).filter((r) => r.status === "pending");
  const pendingBookIds = new Set(pendingRequests.map((r) => r.book?.id));

  function confirmRequest() {
    if (!requestTarget) return;
    const bookId = requestTarget.id;
    setRequestError(null);
    createRequest.mutate(bookId, {
      onError: (err) => setRequestError(err instanceof ApiError ? err.message : "Could not submit this request. Please try again."),
    });
    setRequestTarget(null);
  }

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
        <SegmentedTabs
          options={[
            { key: "catalog", label: "Catalog" },
            { key: "mine", label: "My books" },
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
        ) : (borrowed.data ?? []).length === 0 && pendingRequests.length === 0 ? (
          <Card>
            <EmptyState message="You have no books currently borrowed or requested." />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingRequests.map((r) => (
              <PendingRequestRow key={r.id} request={r} />
            ))}
            {(borrowed.data ?? []).map((r) => (
              <BorrowedBookRow key={r.id} record={r} />
            ))}
          </div>
        ))}

      {tab === "catalog" && (
        <Card>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author"
            className="mb-3 max-w-[360px]"
          />
          {requestError && (
            <div className="mb-3 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {requestError}
            </div>
          )}
          {catalog.isLoading ? (
            <EmptyState message="Loading…" />
          ) : !catalog.data || catalog.data.data.length === 0 ? (
            <EmptyState message="No available titles match that search." />
          ) : (
            <div className="flex flex-col">
              {catalog.data.data.map((b) => (
                <CatalogRow
                  key={b.id}
                  book={b}
                  requesting={createRequest.isPending && createRequest.variables === b.id}
                  alreadyPending={pendingBookIds.has(b.id)}
                  onRequest={() => setRequestTarget(b)}
                />
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
          <DataTable columns={historyColumns} data={history.data ?? []} rowKey={(r) => r.id} emptyMessage="You haven't borrowed any books yet." />
        ))}

      <ConfirmDialog
        open={requestTarget !== null}
        title="Request this book?"
        description={requestTarget ? `You're about to request "${requestTarget.title}". A librarian needs to accept it before it's borrowed — you'll see it under "My books" once they do.` : undefined}
        confirmLabel="Request"
        onConfirm={confirmRequest}
        onCancel={() => setRequestTarget(null)}
      />
    </div>
  );
}
