import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/modules/admin/components/ui";
import { EmptyState } from "@/modules/admin/components/ui";

/**
 * Small presentation primitives shared by the faculty-detail section panels
 * — deliberately lighter-weight than the admin kit's DataTable, these panels
 * only need a label/value grid, compact stat tiles, and a bare in-card
 * table. New file, mirrors the equivalent student-detail primitives without
 * importing across modules.
 */

export function InfoGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">{label}</p>
          <p className="mt-1 text-sm font-medium text-admin-ink">{value}</p>
        </div>
      ))}
    </div>
  );
}

export type MiniStatTone = "success" | "warning" | "danger" | "primary";

const TONE_BAR: Record<MiniStatTone, string> = {
  success: "bg-admin-success-fg",
  warning: "bg-admin-warning-fg",
  danger: "bg-admin-danger-fg",
  primary: "bg-admin-primary",
};

export function MiniStat({ label, value, caption, tone }: { label: string; value: string; caption: string; tone?: MiniStatTone }) {
  return (
    <div className="rounded-admin-card border border-admin-border bg-admin-canvas p-4">
      <p className="text-sm font-medium text-admin-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-admin-ink">{value}</p>
        {tone && <span className={`h-1.5 w-5 rounded-admin-pill ${TONE_BAR[tone]}`} />}
      </div>
      <p className="text-xs text-admin-muted">{caption}</p>
    </div>
  );
}

export function SimpleTable({ headers, rows, emptyTitle, emptyDescription }: { headers: string[]; rows: ReactNode[][]; emptyTitle: string; emptyDescription?: string }) {
  if (rows.length === 0) {
    return <EmptyState icon="inbox" title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="overflow-hidden rounded-admin-lg border border-admin-border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-admin-divider bg-admin-tint">
              {headers.map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-admin-divider last:border-b-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-admin-body">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** on_vacation only ever appears as an aggregate stat, never a day-level status — kept here as a defensive fallback. */
export const ATTENDANCE_STATUS_STYLES: Record<string, { label: string; tone: BadgeTone }> = {
  full_day: { label: "Full Day", tone: "success" },
  half_day: { label: "Half Day", tone: "warning" },
  absent: { label: "Absent", tone: "danger" },
  on_duty: { label: "On Duty", tone: "primary" },
  on_leave: { label: "On Leave", tone: "primary" },
  on_vacation: { label: "On Vacation", tone: "primary" },
  weekly_off: { label: "Weekly Off", tone: "neutral" },
  holiday: { label: "Holiday", tone: "neutral" },
};

export function AttendanceStatusBadge({ status }: { status: string }) {
  const style = ATTENDANCE_STATUS_STYLES[status] ?? { label: status, tone: "neutral" as BadgeTone };
  return <Badge tone={style.tone}>{style.label}</Badge>;
}

export function formatDayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
