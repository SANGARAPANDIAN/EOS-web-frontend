"use client";

// Pixel-exact port of the shared "quick-add" modal from
// "Secretary Module - Web/Secretary Dashboard.dc.html" (markup lines
// 2267-2298; field-type dispatch mirrors `fieldSpecs()`/`f.isText`/
// `f.isSelect`/`f.isArea`, lines 2844+). This is the ONE generic record
// modal the design itself reuses across POP/SOP/duty-assign/escalation/
// activity/meeting/MoM/notice/event/calendar-event/document screens —
// rebuilding it once here, not per-screen, matches the design's own
// generic-vs-bespoke split (see edc-module-build memory for the same
// distinction made in the EDC module).

export type QuickFieldSpec =
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "area"; placeholder?: string };

const fieldInputSx = { width: "100%", height: 46, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 12.6, color: "#0f172a" } as const;
const fieldAreaSx = { width: "100%", minHeight: 110, border: "1px solid #e5e9f2", borderRadius: 10, padding: "12px 14px", fontSize: 12.6, color: "#0f172a", lineHeight: 1.55, resize: "vertical" as const };

export function QuickModal({
  open,
  title,
  subtitle,
  cta,
  fields,
  values,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  cta: string;
  fields: QuickFieldSpec[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, zIndex: 90 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: "86vh", overflowY: "auto", background: "#ffffff", borderRadius: 18, boxShadow: "0 30px 70px rgba(15,23,42,0.28)" }}>
        <div style={{ padding: "24px 26px 18px", borderBottom: "1px solid #eef2f7" }}>
          <div style={{ fontSize: 19.1, fontWeight: 700, letterSpacing: -0.4 }}>{title}</div>
          <div style={{ fontSize: 11.7, color: "#64748b", marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          {fields.map((f) => (
            <label key={f.key} style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 11.8, fontWeight: 600, color: "#475569", marginBottom: 7 }}>{f.label}</span>
              {f.type === "text" && (
                <input data-sec-lift="" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder} style={fieldInputSx} />
              )}
              {f.type === "select" && (
                <select data-sec-lift="" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} style={{ ...fieldInputSx, background: "#ffffff" }}>
                  {f.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              )}
              {f.type === "area" && (
                <textarea data-sec-lift="" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} placeholder={f.placeholder} style={fieldAreaSx} />
              )}
            </label>
          ))}
        </div>
        <div style={{ padding: "18px 26px 24px", borderTop: "1px solid #eef2f7", display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <span data-sec-lift="" onClick={onClose} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 12.2, fontWeight: 600, borderRadius: 10, padding: "12px 20px", cursor: "pointer" }}>Cancel</span>
          <span onClick={onSubmit} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 12.2, fontWeight: 600, borderRadius: 10, padding: "12px 24px", cursor: "pointer" }}>{cta}</span>
        </div>
      </div>
    </div>
  );
}
