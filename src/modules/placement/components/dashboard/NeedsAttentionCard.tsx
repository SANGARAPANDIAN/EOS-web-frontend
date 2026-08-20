import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SectionCard, PendingNotice } from "@/modules/admin/components/ui";
import type { AttentionFlag } from "@/modules/placement/api/dashboard";

interface NeedsAttentionCardProps {
  data: AttentionFlag[];
  isLoading: boolean;
}

/** Threshold-triggered dot tone by the flag's real target page — flags are conditionally included by the backend, so index position isn't stable. */
function dotClass(flag: AttentionFlag): string {
  if (flag.href.includes("/placement/offers")) return "bg-admin-warning-fg";
  if (flag.href.includes("drive=") || flag.href.includes("/placement/drives")) return "bg-admin-primary";
  if (flag.href.includes("/placement/students")) return "bg-admin-muted";
  return "bg-admin-primary";
}

/** Every flag here is threshold-triggered from real data (GET /drives/placement-stats) — nothing is a static illustrative value. */
export function NeedsAttentionCard({ data, isLoading }: NeedsAttentionCardProps) {
  return (
    <SectionCard title="Needs attention">
      {data.length === 0 ? (
        <PendingNotice
          reason={
            isLoading
              ? "Loading…"
              : "Nothing is currently over threshold — screening, shortlists and offer responses all look healthy."
          }
          height={100}
        />
      ) : (
        <div className="flex flex-col">
          {data.map((flag, i) => (
            <Link
              key={i}
              href={flag.href}
              className="flex items-center gap-3 border-t border-admin-divider py-2.5 first:border-t-0 hover:bg-admin-tint"
            >
              <span className={`size-2 shrink-0 rounded-full ${dotClass(flag)}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-admin-ink">{flag.title}</div>
                <div className="mt-0.5 text-[11px] text-admin-muted">{flag.description}</div>
              </div>
              <Icon name="chevron_right" size={16} className="text-admin-border-hover" />
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
