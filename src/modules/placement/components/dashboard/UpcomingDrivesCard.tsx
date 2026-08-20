import Link from "next/link";
import { SectionCard, PendingNotice, Badge } from "@/modules/admin/components/ui";
import type { UpcomingDrive } from "@/modules/placement/api/dashboard";

interface UpcomingDrivesCardProps {
  drives: UpcomingDrive[];
  isLoading: boolean;
}

/** Drives scheduled or in progress this month — real rows from GET /drives/placement-stats. */
export function UpcomingDrivesCard({ drives, isLoading }: UpcomingDrivesCardProps) {
  return (
    <SectionCard title="Drives this month" subtitle="Scheduled and in progress">
      {drives.length === 0 ? (
        <PendingNotice reason={isLoading ? "Loading…" : "No drives scheduled yet."} height={100} />
      ) : (
        <div className="flex flex-col">
          {drives.map((d) => (
            <Link
              key={d.id}
              href="/placement/drives"
              className="flex items-center gap-3 border-t border-admin-divider py-2.5 first:border-t-0 hover:bg-admin-tint"
            >
              <div className="flex h-[42px] w-10 shrink-0 flex-col items-center justify-center rounded-admin-sm border border-admin-border bg-admin-tint leading-tight">
                <span className="font-mono text-[13px] font-semibold text-admin-ink">{d.day}</span>
                <span className="text-[9px] tracking-wide text-admin-muted">{d.month}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-admin-ink">{d.company}</div>
                {(d.role || d.venue) && (
                  <div className="truncate text-[11px] text-admin-muted">{[d.role, d.venue].filter(Boolean).join(" · ")}</div>
                )}
              </div>
              <Badge tone="primary">Upcoming</Badge>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
