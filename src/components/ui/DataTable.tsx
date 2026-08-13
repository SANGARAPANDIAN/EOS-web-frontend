import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
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
  /** Shows the spinner in place of the empty-state row/message while data is still loading. */
  loading?: boolean;
  className?: string;
  /** Extra className applied to each row div — omit for the default no-hover row (Student reference). Pass "hod-hover-row" etc. for modules whose reference does show a per-row hover lift. */
  rowClassName?: string;
  /** Omit for the default non-interactive row (Student reference). When passed, each row becomes clickable (cursor-pointer added automatically). */
  onRowClick?: (row: T) => void;
}

/**
 * Reproduces the one recurring table pattern in the design reference:
 * caps-label grid header on a muted background, grid body rows separated
 * only by a top border (no zebra striping, no row hover by default).
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = "No records found.",
  loading,
  className,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const gridTemplateColumns = columns.map((c) => c.width ?? "1fr").join(" ");
  const alignClass = (align?: DataTableColumn<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <div className={cn("overflow-hidden rounded-card border border-border-default bg-surface", className)}>
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
          <EmptyState loading={loading} message={emptyMessage} size={32} />
        </div>
      ) : (
        data.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "grid items-center gap-2 border-t border-divider px-5 py-3.5 text-[13px] text-ink",
              onRowClick && "cursor-pointer",
              rowClassName,
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
