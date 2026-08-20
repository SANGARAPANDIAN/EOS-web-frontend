"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

interface TypeaheadProps<T> {
  value: string;
  onChange: (value: string) => void;
  results: T[];
  getKey: (item: T) => string | number;
  renderResult: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  isLoading?: boolean;
  placeholder?: string;
  minChars?: number;
  disabled?: boolean;
  className?: string;
}

/** Search input with a floating result list — student/book lookups across the library circulation flows. */
export function Typeahead<T>({
  value,
  onChange,
  results,
  getKey,
  renderResult,
  onSelect,
  isLoading,
  placeholder,
  minChars = 2,
  disabled,
  className,
}: TypeaheadProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const showPanel = open && value.trim().length >= minChars;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <label className="flex h-11 items-center gap-2.5 rounded-admin-control border border-admin-border bg-admin-canvas px-3.5 has-[input:focus]:border-admin-primary">
        <Icon name="search" size={20} className="text-admin-muted" />
        <input
          value={value}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent font-sans text-sm text-admin-ink outline-none placeholder:text-admin-muted disabled:cursor-not-allowed"
        />
      </label>

      {showPanel && (
        <div className="absolute top-[calc(100%+6px)] z-30 max-h-72 w-full overflow-y-auto rounded-admin-lg border border-admin-border bg-admin-canvas shadow-admin-dropdown">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-admin-muted">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-admin-muted">No matches found.</div>
          ) : (
            results.map((item) => (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors hover:bg-admin-tint-strong"
              >
                {renderResult(item)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
