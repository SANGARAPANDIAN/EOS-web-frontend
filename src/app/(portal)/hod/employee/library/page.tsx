"use client";

import { useState } from "react";
import { Card, Badge, Button, SkeletonRows } from "@/components/ui";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  useHodLibraryOverview,
  useRenewHodLibraryBook,
  useRequestHodLibraryBook,
  useLibraryBookSearch,
  useLibraryEResources,
} from "@/modules/hod/api/employeeLibrary";
import { formatDisplayDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

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
  const renew = useRenewHodLibraryBook();
  const rows = overview.data?.borrowed ?? [];
  const maxRenewals = overview.data?.max_renewals ?? 0;

  if (overview.isLoading) {
    return <SkeletonRows count={3} />;
  }
  if (overview.isError) {
    return null;
  }
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-[13px] text-subtle">No books currently borrowed.</div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => {
        const left = daysLeft(r.due_date);
        const overdue = r.is_overdue || left < 0;
        const canRenew = !overdue && r.renewal_count < maxRenewals;
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
              <Button
                variant="secondary"
                onClick={() => renew.mutate(r.id)}
                disabled={!canRenew}
                loading={renew.isPending}
                title={!canRenew ? (overdue ? "Overdue books cannot be renewed" : "Renewal limit reached") : undefined}
              >
                Renew
              </Button>
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
  const request = useRequestHodLibraryBook();
  const rows = search.data?.data ?? [];

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
                  <Button
                    variant="secondary"
                    onClick={() => request.mutate(b.id)}
                    loading={request.isPending}
                  >
                    Request
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
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
