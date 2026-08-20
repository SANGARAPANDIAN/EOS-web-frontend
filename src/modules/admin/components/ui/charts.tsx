/**
 * Hand-rolled SVG chart primitives — no charting library is installed in
 * either repo, and none of these shapes need one.
 */

const DATA_STRONG = "#1d47ae"; // --color-admin-primary
const DATA_WEAK = "#eaf0fb"; // --color-admin-tint-deep

export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 56;
  const h = 24;
  const barW = w / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className ?? "h-6 w-14"} aria-hidden="true">
      {data.map((v, i) => {
        const barH = Math.max(2, (v / max) * h);
        const isLast = i === data.length - 1;
        return (
          <rect
            key={i}
            x={i * barW + 1}
            y={h - barH}
            width={Math.max(1.5, barW - 2)}
            height={barH}
            rx={1}
            fill={isLast ? DATA_STRONG : DATA_WEAK}
          />
        );
      })}
    </svg>
  );
}

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 15.9155; // circumference == 100 at this radius, so % maps directly to dash length
  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
          {total > 0 &&
            data.map((slice) => {
              const pct = (slice.value / total) * 100;
              const dash = `${pct} ${100 - pct}`;
              const offset = -cumulative;
              cumulative += pct;
              return (
                <circle
                  key={slice.label}
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="4.5"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  pathLength={100}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-admin-ink">{centerValue}</span>
          {centerLabel && <span className="text-xs text-admin-muted">{centerLabel}</span>}
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-admin-body">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
              {slice.label}
            </span>
            <span className="flex items-center gap-2 font-mono tabular-nums text-admin-ink">
              <span className="font-semibold">{slice.value}</span>
              <span className="w-10 text-right text-xs text-admin-subtle">
                {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface SeriesPoint {
  label: string;
  value: number;
}

export function HorizontalBarChart({ data }: { data: SeriesPoint[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-admin-body">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
            <div
              className="h-full rounded-admin-pill bg-admin-primary"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VerticalBarChart({
  data,
  height = 180,
  format,
}: {
  data: SeriesPoint[];
  height?: number;
  format?: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[11px] font-medium text-admin-muted">{format ? format(d.value) : d.value}</span>
          <div
            className="w-full max-w-8 rounded-t bg-admin-primary"
            style={{ height: `${Math.max(2, (d.value / max) * (height - 40))}px` }}
          />
          <span className="text-xs text-admin-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
