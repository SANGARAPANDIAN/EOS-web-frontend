import { Card } from "@/components/ui/Card";
import type { PackageBand } from "../../types";

const BAR_COLORS = ["#b8ccf5", "#6b94ec", "#2f62e0", "#0b2f8f"];

export function VerticalBarChart({ data }: { data: PackageBand[] }) {
  const max = Math.max(1, ...data.map((b) => b.count));

  return (
    <Card>
      <div className="text-sm font-bold text-ink">Package bands</div>
      <div className="mt-0.5 text-[11.5px] text-muted">Accepted offers by CTC range</div>

      {data.every((b) => b.count === 0) ? (
        <p className="mt-6 text-[13px] text-subtle">No accepted offers yet.</p>
      ) : (
        <div className="mt-4.5 flex h-45 items-end gap-2.5">
          {data.map((b, i) => (
            <div key={b.label} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className="text-center font-mono text-xs">{b.count.toLocaleString("en-IN")}</div>
              <div
                className="rounded-t-[6px]"
                style={{ height: Math.round((b.count / max) * 130), background: BAR_COLORS[i % BAR_COLORS.length] }}
              />
              <div className="text-center text-[10.5px] text-muted">₹{b.label}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
