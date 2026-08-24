"use client";

import { FinanceIcon } from "./icons";

// Design tokens and primitives for the Finance portal, taken verbatim from the
// Secretary module so the two portals are visually identical: same card border
// (#e5e9f2), same 14px radius, same 22px gutters, same type scale, and a
// single-hue blue ramp. No status colour is used anywhere — state is conveyed
// by weight, fill and position instead, which is why nothing here is green,
// amber or red.

export const BLUE = {
  ink: "#0f172a",
  strong: "#1e3a8a",
  primary: "#1d4ed8",
  mid: "#2563eb",
  soft: "#eef4ff",
  line: "#dbe6ff",
  wash: "#f7faff",
} as const;

export const GREY = {
  text: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e5e9f2",
  hair: "#eef2f7",
  rule: "#f5f7fa",
} as const;

export const cardSx = {
  background: "#ffffff",
  border: `1px solid ${GREY.border}`,
  borderRadius: 14,
  padding: 22,
} as const;

export const panelTitleSx = { margin: 0, fontSize: 15.7, fontWeight: 700 } as const;
export const monoSx = { fontFamily: "'IBM Plex Mono',monospace" } as const;

export const inputSx = {
  flex: "1 1 260px",
  minWidth: 220,
  padding: "11px 14px",
  border: `1px solid ${GREY.border}`,
  borderRadius: 10,
  fontSize: 13.1,
  outline: "none",
  background: "#fff",
} as const;

export const selectSx = {
  padding: "11px 13px",
  border: `1px solid ${GREY.border}`,
  borderRadius: 10,
  fontSize: 13.1,
  minWidth: 168,
  background: "#fff",
} as const;

export const filterBarSx = {
  background: "#fff",
  border: `1px solid ${GREY.border}`,
  borderRadius: 14,
  padding: "14px 16px",
  marginBottom: 22,
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 10,
  alignItems: "center",
};

export const primaryBtnSx = {
  border: 0,
  background: BLUE.strong,
  color: "#fff",
  fontSize: 11.7,
  fontWeight: 600,
  borderRadius: 9,
  padding: "9px 16px",
  cursor: "pointer",
} as const;

export const softBtnSx = {
  border: `1px solid ${BLUE.line}`,
  background: "#fff",
  color: BLUE.strong,
  fontSize: 11.3,
  fontWeight: 600,
  borderRadius: 9,
  padding: "8px 12px",
  cursor: "pointer",
} as const;

export const dangerBtnSx = {
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  fontSize: 11.3,
  fontWeight: 600,
  borderRadius: 9,
  padding: "8px 12px",
  cursor: "pointer",
} as const;

export const clearBtnSx = {
  background: "transparent",
  border: 0,
  color: GREY.muted,
  fontSize: 12.6,
  fontWeight: 600,
  cursor: "pointer",
  padding: "8px 6px",
} as const;

/**
 * Segmented switch — the two-option pill used for Tracking / History.
 *
 * Shape follows the platform's existing switch (a light tray holding the
 * options; the selected one lifts onto a white surface with a blue label and a
 * ring). Renders as real buttons with aria-pressed so it is operable by
 * keyboard and announced correctly, rather than as styled divs.
 */
export function SegmentedSwitch<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: GREY.hair,
        border: `1px solid ${GREY.border}`,
        borderRadius: 12,
        padding: 4,
        flex: "0 0 auto",
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "1px solid transparent",
              // Selected reads as a solid dark-blue pill with white text — the
              // same treatment as the header's semester pill, so "selected"
              // looks the same everywhere in the portal.
              background: active ? BLUE.strong : "transparent",
              color: active ? "#fff" : GREY.muted,
              fontSize: 13.1,
              fontWeight: 600,
              borderRadius: 9,
              padding: "9px 18px",
              cursor: active ? "default" : "pointer",
              transition: "background .16s ease, color .16s ease",
              whiteSpace: "nowrap",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Breadcrumb + title block, matching Secretary's page headings. */
