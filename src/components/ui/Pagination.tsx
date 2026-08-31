import { cn } from "@/lib/utils/cn";

/** Standard page size for every COE table that uses client-side pagination — keeps "Showing X–Y of Z" consistent across pages. */
export const DEFAULT_PAGE_SIZE = 6;

interface PaginationProps {
  /** 1-indexed current page. Pass a value already clamped to [1, totalPages] — this component doesn't clamp for you. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** "Showing X–Y of Z" + Previous/page-numbers/Next — the same table-footer pagination bar used across every COE list table. Renders nothing when there's nothing to page through. */
export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const WINDOW = 5;
  const to = Math.min(totalPages, Math.max(WINDOW, page + Math.floor(WINDOW / 2)));
  const from = Math.max(1, to - WINDOW + 1);
  const pages = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-divider px-5 py-3.5", className)}>
      <span className="text-[12.5px] text-muted">
        Showing {start}–{end} of {total}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-[9px] border border-border-default bg-surface px-3 py-1.5 text-[12.5px] font-bold text-ink transition-colors enabled:hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {from > 1 && <span className="px-0.5 text-[12.5px] text-subtle">…</span>}
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "min-w-[34px] rounded-[9px] border px-2.5 py-1.5 text-[12.5px] font-bold transition-colors",
                p === page ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink hover:bg-surface-subtle",
              )}
            >
              {p}
            </button>
          ))}
          {to < totalPages && <span className="px-0.5 text-[12.5px] text-subtle">…</span>}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-[9px] border border-border-default bg-surface px-3 py-1.5 text-[12.5px] font-bold text-ink transition-colors enabled:hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
