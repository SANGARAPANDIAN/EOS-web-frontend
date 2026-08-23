import { Card } from "@/components/ui/Card";
import type { TopRecruiter } from "../../types";

interface TopRecruitersCardProps {
  data: TopRecruiter[];
}

export function TopRecruitersCard({ data }: TopRecruitersCardProps) {
  const max = Math.max(...data.map((d) => d.offers), 1);

  return (
    <Card>
      <div className="text-sm font-bold text-ink">Top recruiters</div>
      <div className="mt-0.5 text-[11.5px] text-muted">Offers made this cycle</div>

      <div className="mt-3.5 flex flex-col gap-[11px]">
        {data.length === 0 && <p className="text-[13px] text-subtle">No offers recorded yet.</p>}
        {data.map((r) => (
          <div key={r.company} className="flex flex-col gap-[5px]">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-ink">{r.company}</span>
              <span className="font-mono text-[11px] text-muted">
                {r.offers} offer{r.offers === 1 ? "" : "s"} · avg ₹{r.avgPackageLpa} LPA
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-[4px] bg-surface-tint">
              <div className="h-full rounded-[4px] bg-primary" style={{ width: `${(r.offers / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
