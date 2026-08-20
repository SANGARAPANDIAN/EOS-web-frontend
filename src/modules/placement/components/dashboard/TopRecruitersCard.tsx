import { SectionCard, PendingNotice } from "@/modules/admin/components/ui";
import type { TopRecruiter } from "@/modules/placement/api/dashboard";

interface TopRecruitersCardProps {
  data: TopRecruiter[];
  isLoading: boolean;
}

/** Recruiters ranked by offers made this cycle — real counts from GET /drives/placement-stats. */
export function TopRecruitersCard({ data, isLoading }: TopRecruitersCardProps) {
  const max = Math.max(...data.map((d) => d.offers), 1);

  return (
    <SectionCard title="Top recruiters" subtitle="Offers made this cycle">
      {data.length === 0 ? (
        <PendingNotice reason={isLoading ? "Loading…" : "No offers recorded yet."} height={100} />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((r) => (
            <div key={r.company} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-admin-ink">{r.company}</span>
                <span className="font-mono text-[11.5px] text-admin-muted">
                  {r.offers} offer{r.offers === 1 ? "" : "s"} · avg ₹{r.avgPackageLpa} LPA
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
                <div className="h-full rounded-admin-pill bg-admin-primary" style={{ width: `${(r.offers / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
