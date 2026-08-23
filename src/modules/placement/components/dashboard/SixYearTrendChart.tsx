import { Card } from "@/components/ui/Card";
import type { TrendPoint } from "../../types";

interface SixYearTrendChartProps {
  data: TrendPoint[];
}

const WIDTH = 300;
const HEIGHT = 110;
const PAD_X = 10;
const PAD_Y = 15;

/** Point math generalized to handle any N. */
export function SixYearTrendChart({ data }: SixYearTrendChartProps) {
  const max = Math.max(...data.map((d) => d.rate), 1);
  const min = Math.min(...data.map((d) => d.rate), 0);
  const span = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? PAD_X + (i / (data.length - 1)) * (WIDTH - PAD_X * 2) : WIDTH / 2;
    const y = HEIGHT - PAD_Y - ((d.rate - min) / span) * (HEIGHT - PAD_Y * 2);
    return { x, y, ...d };
  });

  const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints = `${PAD_X},92 ${linePoints} ${WIDTH - PAD_X},92`;

  return (
    <Card>
      <div className="text-sm font-bold text-ink">Six-year trend</div>
      <div className="mt-0.5 text-[11.5px] text-muted">Placement percentage by cycle</div>

      {data.length === 0 ? (
        <p className="mt-6 text-[13px] text-subtle">Not enough batch history yet.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="mt-3 h-[118px] w-full">
            <line x1="0" y1="92" x2={WIDTH} y2="92" stroke="#e6eaf1" strokeWidth={1} />
            <line x1="0" y1="50" x2={WIDTH} y2="50" stroke="#eef1f6" strokeWidth={1} />
            <polyline points={areaPoints} fill="#eef3fe" stroke="none" />
            <polyline points={linePoints} fill="none" stroke="#1d4ed8" strokeWidth={2.4} strokeLinejoin="round" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3.2} fill="#fff" stroke="#1d4ed8" strokeWidth={2} />
            ))}
          </svg>
          <div className="mt-1 flex justify-between">
            {data.map((d) => (
              <div key={d.cycle} className="text-center">
                <div className="font-mono text-[10.5px] font-medium">{d.rate}%</div>
                <div className="mt-0.5 text-[9.5px] text-subtle">{d.cycle}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
