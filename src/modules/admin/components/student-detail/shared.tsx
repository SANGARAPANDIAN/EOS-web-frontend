import type { ReactNode } from "react";

/**
 * Small presentation primitives shared by the student-detail section panels.
 * Deliberately lighter-weight than the admin kit's `DataTable`/`KpiCard` —
 * these panels need compact metric tiles and bare in-card tables, not a
 * paginated/selectable table shell. New file, not an edit to the shared kit.
 */

export type MetricTone = "success" | "warning" | "danger" | "muted";

const TONE_TEXT: Record<MetricTone, string> = {
  success: "text-admin-success-fg",
  warning: "text-admin-warning-fg",
  danger: "text-admin-danger-fg",
  muted: "text-admin-border-hover",
};

/** Compact metric tile for the small grids atop Overview/Academic/Fees/Library/Attendance panels.
    Mirrors the old console's MetricBox — value renders faint ("muted") whenever no tone is passed,
    which is how a "—" placeholder for a not-yet-available aggregate reads as intentionally blank. */
export function MetricTile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: MetricTone;
}) {
  return (
    <div className="rounded-admin-card border border-admin-border bg-admin-canvas p-4">
      <p className="text-xs text-admin-muted">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${TONE_TEXT[tone ?? "muted"]}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-admin-subtle">{note}</p>}
    </div>
  );
}

/** Dashed, centered one-line message — "Loading…" and genuine empty-but-real-data states
    (an endpoint that legitimately returned zero rows). For "this needs an endpoint that
    doesn't exist yet" framing, use the admin kit's `PendingNotice` instead. */
export function Stub({ message }: { message: string }) {
  return (
    <div className="rounded-admin-md border border-dashed border-admin-border bg-admin-tint px-4 py-6 text-center text-sm text-admin-subtle">
      {message}
    </div>
  );
}

export function SimpleTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <Stub message={emptyMessage} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-admin-divider">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-admin-divider last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2.5 text-admin-body">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DlGrid({ pairs }: { pairs: Array<[string, string | null]> }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {pairs.map(([term, value]) => (
        <div key={term} className="min-w-0">
          <p className="mb-1 text-xs font-medium text-admin-muted">{term}</p>
          <p className={value ? "text-sm text-admin-ink" : "text-sm italic text-admin-subtle"}>{value || "Not recorded"}</p>
        </div>
      ))}
    </div>
  );
}
