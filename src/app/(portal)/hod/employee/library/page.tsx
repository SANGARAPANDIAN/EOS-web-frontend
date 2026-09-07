"use client";

import { useState } from "react";
import { Card, Badge, Button, ConfirmDialog, SkeletonRows } from "@/components/ui";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  useHodLibraryOverview,
  useLibraryBookSearch,
  useLibraryEResources,
} from "@/modules/hod/api/employeeLibrary";
import { useMyBorrowRequests, useCreateBorrowRequest } from "@/modules/shared/api/libraryRequests";
import { formatDisplayDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";

type Tab = "borrowed" | "search" | "e-resources" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "borrowed", label: "Borrowed" },
  { key: "search", label: "Search" },
  { key: "e-resources", label: "E-resources" },
  { key: "history", label: "History" },
];

function daysLeft(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

export default function HodEmployeeLibraryPage() {
  const [tab, setTab] = useState<Tab>("borrowed");
  const overview = useHodLibraryOverview();
  const o = overview.data;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {overview.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load library data — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Library</h1>
        <p className="mt-1 text-[13px] text-muted">
          {o
            ? `Central library · ${o.card_no} · ${o.borrowed.length} of ${o.books_per_student} titles borrowed`
            : "Central library"}
        </p>
      </div>

      <div className="flex rounded-card border border-border-default bg-surface p-1.5">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-[10px] py-2.5 text-[14px] font-bold transition-colors",
                active ? "bg-primary text-white" : "cursor-pointer text-ink hover:text-primary",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "borrowed" && <BorrowedTab overview={overview} />}
      {tab === "search" && <SearchTab />}
      {tab === "e-resources" && <EResourcesTab />}
      {tab === "history" && <HistoryTab overview={overview} />}
    </div>
  );
}

