import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** grid-template-columns track, e.g. "1.5fr" or "140px" — defaults to "1fr" */
  width?: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  className?: string;
  /**
   * Opt-in row interaction — when provided, the row lifts, gains a primary
   * outline and a soft shadow on hover (the reference design's one recurring
   * hover treatment for anything clickable) and the cursor becomes a
   * pointer. Omit for tables whose rows aren't a single click target (e.g.
   * one with its own per-row action buttons instead).
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
 * only by a top border. Rows are static by default (no zebra striping, no
 * hover) — pass `onRowClick` to opt a table into the reference's row-hover
 * treatment (see `onRowClick` doc above).
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = "No records found.",
  className,
  onRowClick,
  title,
  titleNote,
}: DataTableProps<T>) {
  const gridTemplateColumns = columns.map((c) => c.width ?? "1fr").join(" ");
  const alignClass = (align?: DataTableColumn<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

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
        {columns.map((col) => (
          <div key={col.key} className={alignClass(col.align)}>
            {col.header}
          </div>
        ))}
      </div>
      {data.length === 0 ? (
        <div className="px-5">
          <EmptyState message={emptyMessage} />
        </div>
      ) : (
        data.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "grid items-center gap-2 border-t border-divider px-5 py-3.5 text-[13px] text-ink",
              onRowClick && "hover-lift cursor-pointer rounded-[10px]",
            )}
            style={{ gridTemplateColumns }}
          >
            {columns.map((col) => (
              <div key={col.key} className={alignClass(col.align)}>
                {col.render(row)}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
