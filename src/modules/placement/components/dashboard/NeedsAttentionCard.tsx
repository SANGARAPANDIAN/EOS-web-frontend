import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { AttentionFlag } from "../../types";

interface NeedsAttentionCardProps {
  data: AttentionFlag[];
}

/** Mirrors the reference's 4 semantic dot tones (amber/red/amber/slate) by matching the real flag's target page, since flags are conditionally included so index position isn't stable. */
function dotColor(flag: AttentionFlag): string {
  if (flag.href.startsWith("/placement/offers")) return "bg-[#5b7fdf]";
  if (flag.href.includes("drive=")) return "bg-[#5b7fdf]";
  if (flag.href.startsWith("/placement/rounds")) return "bg-primary-dark";
  if (flag.href.startsWith("/placement/students")) return "bg-muted";
  return "bg-[#5b7fdf]";
}

/** Every flag here is threshold-triggered from real data (DrivesService.getPlacementStats on the backend) — nothing is a static illustrative value. */
export function NeedsAttentionCard({ data }: NeedsAttentionCardProps) {
  return (
    <Card>
      <div className="text-sm font-bold text-ink">Needs attention</div>

      <div className="mt-2 flex flex-col">
        {data.length === 0 && (
          <p className="py-2 text-[13px] text-subtle">
            Nothing is currently over threshold — screening, shortlists and offer responses all look healthy.
          </p>
        )}
        {data.map((flag, i) => (
          <Link
            key={i}
            href={flag.href}
            className="flex items-center gap-[11px] border-t border-divider px-[3px] py-[11px] hover:bg-surface-tint"
          >
            <span className={`size-2 shrink-0 rounded-full ${dotColor(flag)}`} />
            <div className="flex-1">
              <div className="text-[12.5px] font-semibold">{flag.title}</div>
              <div className="mt-0.5 text-[11px] text-muted">{flag.description}</div>
            </div>
            <span className="text-sm text-subtle">›</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
