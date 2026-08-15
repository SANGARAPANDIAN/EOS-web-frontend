"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

export interface ColumnOption {
  key: string;
  label: string;
  /** Always visible, not offered as a toggle (e.g. the identity column). */
  locked?: boolean;
}

interface ColumnsMenuProps {
  columns: ColumnOption[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}

const PANEL_WIDTH = 224;

export function ColumnsMenu({ columns, visible, onToggle }: ColumnsMenuProps) {
  const [open, setOpen] = useState(false);
  // Which side the panel anchors to is decided at open time from the button's
  // actual position — it sits at the end of a flex-wrap toolbar, so whether
  // it lands near the left or right viewport edge varies with viewport width.
  const [align, setAlign] = useState<"left" | "right">("right");
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const roomOnRight = window.innerWidth - rect.left;
    setAlign(roomOnRight >= PANEL_WIDTH ? "left" : "right");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-admin-control border border-admin-border bg-admin-canvas px-3.5 text-sm font-semibold text-admin-ink hover:bg-admin-tint-strong"
      >
        <Icon name="view_column" size={18} />
        Columns
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-20 mt-2 w-56 rounded-admin-lg border border-admin-border bg-admin-canvas py-2 shadow-admin-dropdown",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          <p className="px-3 pb-1.5 text-[11px] font-bold tracking-[.09em] text-admin-subtle uppercase">Visible columns</p>
          {columns.map((col) => {
            const isVisible = col.locked || visible.has(col.key);
            return (
              <button
                key={col.key}
                type="button"
                disabled={col.locked}
                onClick={() => onToggle(col.key)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                  col.locked ? "cursor-default text-admin-subtle" : "text-admin-body hover:bg-admin-tint-strong",
                )}
              >
                {col.label}
                {isVisible && <Icon name="check" size={17} className="text-admin-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
