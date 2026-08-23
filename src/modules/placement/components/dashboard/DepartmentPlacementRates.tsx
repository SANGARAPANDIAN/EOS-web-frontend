import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface DepartmentPlacementRatesProps {
  data: { department: string; placed: number; total: number }[];
}

export function DepartmentPlacementRates({ data }: DepartmentPlacementRatesProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-ink">Department performance</div>
          <div className="mt-0.5 text-[11.5px] text-muted">Placed against registered, current cycle</div>
        </div>
        <Link
          href="/placement/placements"
          className="flex h-[30px] items-center rounded-[7px] border border-border-default bg-surface px-[11px] text-[11.5px] text-body hover:bg-surface-tint"
        >
          Outcomes
        </Link>
      </div>

      {data.length === 0 ? (
        <p className="mt-6 text-[13px] text-subtle">No departments on file yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-[26px] gap-y-3">
          {data.map((d) => {
            const pct = d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0;
            const barColor = pct >= 65 ? "bg-primary" : "bg-accent-200";
            return (
              <div key={d.department} className="flex flex-col gap-[5px]">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-ink">{d.department}</span>
                  <span className="font-mono text-[11px] text-muted">
                    {d.placed}/{d.total} · {pct}%
                  </span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-[4px] bg-surface-tint">
                  <div className={`h-full rounded-[4px] ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
