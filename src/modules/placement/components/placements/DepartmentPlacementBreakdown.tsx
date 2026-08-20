import { PendingNotice } from "@/modules/admin/components/ui";

interface DepartmentPlacementBreakdownProps {
  data: { department: string; placed: number; total: number }[];
  isLoading?: boolean;
}

/** Placed-vs-registered per department — pairs a `HorizontalBarChart`-style bar with the raw count fraction and percentage the generic chart primitive doesn't carry, so this stays a dedicated component rather than reusing that one directly. */
export function DepartmentPlacementBreakdown({ data, isLoading }: DepartmentPlacementBreakdownProps) {
  if (data.length === 0) {
    return <PendingNotice reason={isLoading ? "Loading…" : "No departments on file yet."} height={160} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => {
        const pct = d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0;
        return (
          <div key={d.department} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-admin-body">{d.department}</span>
              <span className="font-mono text-xs text-admin-muted">
                {d.placed}/{d.total} · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
              <div className="h-full rounded-admin-pill bg-admin-primary" style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
