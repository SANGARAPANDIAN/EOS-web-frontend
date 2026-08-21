"use client";

// Generic modal shell, pixel-exact port of the shared modal chrome from
// "Billing Module - Web/Billing Admin.dc.html" (lines 1586-2031) — the
// design reuses one modal frame across Receive Payment/Add Structure/Add
// Quota/Add DD/Add Concession/Add Announcement/Regenerate Demand/Assign
// Students; each page composes this with its own field content as
// children, same split as Secretary's QuickModal.

export function BillingModal({
  open,
  title,
  sub,
  cta,
  onClose,
  onSubmit,
  error,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  sub: string;
  cta: string;
  onClose: () => void;
  onSubmit: () => void;
  error?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: wide ? 640 : 540, maxHeight: "88vh", overflowY: "auto", padding: "24px 26px 22px", boxShadow: "0 30px 70px rgba(15,23,42,.3)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{sub}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>

        {error && <div style={{ background: "#f1f5f9", color: "#0f2d6b", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, fontWeight: 600, marginTop: 14 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ background: "#fff", border: "1px solid #dfe4ec", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}>Cancel</button>
          <button onClick={onSubmit} style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 9, padding: "10px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>{cta}</button>
        </div>
      </div>
    </div>
  );
}

export const fieldLabelSx = { fontSize: 13, fontWeight: 700, marginBottom: 6 } as const;
export const fieldInputSx = { width: "100%", padding: "11px 12px", border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 13.5 } as const;
export const fieldMonoSx = { ...fieldInputSx, fontFamily: "'IBM Plex Mono',monospace" } as const;
export const fieldRow2Sx = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as const;
