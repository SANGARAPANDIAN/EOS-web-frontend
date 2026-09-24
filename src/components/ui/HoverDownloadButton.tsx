"use client";

import { useState, type MouseEvent } from "react";

interface HoverDownloadButtonProps {
  /** Whether the button should be showing — set from the parent card's own onMouseEnter/onMouseLeave, so it reveals anywhere over the card, not just over this tiny icon. */
  visible: boolean;
  onDownload: () => void | Promise<void>;
  title?: string;
  disabled?: boolean;
}

/**
 * Small circular download icon, absolutely positioned top-right of a card
 * — invisible until `visible` is true. Plain inline styles (no Tailwind
 * dependency), so it drops into both Tailwind-based pages and the
 * inline-style-ported Advisor/Faculty pages the same way. The parent card
 * needs `position: "relative"` and its own hover-state tracking; this
 * component only renders the reveal + the click/busy handling.
 */
export function HoverDownloadButton({ visible, onDownload, title = "Download report", disabled }: HoverDownloadButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onDownload();
    } finally {
      setBusy(false);
    }
  }

  const shown = visible || busy;

  return (
    <button
      type="button"
      title={title}
      onClick={handleClick}
      disabled={disabled || busy}
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: "1px solid #E2E8F0",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? "auto" : "none",
        transition: "opacity 0.15s ease",
        boxShadow: "0 2px 6px rgba(15,23,42,0.08)",
        zIndex: 2,
      }}
    >
      {busy ? (
        <span style={{ fontSize: 10, fontWeight: 800, color: "#1D4ED8" }}>···</span>
      ) : (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      )}
    </button>
  );
}