function BorrowedTab({ overview }: { overview: ReturnType<typeof useHodLibraryOverview> }) {
  const rows = overview.data?.borrowed ?? [];
  const myRequests = useMyBorrowRequests();
  const pendingRequests = (myRequests.data ?? []).filter((r) => r.status === "pending");

  if (overview.isLoading) {
    return <SkeletonRows count={3} />;
  }
  if (overview.isError) {
    return null;
  }
  if (rows.length === 0 && pendingRequests.length === 0) {
    return (
      <Card>
        <div className="text-[13px] text-subtle">No books currently borrowed or requested.</div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pendingRequests.map((r) => (
        <Card key={`req-${r.id}`} className="hod-hover-card">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 rounded-[10px] bg-accent-50" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-extrabold text-ink">{r.book?.title ?? "—"}</div>
              <div className="mt-0.5 text-[12px] text-subtle">Requested {formatDisplayDate(r.requested_at)}</div>
            </div>
            <Badge tone="accent">AWAITING LIBRARIAN</Badge>
          </div>
        </Card>
      ))}
      {rows.map((r) => {
        const left = daysLeft(r.due_date);
        const overdue = r.is_overdue || left < 0;
        return (
          <Card key={r.id} className="hod-hover-card">
            <div className="flex items-center gap-4">
              <div className="size-12 shrink-0 rounded-[10px] bg-accent-50" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-extrabold text-ink">{r.book.title}</div>
                <div className="mt-0.5 truncate text-[13px] text-muted">
                  {[r.book.author, r.book.qr_code].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-0.5 text-[12px] text-subtle">
                  Issued {formatDisplayDate(r.borrowed_date)} · Due {formatDisplayDate(r.due_date)}
                </div>
              </div>
              <Badge tone={overdue ? "danger" : "accent"}>
                {overdue ? "OVERDUE" : `${left} DAY${left === 1 ? "" : "S"} LEFT`}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// Reference-exact hex tones (green "AVAILABLE" / amber "RESERVE"), same
// convention already established elsewhere in the HOD module.
const AVAILABILITY_TONE_CLASS = {
  available: "text-[#15803d] bg-[#effaf3] border border-[#cdeed9]",
  reserve: "text-[#92400e] bg-[#fef7ec] border border-[#f6e2c3]",
};

function SearchTab() {
  const [q, setQ] = useState("");
  const search = useLibraryBookSearch(q);
  const rows = search.data?.data ?? [];

  const myRequests = useMyBorrowRequests();
  const createRequest = useCreateBorrowRequest();
  const pendingBookIds = new Set((myRequests.data ?? []).filter((r) => r.status === "pending").map((r) => r.book?.id));
  const [requestTarget, setRequestTarget] = useState<{ id: number; title: string } | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  function confirmRequest() {
    if (!requestTarget) return;
    const bookId = requestTarget.id;
    setRequestError(null);
    createRequest.mutate(bookId, {
      onError: (err) => setRequestError(err instanceof ApiError ? err.message : "Could not submit this request. Please try again."),
    });
    setRequestTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the catalogue by title, author or accession number"
        className="max-w-none rounded-pill"
      />
      {search.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load the catalogue — please try again.
        </div>
      )}
      {requestError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          {requestError}
        </div>
      )}
      {search.isLoading ? (
        <SkeletonRows count={3} />
      ) : search.isError ? null : rows.length === 0 ? (
        <Card>
          <div className="text-[13px] text-subtle">
            {q.trim().length === 0 ? "No books in the catalogue yet." : `No books matched "${q}".`}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((b) => {
            const available = b.available_copies > 0;
            const alreadyPending = pendingBookIds.has(b.id);
            return (
              <Card key={b.id} className="hod-hover-card">
                <div className="flex items-center gap-4">
                  <div className="size-12 shrink-0 rounded-[10px] bg-accent-50" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-extrabold text-ink">{b.title}</div>
                    <div className="mt-0.5 truncate text-[13px] text-muted">
                      {[b.author, b.qr_code].filter(Boolean).join(" · ")}
                    </div>
                    <div className="mt-0.5 text-[12px] text-subtle">
                      {available
                        ? `${b.available_copies} of ${b.total_copies} copies available`
                        : "All copies issued"}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-pill border px-[9px] py-1 text-[10.5px] font-extrabold tracking-[.06em] ${
                      available ? AVAILABILITY_TONE_CLASS.available : AVAILABILITY_TONE_CLASS.reserve
                    }`}
                  >
                    {available ? "AVAILABLE" : "RESERVE"}
                  </span>
                  {alreadyPending ? (
                    <Badge tone="accent">PENDING</Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => setRequestTarget({ id: b.id, title: b.title })}
                      disabled={!available}
                      loading={createRequest.isPending && createRequest.variables === b.id}
                    >
                      Request
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={requestTarget !== null}
        title="Request this book?"
        description={requestTarget ? `You're about to request "${requestTarget.title}". A librarian needs to accept it before it's borrowed — you'll see it under "Borrowed" once they do.` : undefined}
        confirmLabel="Request"
        onConfirm={confirmRequest}
        onCancel={() => setRequestTarget(null)}
      />
    </div>
  );
}

function EResourcesTab() {
  const resources = useLibraryEResources();
  const rows = resources.data?.data ?? [];

  if (resources.isLoading) {
    return <SkeletonRows count={3} />;
  }
  if (resources.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load e-resources — please try again.
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-[13px] text-subtle">No e-resources published yet.</div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <Card key={r.id} className="hod-hover-card">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-extrabold text-ink">{r.title}</div>
              <div className="mt-0.5 text-[13px] text-muted">
                {[r.category_name, r.format?.toUpperCase(), r.pages ? `${r.pages} pages` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Open</Button>
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
}

function statusLabel(status: string): string {
  if (status === "returned") return "RETURNED";
  if (status === "lost") return "LOST";
  return "DAMAGED";
}

function statusTone(status: string): "accent" | "danger" {
  return status === "returned" ? "accent" : "danger";
}

function HistoryTab({ overview }: { overview: ReturnType<typeof useHodLibraryOverview> }) {
  const rows = overview.data?.history ?? [];

  if (overview.isLoading) {
    return <SkeletonRows count={3} />;
  }
  if (overview.isError) {
    return null;
  }
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-[13px] text-subtle">No past borrowing history yet.</div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <Card key={r.id} className="hod-hover-card">
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 rounded-[10px] bg-accent-50" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-extrabold text-ink">{r.book.title}</div>
              <div className="mt-0.5 truncate text-[13px] text-muted">
                {[r.book.author, r.book.qr_code].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-0.5 text-[12px] text-subtle">
                Issued {formatDisplayDate(r.borrowed_date)}
                {r.returned_date ? ` · Returned ${formatDisplayDate(r.returned_date)}` : ""}
              </div>
            </div>
            <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
