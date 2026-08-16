import Link from "next/link";
import { SectionCard, PendingNotice } from "@/modules/admin/components/ui";

interface DepartmentPlacementRatesCardProps {
  data: { department: string; placed: number; total: number }[];
  isLoading: boolean;
}

/** Placed-vs-registered ratio per department, this cycle — real counts from GET /drives/placement-stats. */
export function DepartmentPlacementRatesCard({ data, isLoading }: DepartmentPlacementRatesCardProps) {
  return (
    <SectionCard
      title="Department performance"
      subtitle="Placed against registered, current cycle"
      actions={
        <Link href="/placement/placements" className="text-sm font-semibold text-admin-primary hover:text-admin-primary-dark">
          Outcomes →
        </Link>
      }
    >
      {data.length === 0 ? (
        <PendingNotice reason={isLoading ? "Loading…" : "No departments on file yet."} height={100} />
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
          {data.map((d) => {
            const pct = d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0;
            return (
              <div key={d.department} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-admin-ink">{d.department}</span>
                  <span className="font-mono text-admin-muted">
                    {d.placed}/{d.total} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
                  <div
                    className={`h-full rounded-admin-pill ${pct >= 65 ? "bg-admin-primary" : "bg-admin-subtle"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
