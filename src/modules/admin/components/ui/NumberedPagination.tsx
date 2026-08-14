import { Icon } from "@/components/ui/Icon";
import { Select } from "@/modules/admin/components/ui/Select";
import { cn } from "@/lib/utils/cn";

interface NumberedPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/** Always shows first/last/current/current±1, "…" for the gaps in between. */
function getPageNumbers(page: number, totalPages: number): (number | "…")[] {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const withGaps: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) withGaps.push("…");
    withGaps.push(p);
  });
  return withGaps;
}

/** Windowed page-number pagination + rows-per-page selector — for browse/list pages with a large total. */
export function NumberedPagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }: NumberedPaginationProps) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-divider px-5 py-3 text-sm">
      <p className="text-admin-muted">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="grid size-8 cursor-pointer place-items-center rounded-admin-sm text-admin-body hover:bg-admin-tint-strong disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <Icon name="chevron_left" size={17} />
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-admin-subtle">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "grid size-8 cursor-pointer place-items-center rounded-admin-sm text-[13px] font-semibold",
                p === page ? "bg-admin-primary text-white" : "text-admin-body hover:bg-admin-tint-strong",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="grid size-8 cursor-pointer place-items-center rounded-admin-sm text-admin-body hover:bg-admin-tint-strong disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <Icon name="chevron_right" size={17} />
        </button>
      </div>
      {onPageSizeChange && (
        <Select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="h-9 text-[13px]">
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
