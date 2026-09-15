"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownItem {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

type PanelPosition = { top: number; left: number } | { top: number; right: number };

function computePosition(triggerEl: HTMLElement, align: "left" | "right"): PanelPosition {
  const rect = triggerEl.getBoundingClientRect();
  const top = rect.bottom + 8;
  return align === "right" ? { top, right: window.innerWidth - rect.right } : { top, left: rect.left };
}

/**
 * Trigger button + floating menu panel — column-visibility menu, per-row
 * actions. The panel renders in a portal to document.body, positioned from
 * the trigger's real viewport rect, rather than living in normal document
 * flow inside the trigger's own wrapper — an in-flow panel gets silently
 * clipped by any scrollable/overflow-hidden ancestor (e.g. a DataTable
 * that's shrunk to fit a single filtered row, cutting off all but the
 * first menu item).
 *
 * Opens downward by default, then flips to open upward (bottom of the
 * panel anchored to the trigger's top) whenever the trigger is close enough
 * to the bottom of the viewport that opening downward would run the panel
 * off-screen — e.g. the last row of a long table. The flip only happens
 * once the panel's real rendered height is known (via panelRef, in a
 * layout effect that runs before paint), since that height depends on how
 * many items this particular menu has.
 */
export function Dropdown({ trigger, items, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const triggerEl = triggerRef.current;
    function updatePosition() {
      setPosition(computePosition(triggerEl, align));
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, align]);

  // Flip-upward correction — runs after the panel above has actually
  // rendered (so panelRef.current.offsetHeight is real), before the
  // browser paints. Bails once the flip has already been applied (the
  // recomputed top would be unchanged) so this can't loop.
  useLayoutEffect(() => {
    if (!open || !position || !triggerRef.current || !panelRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelHeight = panelRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    if (panelHeight > spaceBelow && spaceAbove >= panelHeight) {
      const flippedTop = rect.top - panelHeight - 8;
      setPosition((prev) => (prev && prev.top !== flippedTop ? { ...prev, top: flippedTop } : prev));
    }
  }, [open, position]);

  return (
    <>
      <span ref={triggerRef} className="inline-block" onClick={() => setOpen((v) => !v)}>
        {trigger}
      </span>
      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: position.top,
              ...("left" in position ? { left: position.left } : { right: position.right }),
            }}
            className="z-40 min-w-[200px] overflow-hidden rounded-admin-lg border border-admin-border bg-admin-canvas shadow-admin-dropdown"
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-sans text-sm text-admin-ink transition-colors hover:bg-admin-tint-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
