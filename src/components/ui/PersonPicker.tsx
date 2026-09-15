"use client";

import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";

/**
 * Generic "search → row list → select" picker — the same searchable
 * person-selector shape (avatar + name + subtitle, floating results list,
 * a "Change" chip once selected) used to be hand-rolled independently in
 * several modules (HR's own faculty picker, IQAC's faculty/student
 * pickers, Finance's faculty picker, sports-admin's, gate-warden's, ...),
 * each with its own row markup and its own hover styling — one of them
 * drifted onto a fragile `!important`-driven hover hack, and a future copy
 * of any of them could just as easily drop the hover class entirely. This
 * is the one implementation; callers own their own data-fetching hook and
 * just hand this component the current results.
 *
 * Fully controlled: `term`/`open` state lives in the caller (it already
 * needs `term` to call its own search hook, so lifting it here instead of
 * duplicating state would mean this component would have to accept a hook
 * as a prop, which can't be called conditionally/dynamically per React's
 * rules of hooks).
 */
export interface PersonPickerProps<T> {
  /** The currently-selected item, or null when nothing is chosen yet. */
  value: T | null;
  onChange: (item: T | null) => void;
  getId: (item: T) => number | string;
  /** Maps an item to what the row (and the selected-summary chip) shows. */
  toRow: (item: T) => { name: string; subtitle: string; avatarUrl?: string | null };
  results: T[];
  /** Total matches on the server, if larger than `results` — shown as a "Showing N of total" footer. */
  total?: number;
  isLoading?: boolean;
  term: string;
  onTermChange: (term: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Extra filter controls (e.g. a department select) rendered beside the search input. */
  filters?: ReactNode;
  emptyMessage?: string;
  noMatchMessage?: string;
}

export function PersonPicker<T>({
  value,
  onChange,
  getId,
  toRow,
  results,
  total,
  isLoading,
  term,
  onTermChange,
  open,
  onOpenChange,
  placeholder = "Search by name…",
  disabled,
  filters,
  emptyMessage = "No matches on record.",
  noMatchMessage = "Nothing matched that search.",
}: PersonPickerProps<T>) {
  if (value) {
    const row = toRow(value);
    return (
      <div className="mt-1.5 flex items-center gap-3 rounded-[10px] border border-border-default bg-surface-tint px-3.5 py-2.5">
        <Avatar name={row.name} imageUrl={row.avatarUrl} size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-extrabold text-ink">{row.name}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">{row.subtitle}</div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            onTermChange("");
          }}
          className="shrink-0 text-[12.5px] font-bold text-primary disabled:opacity-40"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative mt-1.5">
      <div className={filters ? "grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]" : ""}>
        <Input
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          onFocus={() => onOpenChange(true)}
          // A click on a result button blurs the input first — closing
          // immediately would unmount the list before that click's onClick
          // fires. The short delay lets the click register; onMouseDown on
          // each row (which fires before blur) additionally guards it.
          onBlur={() => setTimeout(() => onOpenChange(false), 150)}
          placeholder={placeholder}
          disabled={disabled}
        />
        {filters}
      </div>

      {/* Floats over whatever sits below the picker instead of pushing it
          down the page — a page embedding several of these (or a table
          right underneath) shouldn't reflow every time this opens. */}
      {open && (
        <div className="absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-[10px] border border-border-default bg-surface shadow-modal">
          <div className="max-h-[260px] overflow-y-auto">
            {isLoading ? (
              <div className="px-3.5 py-3 text-[12.5px] text-subtle">Loading…</div>
            ) : results.length === 0 ? (
              <div className="px-3.5 py-3 text-[12.5px] text-subtle">{term.trim() ? noMatchMessage : emptyMessage}</div>
            ) : (
              results.map((item) => {
                const row = toRow(item);
                return (
                  <button
                    key={getId(item)}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onChange(item)}
                    className="flex w-full items-center gap-3 border-b border-divider bg-surface px-3.5 py-2.5 text-left last:border-b-0 hover:bg-surface-tint"
                  >
                    <Avatar name={row.name} imageUrl={row.avatarUrl} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-ink">{row.name}</div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted">{row.subtitle}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {total !== undefined && total > results.length && (
            <div className="border-t border-divider bg-surface-tint px-3.5 py-1.5 text-[11.5px] text-subtle">
              Showing {results.length} of {total} — type to narrow the list.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
