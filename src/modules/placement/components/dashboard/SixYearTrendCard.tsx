import { SectionCard, PendingNotice } from "@/modules/admin/components/ui";
import type { TrendPoint } from "@/modules/placement/api/dashboard";

interface SixYearTrendCardProps {
  data: TrendPoint[];
  isLoading: boolean;
}

const WIDTH = 300;
const HEIGHT = 110;
const PAD_X = 10;
const BASELINE_Y = 92;

/** Placement-rate trend across batch cycles — real figures from GET /drives/placement-stats; point math generalized to any N points, not a hardcoded six. */
export function SixYearTrendCard({ data, isLoading }: SixYearTrendCardProps) {
  if (data.length === 0) {
    return (
      <SectionCard title="Six-year trend" subtitle="Placement percentage by cycle">
        <PendingNotice reason={isLoading ? "Loading…" : "Not enough batch history yet."} height={140} />
      </SectionCard>
    );
  }

  const max = Math.max(...data.map((d) => d.rate), 1);
  const min = Math.min(...data.map((d) => d.rate), 0);
  const span = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? PAD_X + (i / (data.length - 1)) * (WIDTH - PAD_X * 2) : WIDTH / 2;
    const y = BASELINE_Y - ((d.rate - min) / span) * (BASELINE_Y - 15);
    return { x, y, ...d };
  });

  const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints = `${PAD_X},${BASELINE_Y} ${linePoints} ${WIDTH - PAD_X},${BASELINE_Y}`;

  return (
    <SectionCard title="Six-year trend" subtitle="Placement percentage by cycle">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-[118px] w-full" aria-hidden="true">
        <line x1="0" y1={BASELINE_Y} x2={WIDTH} y2={BASELINE_Y} stroke="#eaf0fb" strokeWidth={1} />
        <line x1="0" y1="50" x2={WIDTH} y2="50" stroke="#f1f5f9" strokeWidth={1} />
        <polyline points={areaPoints} fill="#eaf0fb" stroke="none" />
        <polyline points={linePoints} fill="none" stroke="#1d47ae" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.cycle} cx={p.x} cy={p.y} r={3.2} fill="#fff" stroke="#1d47ae" strokeWidth={2} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        {data.map((d) => (
          <div key={d.cycle} className="text-center">
            <div className="font-mono text-[10.5px] font-semibold text-admin-ink">{d.rate}%</div>
            <div className="mt-0.5 text-[9.5px] text-admin-subtle">{d.cycle}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
