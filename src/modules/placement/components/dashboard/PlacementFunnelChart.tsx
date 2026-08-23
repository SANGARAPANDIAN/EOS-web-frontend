import { Card } from "@/components/ui/Card";
import type { PlacementFunnel } from "../../types";

interface PlacementFunnelChartProps {
  data: PlacementFunnel;
}

export function PlacementFunnelChart({ data }: PlacementFunnelChartProps) {
  const stages = [
    { label: "Registered", value: data.eligible },
    { label: "Applied", value: data.applied },
    { label: "Shortlisted", value: data.shortlisted },
    { label: "Interviewed", value: data.interviewed },
    { label: "Offers", value: data.offers },
    { label: "Placed", value: data.placed },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);
  const converted = data.eligible > 0 ? Math.round((data.placed / data.eligible) * 1000) / 10 : 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-ink">Placement funnel</div>
          <div className="mt-0.5 text-[11.5px] text-muted">
            {data.eligible.toLocaleString("en-IN")} registered students this cycle
          </div>
        </div>
        <div className="rounded-[5px] bg-accent-100 px-[9px] py-1 font-mono text-[11px] text-primary">
          {converted}% converted
        </div>
      </div>
      <div className="mt-5 flex h-[150px] items-end gap-1.5">
        {stages.map((s, i) => {
          const color = i === 0 ? "#9fb4e8" : "#1d4ed8";
          const opacity = 0.55 + i * 0.09;
          const height = Math.max(8, Math.round((s.value / max) * 112));
          return (
            <div key={s.label} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className="text-center font-mono text-xs font-medium">{s.value.toLocaleString("en-IN")}</div>
              <div className="rounded-t-[5px]" style={{ height, background: color, opacity }} />
              <div className="text-center text-[10.5px] leading-[1.3] text-muted">{s.label}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
