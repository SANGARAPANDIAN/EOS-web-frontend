import { Card } from "@/components/ui/Card";
import type { PackageBand } from "../../types";

interface PackageDistributionDonutProps {
  data: PackageBand[];
}

const SEGMENT_COLORS = ["#b8ccf5", "#6b94ec", "#2f62e0", "#0b2f8f"];
// r=15.9 makes the circle's circumference ≈100, so dash/offset can be plain
// percentages — same trick the reference markup uses.
const R = 15.9;

export function PackageDistributionDonut({ data }: PackageDistributionDonutProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const segments = data.reduce<{ color: string; dash: string; offset: string; cumulative: number }[]>((acc, d, i) => {
    const frac = total > 0 ? (d.count / total) * 100 : 0;
    const cumulativeBefore = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    return [
      ...acc,
      {
        color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
        dash: `${frac.toFixed(2)} ${(100 - frac).toFixed(2)}`,
        offset: cumulativeBefore.toFixed(2),
        cumulative: cumulativeBefore + frac,
      },
    ];
  }, []);

  return (
    <Card>
      <div className="text-sm font-bold text-ink">Package distribution</div>
      <div className="mt-0.5 text-[11.5px] text-muted">{total.toLocaleString("en-IN")} accepted offers</div>

      {total === 0 ? (
        <p className="mt-6 text-[13px] text-subtle">No accepted offers yet.</p>
      ) : (
        <div className="mt-3.5 flex items-center gap-[18px]">
          <svg viewBox="0 0 42 42" className="h-[118px] w-[118px] shrink-0 -rotate-90">
            <circle cx="21" cy="21" r={R} fill="none" stroke="#eceff5" strokeWidth={7} />
            {segments.map((s, i) => (
              <circle
                key={i}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={7}
                strokeDasharray={s.dash}
                strokeDashoffset={`-${s.offset}`}
              />
            ))}
          </svg>
          <div className="flex flex-1 flex-col gap-2.5">
            {data.map((d, i) => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="size-[9px] shrink-0 rounded-[2px]" style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                <span className="flex-1 text-[11.5px] text-body">₹{d.label}</span>
                <span className="font-mono text-[11.5px] font-medium">{d.count.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
