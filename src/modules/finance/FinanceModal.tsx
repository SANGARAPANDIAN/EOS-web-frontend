"use client";

import { useEffect } from "react";

// Same modal chrome as the Billing module's BillingModal (identical overlay
// colour, card radius, footer button styling) with two additions the Finance
// flows need: Escape-to-close and a busy state, because these dialogs commit
// money and must not be double-submitted.

export function FinanceModal({
  open,
  title,
  sub,
  cta,
  onClose,
  onSubmit,
  busy = false,
  disabled = false,
  width = 520,
  children,
}: {
  open: boolean;
  title: string;
  sub?: string;
  cta: string;
  onClose: () => void;
  onSubmit: () => void;
  busy?: boolean;
  disabled?: boolean;
  width?: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={() => !busy && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fin-pop"
        style={{
          width,
          maxWidth: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(15,23,42,.26)",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: "#64748b", marginTop: 5 }}>{sub}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "18px 0 20px" }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              background: "#fff",
              border: "1px solid #e5e9f2",
              borderRadius: 9,
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 700,
              color: "#0f172a",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={busy || disabled}
            style={{
              background: "#1e3a8a",
              color: "#fff",
              border: 0,
              borderRadius: 9,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: busy || disabled ? "not-allowed" : "pointer",
              opacity: busy || disabled ? 0.55 : 1,
            }}
          >
            {busy ? "Working…" : cta}
          </button>
        </div>
      </div>
    </div>
  );
}

// Field tokens match the Secretary module's form controls (same border
// colour, radius and type size) so dialogs feel identical across portals.
export const fieldLabelSx = { fontSize: 12.2, fontWeight: 600, color: "#334155", marginBottom: 6 } as const;
export const fieldInputSx = { width: "100%", padding: "11px 13px", border: "1px solid #e5e9f2", borderRadius: 10, fontSize: 13.1, outline: "none", boxSizing: "border-box" as const, background: "#fff" };
export const fieldMonoSx = { ...fieldInputSx, fontFamily: "'IBM Plex Mono',monospace" };
export const fieldRow2Sx = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as const;
