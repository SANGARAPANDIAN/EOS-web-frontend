import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { UpcomingDrive } from "../../types";

interface UpcomingDrivesCardProps {
  drives: UpcomingDrive[];
}

export function UpcomingDrivesCard({ drives }: UpcomingDrivesCardProps) {
  return (
    <Card>
      <div className="text-sm font-bold text-ink">Drives this month</div>
      <div className="mt-0.5 text-[11.5px] text-muted">Scheduled and in progress</div>

      <div className="mt-2.5 flex flex-col">
        {drives.map((d) => (
          <Link
            key={d.id}
            href="/placement/drives"
            className="flex items-center gap-3 border-t border-divider px-1 py-[11px] hover:bg-surface-tint"
          >
            <div className="flex h-[42px] w-10 shrink-0 flex-col items-center justify-center rounded-[8px] border border-border-default bg-surface-tint leading-[1.15]">
              <span className="font-mono text-[13px] font-medium">{d.day}</span>
              <span className="text-[9px] tracking-[.6px] text-subtle">{d.month}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold">{d.company}</div>
              {(d.role || d.venue) && (
                <div className="mt-0.5 text-[11px] text-muted">{[d.role, d.venue].filter(Boolean).join(" · ")}</div>
              )}
            </div>
            <span className="inline-block rounded-[5px] bg-accent-100 px-[9px] py-[3.5px] text-[11px] font-semibold whitespace-nowrap text-primary">
              Upcoming
            </span>
          </Link>
        ))}
        {drives.length === 0 && <p className="text-[13px] text-subtle">No drives scheduled yet.</p>}
      </div>
    </Card>
  );
}
