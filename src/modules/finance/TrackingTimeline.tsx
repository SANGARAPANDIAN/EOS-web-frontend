"use client";

import { formatDateTime, type DeliveryStatus, type OrderKind, type TrackingEvent } from "./api/finance";
import { BLUE, GREY, monoSx } from "./ui";

// Purchase and service orders progress through genuinely different lifecycles,
// so each kind declares its own labelled stages over the same stored enum:
//
//   purchase : ordered -> dispatched -> in transit -> delivered
//   service  : ordered -> reported   -> fixed      -> committed
//
// The stored values are unchanged (no schema churn); only the wording shown to
// staff differs per kind, which is why STAGES maps a status to a label rather
// than renaming anything in the database.

export interface Stage {
  status: DeliveryStatus;
  label: string;
}

const PURCHASE_STAGES: Stage[] = [
  { status: "ordered", label: "Ordered" },
  { status: "dispatched", label: "Dispatched" },
  { status: "in_transit", label: "In Transit" },
  { status: "delivered", label: "Delivered" },
];

const SERVICE_STAGES: Stage[] = [
  { status: "ordered", label: "Ordered" },
  { status: "dispatched", label: "Reported" },
  { status: "in_transit", label: "Fixed" },
  { status: "delivered", label: "Committed" },
];

export function stagesFor(kind: OrderKind): Stage[] {
  return kind === "service" ? SERVICE_STAGES : PURCHASE_STAGES;
}

/** Kind-aware label for any stored status, including the off-path ones. */
export function stageLabel(kind: OrderKind, status: string): string {
  const found = stagesFor(kind).find((s) => s.status === status);
  if (found) return found.label;
  if (status === "partially_delivered") return kind === "service" ? "Partly Fixed" : "Part Delivered";
  if (status === "cancelled") return "Cancelled";
  return status.replace(/_/g, " ");
}

/**
 * Horizontal stage tracker. Progress is real — it comes from how far the
 * stored status has advanced — and the active node pulses while the rail
 * behind it animates, so an in-flight order reads as moving at a glance.
 */
export function StageTracker({
  kind,
  status,
  compact = false,
}: {
  kind: OrderKind;
  status: DeliveryStatus;
  compact?: boolean;
}) {
  const stages = stagesFor(kind);

  if (status === "cancelled") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: GREY.faint, flex: "0 0 10px" }} />
        <span style={{ fontSize: 12.2, fontWeight: 600, color: GREY.muted }}>Cancelled</span>
      </div>
    );
  }

  const effective: DeliveryStatus = status === "partially_delivered" ? "in_transit" : status;
  const currentIndex = Math.max(0, stages.findIndex((s) => s.status === effective));
  const isFinal = status === "delivered";
  const dot = compact ? 10 : 13;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      {stages.map((stage, i) => {
        const reached = i <= currentIndex;
        const passed = i < currentIndex || isFinal;
        const isLive = i === currentIndex && !isFinal;
        const railFilled = i < currentIndex;
        const railLive = i === currentIndex && !isFinal;

        return (
          <div
            key={stage.status}
            style={{ display: "flex", alignItems: "flex-start", flex: i === stages.length - 1 ? "0 0 auto" : 1, minWidth: 0 }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
              <span
                className={isLive ? "fin-node-live" : passed ? "fin-pop" : undefined}
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: 999,
                  flex: `0 0 ${dot}px`,
                  boxSizing: "border-box",
                  background: reached ? BLUE.primary : "#fff",
                  border: reached ? `2px solid ${BLUE.primary}` : `2px solid ${GREY.border}`,
                }}
              />
              {!compact && (
                <span style={{ fontSize: 10.8, fontWeight: reached ? 600 : 500, color: reached ? BLUE.strong : GREY.faint, whiteSpace: "nowrap" }}>
                  {stage.label}
                </span>
              )}
            </div>
            {i < stages.length - 1 && (
              <div
                className={railLive ? "fin-rail-live" : undefined}
                style={{
                  flex: 1,
                  height: 3,
                  minWidth: 16,
                  borderRadius: 2,
                  margin: `${(dot - 3) / 2}px 6px 0`,
                  background: railFilled ? BLUE.primary : railLive ? undefined : GREY.hair,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Attributed history from the append-only event table. */
export function StageHistory({ kind, events }: { kind: OrderKind; events: TrackingEvent[] }) {
  if (events.length === 0) {
    return <div style={{ fontSize: 11.8, color: GREY.faint }}>No history recorded yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <div key={e.id} className="fin-rise" style={{ display: "flex", gap: 12, animationDelay: `${Math.min(i * 45, 250)}ms` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 12px" }}>
              <span
                className={last ? "fin-node-live" : undefined}
                style={{ width: 10, height: 10, borderRadius: 999, background: BLUE.primary, marginTop: 4, flex: "0 0 10px" }}
              />
              {!last && <span style={{ width: 2, flex: 1, background: GREY.hair, marginTop: 3 }} />}
            </div>
            <div style={{ paddingBottom: last ? 0 : 15, minWidth: 0 }}>
              <div style={{ fontSize: 12.2, fontWeight: 600, color: BLUE.ink }}>
                {stageLabel(kind, e.to_status)}
                {e.from_status && (
                  <span style={{ fontWeight: 500, color: GREY.faint }}> · from {stageLabel(kind, e.from_status)}</span>
                )}
              </div>
              <div style={{ fontSize: 11.3, color: GREY.muted, marginTop: 2 }}>
                {formatDateTime(e.changed_at)}
                {e.changed_by && ` · ${e.changed_by}`}
              </div>
              {e.note && <div style={{ fontSize: 11.6, color: GREY.text, marginTop: 3 }}>{e.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact numeric badge pair used in tracking rows. */
export function CountPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: GREY.faint, letterSpacing: 0.3 }}>{label}</span>
      <span style={{ ...monoSx, fontSize: 13.1, fontWeight: 700, color: BLUE.ink }}>{value}</span>
    </div>
  );
}
