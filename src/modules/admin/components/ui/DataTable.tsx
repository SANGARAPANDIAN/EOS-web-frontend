import { useEffect, useRef, type ReactNode } from "react";
import { Card } from "@/modules/admin/components/ui/Card";
import { EmptyState } from "@/modules/admin/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Right-aligned numeric/register-number columns read better in the mono font, matching the reference. */
  mono?: boolean;
  render: (row: T) => ReactNode;
}

export interface DataTableSelection<T> {
  isSelected: (row: T) => boolean;
  onToggle: (row: T) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

interface DataTableProps<T> {
  title?: string;
  countLabel?: ReactNode;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  selection?: DataTableSelection<T>;
  error?: string | null;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  isLoading?: boolean;
  footer?: ReactNode;
  className?: string;
}

const SKELETON_ROWS = 5;
const CHECKBOX_CLASS = "size-4 rounded-[4px] border-admin-border-input accent-admin-primary";

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={CHECKBOX_CLASS}
      checked={checked}
      onChange={onChange}
      aria-label="Select all rows"
    />
  );
}

/**
 * Real <table>-based register/list view matching the Principal Command
 * Center reference: tinted uppercase header, hairline row dividers, whole
 * row clickable with a lift + tint + inset-ring hover, mono numeric columns.
 */
export function DataTable<T>({
  title,
  countLabel,
  columns,
  rows,
  rowKey,
  onRowClick,
  selection,
  error,
  emptyIcon,
  emptyTitle = "No records found",
  emptyDescription,
  isLoading = false,
  footer,
  className,
}: DataTableProps<T>) {
  return (
    <Card hoverable={false} className={cn("overflow-hidden", className)}>
      {(title || countLabel) && (
        <div className="flex items-center border-b border-admin-divider px-5 py-[18px]">
          {title && <div className="font-sans text-[17px] font-bold text-admin-ink">{title}</div>}
          {countLabel && <span className="ml-auto text-[13px] text-admin-muted">{countLabel}</span>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-admin-tint">
              {selection && (
                <th className="w-10 border-b border-admin-divider px-3 py-[11px] pl-5">
                  <HeaderCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected && !selection.allSelected}
                    onChange={selection.onToggleAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "border-b border-admin-divider px-3 py-[11px] text-[11px] font-bold tracking-[.08em] text-admin-muted uppercase first:pl-5 last:pr-5",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-admin-divider">
                  {selection && <td className="px-3 py-3.5 pl-5" />}
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3.5 first:pl-5 last:pr-5">
                      <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-admin-tint" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && error && (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0)} className="px-5 py-8 text-center text-sm text-admin-danger">
                  {error}
                </td>
              </tr>
            )}

            {!isLoading &&
              !error &&
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-admin-divider transition-[transform,box-shadow,background-color] duration-150 last:border-b-0",
                    onRowClick &&
                      "cursor-pointer hover:-translate-y-0.5 hover:bg-admin-tint hover:shadow-admin-row-hover-ring",
                  )}
                >
                  {selection && (
                    <td className="px-3 py-3.5 pl-5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className={CHECKBOX_CLASS}
                        checked={selection.isSelected(row)}
                        onChange={() => selection.onToggle(row)}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-3.5 text-admin-body first:pl-5 last:pr-5",
                        col.align === "right" ? "text-right" : "text-left",
                        col.mono && "font-mono",
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!isLoading && !error && rows.length === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      )}
      {footer}
    </Card>
  );
}
