import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** grid-template-columns track, e.g. "1.5fr" or "140px" — defaults to "1fr" */
  width?: string;
  align?: "left" | "right" | "center";
  render: (row: T, index: number) => ReactNode;
  /**
   * Opt-in click-to-sort for this column — return the raw comparable value
   * (not the rendered node). Columns that omit this stay static, matching
   * every existing caller. Numbers sort numerically, everything else via
   * localeCompare (same rule the design reference's sortable tables use).
   */
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  /** Shows the spinner in place of the empty-state row/message while data is still loading. */
  loading?: boolean;
  className?: string;
  /** Extra className applied to each row div — omit for the default no-hover row (Student reference). Pass "hod-hover-row" etc. for modules whose reference does show a per-row hover lift. */
  rowClassName?: string;
  /** Lifts + outlines + tints the row under the cursor, matching the design reference's list-row hover. Uses `outline` (not `border`) so hovering never shifts layout. */
  hoverableRows?: boolean;
  /**
   * Opt-in row interaction — when provided, the row becomes clickable (cursor
   * pointer). If `hoverableRows` isn't also set, the row additionally gets
   * the `.hover-lift` treatment automatically, so a row-click table needs no
   * extra prop to look interactive.
   */
  onRowClick?: (row: T) => void;
  /** Optional title bar rendered inside the same bordered card, above the column headers — e.g. "Announcements register". */
  title?: ReactNode;
  /** Optional right-aligned footnote next to the title — e.g. "Showing 4 of 4 loaded records". */
  titleNote?: ReactNode;
}

/**
 * Reproduces the one recurring table pattern in the design reference:
 * caps-label grid header on a muted background, grid body rows separated
 * only by a top border (no zebra striping, no row hover by default). Row
 * hover (`hoverableRows`) is opt-in — most tables in this app are read-only
 * logs where a hover affordance would be noise. Rows with `onRowClick` but
 * no explicit `hoverableRows` get the reference design's `.hover-lift`
 * treatment automatically (see `onRowClick` doc above).
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = "No records found.",
  loading,
  className,
  rowClassName,
  hoverableRows = false,
  onRowClick,
  title,
  titleNote,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const gridTemplateColumns = columns.map((c) => c.width ?? "1fr").join(" ");
  const alignClass = (align?: DataTableColumn<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  const sortCol = sortKey ? columns.find((c) => c.key === sortKey) : undefined;
  const sortedData = useMemo(() => {
    if (!sortCol?.sortValue) return data;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = sortCol.sortValue!(a);
      const vb = sortCol.sortValue!(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [data, sortCol, sortDir]);

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return;
    setSortKey(col.key);
    setSortDir((d) => (sortKey === col.key && d === "asc" ? "desc" : "asc"));
  };

  return (
    <div className={cn("overflow-hidden rounded-card border border-border-default bg-surface", className)}>
      {(title || titleNote) && (
        <div className="flex items-center justify-between gap-4 border-b border-divider px-5 py-3.5">
          <span className="text-[15px] font-extrabold text-ink">{title}</span>
          <span className="text-[12.5px] text-muted">{titleNote}</span>
        </div>
      )}
      <div
        className="grid gap-2 px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle uppercase bg-surface-muted"
        style={{ gridTemplateColumns }}
      >
        {columns.map((col) =>
          col.sortValue ? (
            <button
              key={col.key}
              type="button"
              onClick={() => toggleSort(col)}
              className={cn("cursor-pointer select-none", alignClass(col.align))}
            >
              {col.header}
              {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </button>
          ) : (
            <div key={col.key} className={alignClass(col.align)}>
              {col.header}
            </div>
          ),
        )}
      </div>
      {sortedData.length === 0 ? (
        <div className="px-5">
          <EmptyState loading={loading} message={emptyMessage} size={32} />
        </div>
      ) : (
        sortedData.map((row, index) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "relative grid items-center gap-2 border-t border-divider px-5 py-3.5 text-[13px] text-ink",
              hoverableRows &&
                "outline outline-1 -outline-offset-1 outline-transparent transition-all duration-150 hover:z-10 hover:-translate-y-0.5 hover:bg-accent-50 hover:outline-primary hover:shadow-hover-lift",
              onRowClick && "cursor-pointer",
              onRowClick && !hoverableRows && !rowClassName && "hover-lift rounded-[10px]",
              rowClassName,
            )}
            style={{ gridTemplateColumns }}
          >
            {columns.map((col) => (
              <div key={col.key} className={alignClass(col.align)}>
                {col.render(row, index)}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
