"use client";

// Pixel-exact port of the repeated "standard page header" block from
// "Billing Module - Web/Billing Admin.dc.html" (lines 207-228) — used at
// the top of every Billing sub-page except the Dashboard (which has its
// own greeting header).

export function PageHeader({
  title,
  sub,
  actionLabel,
  onAction,
  backLabel,
  onBack,
}: {
  title: string;
  sub: string;
  actionLabel?: string;
  onAction?: () => void;
  backLabel?: string;
  onBack?: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "#64748b", fontWeight: 500 }}>
        {backLabel && onBack && (
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M15 19l-7-7 7-7" /></svg>
            Back to {backLabel}
          </button>
        )}
        <span>Home</span><span style={{ color: "#cbd5e1" }}>›</span><span>Billing</span><span style={{ color: "#cbd5e1" }}>›</span><span style={{ color: "#0f172a", fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, margin: "10px 0 22px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: -0.025 }}>{title}</h1>
          <div style={{ fontSize: 14.5, color: "#64748b", marginTop: 6 }}>{sub}</div>
        </div>
        {actionLabel && onAction && (
          <button onClick={onAction} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 9, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 2px rgba(15,23,42,.16)" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span><span>{actionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Honest "this screen has no real backend yet" banner. Used on the handful
// of Billing pages that are confirmed (by schema/controller audit) to have
// no real table or endpoint behind them at all — not just a missing field.
// Kept visible in the page body (not only a code comment) so anyone using
// the screen sees plainly that the numbers below are fabricated sample
// data, not live figures.
export function SampleDataBanner({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth={2} style={{ flex: "0 0 16px" }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
      <span>{text}</span>
    </div>
  );
}

export const cardSx = { transition: "transform .16s ease,border-color .16s ease,box-shadow .16s ease", background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "20px 22px" } as const;
export const tableWrapSx = { background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, overflow: "auto" } as const;
export const thSx = { textAlign: "left" as const, padding: "14px 18px", fontSize: 12, fontWeight: 700, color: "#64748b" };
export const thRightSx = { ...thSx, textAlign: "right" as const };
export const tdSx = { padding: "13px 18px", fontSize: 13.5 };
export const monoSx = { fontFamily: "'IBM Plex Mono',monospace" } as const;
export const filterBarSx = { background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", flexWrap: "wrap" as const, gap: 10, alignItems: "center" };
export const inputSx = { flex: "1 1 280px", minWidth: 240, padding: "10px 14px", border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 13.5, outline: "none" } as const;
export const selectSx = { padding: "10px 12px", border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 13.5, minWidth: 170, background: "#fff" } as const;
export const clearBtnSx = { background: "transparent", border: 0, color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "8px 6px" } as const;
