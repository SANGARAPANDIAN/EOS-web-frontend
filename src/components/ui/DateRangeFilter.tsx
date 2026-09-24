"use client";

import type { CSSProperties } from "react";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Shown only when a range is actually set — clears both fields back to "no filter". */
  onClear?: () => void;
  className?: string;
  style?: CSSProperties;
}

const inputStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 9,
  border: "1px solid #E2E8F0",
  fontSize: 12.5,
  fontWeight: 600,
  color: "#1E293B",
  outline: "none",
  background: "#fff",
};

const labelStyle: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: "#94A3B8",
};

/**
 * Shared From/To date-range filter — one look everywhere it's used,
 * replacing each report page's own local date-input pair. Purely
 * controlled: the caller owns `from`/`to` state and re-derives its data
 * from them (client-side filter, or passed through to the backend as query
 * params) — this component only renders the inputs.
 */
export function DateRangeFilter({ from, to, onFromChange, onToChange, onClear, className, style }: DateRangeFilterProps) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", ...style }}>
      <span style={labelStyle}>From</span>
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} style={inputStyle} />
      <span style={labelStyle}>To</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} style={inputStyle} />
      {(from || to) && onClear && (
        <button
          type="button"
          onClick={onClear}
          style={{ border: "none", background: "none", color: "#1D4ED8", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