export function PageHead({
  title,
  sub,
  actionLabel,
  onAction,
  right,
}: {
  title: string;
  sub: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Right-aligned control (e.g. a Tracking/History switch). */
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 26, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>{title}</h1>
        <p style={{ margin: "9px 0 0", fontSize: 13.5, color: GREY.muted }}>{sub}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {right}
        {actionLabel && onAction && (
          <button data-fin-soft="" onClick={onAction} style={{ ...primaryBtnSx, fontSize: 12.6, padding: "12px 20px", whiteSpace: "nowrap" }}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * State chip. Single hue by design: `solid` marks the live/actionable state,
 * `soft` a normal state, `quiet` an inactive or closed one.
 */
export function Chip({
  variant = "soft",
  children,
}: {
  variant?: "solid" | "soft" | "quiet" | "outline";
  children: React.ReactNode;
}) {
  const styles = {
    solid: { background: BLUE.strong, color: "#fff", border: "1px solid transparent" },
    soft: { background: BLUE.soft, color: BLUE.strong, border: "1px solid transparent" },
    quiet: { background: GREY.hair, color: GREY.muted, border: "1px solid transparent" },
    outline: { background: "#fff", color: BLUE.strong, border: `1px solid ${BLUE.line}` },
  }[variant];

  return (
    <span
      style={{
        ...styles,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        padding: "5px 11px",
        fontSize: 10.8,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** Clickable KPI tile — Secretary's stat card, exactly. */
export function StatCard({
  label,
  value,
  hi,
  sub,
  pct,
  foot,
  icon,
  onClick,
  delay = 0,
}: {
  label: string;
  value: string;
  hi?: string;
  sub?: string;
  pct?: number;
  foot?: string;
  icon: string;
  onClick?: () => void;
  delay?: number;
}) {
  return (
    <div
      data-fin-lift=""
      className="fin-rise"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "#fff",
        border: `1px solid ${GREY.border}`,
        borderRadius: 14,
        padding: "18px 20px 16px",
        minHeight: 186,
        display: "flex",
        flexDirection: "column",
        cursor: onClick ? "pointer" : "default",
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: GREY.text }}>{label}</span>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: BLUE.soft, color: BLUE.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FinanceIcon name={icon} size={19} />
        </span>
      </div>
      <div style={{ fontSize: 33, fontWeight: 700, letterSpacing: -1.3, margin: "12px 0 9px" }}>{value}</div>
      {(hi || sub) && (
        <div style={{ fontSize: 12.6, color: GREY.muted }}>
          {hi && <span style={{ color: BLUE.primary, fontWeight: 600 }}>{hi}</span>} {sub}
        </div>
      )}
      <div style={{ height: 4, borderRadius: 999, background: GREY.hair, margin: "auto 0 11px", minHeight: 4, overflow: "hidden" }}>
        <div
          className="fin-slide"
          style={{ height: "100%", borderRadius: 999, background: BLUE.primary, width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
        />
      </div>
      <div style={{ fontSize: 11.3, color: GREY.faint }}>{foot}</div>
    </div>
  );
}

/**
 * Action card that carries its own summary: a headline figure, a supporting
 * line and a share-of-total bar, so the grid reads as a set of small
 * visualisations rather than a list of links. The whole card navigates.
 */
export function ActionCard({
  label,
  metric,
  metricCaption,
  hint,
  icon,
  share,
  urgent = false,
  onClick,
  delay = 0,
}: {
  label: string;
  /** The headline figure for this area (already formatted). */
  metric: string;
  metricCaption?: string;
  hint: string;
  icon: string;
  /** 0-100: this card's share of whatever it measures, drawn as a bar. */
  share?: number;
  /** Draws attention when there is something waiting to be done. */
  urgent?: boolean;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <div
      data-fin-lift=""
      className="fin-rise"
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1px solid ${urgent ? BLUE.line : GREY.border}`,
        borderRadius: 14,
        padding: "16px 18px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          className={urgent ? "fin-node-live" : undefined}
          style={{ width: 32, height: 32, borderRadius: 9, background: urgent ? BLUE.strong : BLUE.soft, color: urgent ? "#fff" : BLUE.primary, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 32px" }}
        >
          <FinanceIcon name={icon} size={17} />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.6, fontWeight: 600, color: GREY.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
        <span style={{ fontSize: 25, fontWeight: 700, letterSpacing: -0.9, color: BLUE.ink }}>{metric}</span>
        {metricCaption && <span style={{ fontSize: 11.3, color: GREY.faint, fontWeight: 600 }}>{metricCaption}</span>}
      </div>

      <div style={{ height: 4, borderRadius: 999, background: GREY.hair, overflow: "hidden" }}>
        <div className="fin-slide" style={{ height: "100%", borderRadius: 999, background: BLUE.primary, width: `${Math.min(100, Math.max(0, share ?? 0))}%` }} />
      </div>

      <div style={{ fontSize: 11.3, color: GREY.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {hint}
      </div>
    </div>
  );
}

/** Section panel with an optional right-hand action. */
export function Panel({
  title,
  action,
  children,
  span,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  span?: number;
}) {
  return (
    <div data-fin-lift="" style={{ ...cardSx, gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
        <h2 style={panelTitleSx}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ padding: "34px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 12.6, fontWeight: 600, color: GREY.muted }}>{title}</div>
      {hint && <div style={{ fontSize: 11.8, color: GREY.faint, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ visualisations */

/**
 * Animated donut gauge. The arc is drawn with a stroke-dash animation so it
 * sweeps in on load; the track and the arc are the same hue at different
 * strengths, keeping to one colour.
 */
export function Donut({
  pct,
  label,
  caption,
  size = 168,
}: {
  pct: number;
  label: string;
  caption?: string;
  size?: number;
}) {
  const stroke = 15;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = c * (1 - clamped / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={GREY.hair} strokeWidth={stroke} />
        <circle
          className="fin-dash"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={BLUE.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          style={
            {
              strokeDashoffset: offset,
              ["--fin-dash-from" as string]: `${c}`,
              ["--fin-dash-to" as string]: `${offset}`,
            } as React.CSSProperties
          }
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: -1, color: BLUE.ink }}>{label}</div>
        {caption && <div style={{ fontSize: 11.3, color: GREY.faint, fontWeight: 600 }}>{caption}</div>}
      </div>
    </div>
  );
}

/** Animated vertical bars. Single hue; the tallest bar is the strongest. */
export function BarChart({
  data,
  height = 150,
  format,
}: {
  data: Array<{ key: string; label: string; value: number }>;
  height?: number;
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height, marginTop: 6 }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * 100);
        const strongest = d.value === max;
        return (
          <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, minWidth: 0, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ ...monoSx, fontSize: 10.8, fontWeight: 700, color: strongest ? BLUE.primary : GREY.muted, whiteSpace: "nowrap" }}>
              {format(d.value)}
            </div>
            <div
              className="fin-grow"
              title={`${d.label}: ${format(d.value)}`}
              style={{
                width: "100%",
                maxWidth: 50,
                height: `${h}%`,
                borderRadius: "8px 8px 3px 3px",
                background: strongest ? BLUE.primary : BLUE.line,
                animationDelay: `${i * 70}ms`,
              }}
            />
            <div style={{ fontSize: 10.8, color: GREY.faint, fontWeight: 600, whiteSpace: "nowrap" }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal ranked bars, for "top departments" style breakdowns. */
export function RankedBars({
  data,
  format,
}: {
  data: Array<{ key: string; label: string; value: number; meta?: string }>;
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {data.map((d, i) => (
        <div key={d.key} className="fin-rise" style={{ animationDelay: `${i * 55}ms` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 12.6, fontWeight: 600, color: BLUE.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.label}
            </span>
            <span style={{ ...monoSx, fontSize: 11.8, fontWeight: 700, whiteSpace: "nowrap", color: GREY.text }}>
              {format(d.value)}
              {d.meta && <span style={{ color: GREY.faint, fontWeight: 500 }}> · {d.meta}</span>}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: GREY.hair, overflow: "hidden" }}>
            <div className="fin-slide" style={{ height: "100%", borderRadius: 999, background: i === 0 ? BLUE.primary : BLUE.mid, width: `${(d.value / max) * 100}%`, opacity: i === 0 ? 1 : 0.75 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Slim labelled meter used inside rows and cards. */
export function Meter({ value, total, caption }: { value: number; total: number; caption?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      {caption && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.8, fontWeight: 600, color: GREY.muted, marginBottom: 5 }}>
          <span>{caption}</span>
          <span style={monoSx}>
            {value} / {total}
          </span>
        </div>
      )}
      <div style={{ height: 5, borderRadius: 999, background: GREY.hair, overflow: "hidden" }}>
        <div className="fin-slide" style={{ height: "100%", borderRadius: 999, background: BLUE.primary, width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Funnel of counts — reads as one flow rather than five coloured boxes. */
export function Funnel({
  steps,
  onStep,
}: {
  steps: Array<{ key: string; label: string; value: number }>;
  onStep?: (key: string) => void;
}) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div
            key={s.key}
            data-fin-row=""
            className="fin-rise"
            onClick={onStep ? () => onStep(s.key) : undefined}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", cursor: onStep ? "pointer" : "default", animationDelay: `${i * 50}ms` }}
          >
            <span style={{ fontSize: 12.2, fontWeight: 600, color: GREY.text, flex: "0 0 132px" }}>{s.label}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: GREY.hair, overflow: "hidden" }}>
              <div className="fin-slide" style={{ height: "100%", borderRadius: 999, background: BLUE.primary, width: `${pct}%`, opacity: 0.35 + 0.65 * (s.value / max) }} />
            </div>
            <span style={{ ...monoSx, fontSize: 13.1, fontWeight: 700, color: s.value > 0 ? BLUE.primary : GREY.faint, flex: "0 0 34px", textAlign: "right" }}>
              {s.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
