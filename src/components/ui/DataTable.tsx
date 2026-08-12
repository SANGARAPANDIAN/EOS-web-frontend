import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** grid-template-columns track, e.g. "1.5fr" or "140px" — defaults to "1fr" */
  width?: string;
  align?: "left" | "right" | "center";
  render: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  className?: string;
  /** Lifts + outlines + tints the row under the cursor, matching the design reference's list-row hover. Uses `outline` (not `border`) so hovering never shifts layout. */
  hoverableRows?: boolean;
  onRowClick?: (row: T) => void;
}

/**
 * Reproduces the one recurring table pattern in the design reference:
 * caps-label grid header on a muted background, grid body rows separated
 * only by a top border. Row hover (`hoverableRows`) is opt-in — most tables
 * in this app are read-only logs where a hover affordance would be noise.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = "No records found.",
  className,
  hoverableRows = false,
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
          <EmptyState message={emptyMessage} />
        </div>
      ) : (
        data.map((row, index) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "relative grid items-center gap-2 border-t border-divider px-5 py-3.5 text-[13px] text-ink",
              hoverableRows &&
                "outline outline-1 -outline-offset-1 outline-transparent transition-all duration-150 hover:z-10 hover:-translate-y-0.5 hover:bg-accent-50 hover:outline-primary hover:shadow-hover-lift",
              onRowClick && "cursor-pointer",
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
