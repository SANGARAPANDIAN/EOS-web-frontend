import { Card } from "@/components/ui/Card";

interface DepartmentPlacementBreakdownProps {
  data: { department: string; placed: number; total: number }[];
}

export function DepartmentPlacementBreakdown({ data }: DepartmentPlacementBreakdownProps) {
  return (
    <Card>
      <div className="text-sm font-bold text-ink">Department-wise placement</div>
      <div className="mt-0.5 text-[11.5px] text-muted">Placed vs registered</div>

      {data.length === 0 ? (
        <p className="mt-6 text-[13px] text-subtle">No departments on file yet.</p>
      ) : (
        <div className="mt-3.5 flex flex-col gap-3">
          {data.map((d) => {
            const pct = d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0;
            return (
              <div key={d.department} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{d.department}</span>
                  <span className="font-mono text-[11px] text-muted">
                    {d.placed}/{d.total} · {pct}%
                  </span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-[4px] bg-surface-tint">
                  <div className={`h-full rounded-[4px] ${pct >= 65 ? "bg-primary" : "bg-accent-200"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
