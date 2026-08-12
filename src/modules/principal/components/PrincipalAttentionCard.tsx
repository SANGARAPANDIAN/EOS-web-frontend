import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import type { PrincipalAttentionFlag } from "@/modules/principal/api/dashboard";

interface PrincipalAttentionCardProps {
  flags?: PrincipalAttentionFlag[];
  isLoading: boolean;
}

/** Every flag here is threshold-triggered from real data (see PrincipalDashboardService.attentionFlags on the backend) — nothing is a static mockup value. */
export function PrincipalAttentionCard({ flags, isLoading }: PrincipalAttentionCardProps) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div
        className="flex flex-wrap items-center gap-2.5 border-b px-5 py-[18px]"
        style={{ borderColor: principalColors.borderLight }}
      >
        <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
          Needs attention
        </div>
        {flags && flags.length > 0 && (
          <span
            className="ml-auto rounded-full border px-2.5 py-1 text-xs font-semibold"
            style={{ color: principalColors.primaryDark, background: principalColors.surfaceTint, borderColor: principalColors.chipBorder }}
          >
            {flags.length} flag{flags.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 border-b px-5 py-3.5 last:border-b-0" style={{ borderColor: principalColors.borderMuted }}>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: principalColors.borderLight }} />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3.5 w-56" />
              </div>
            </div>
          ))}
        {flags?.length === 0 && (
          <div className="px-5 py-6 text-sm" style={{ color: principalColors.textFaint }}>
            Nothing is currently over threshold — attendance, fee collection, faculty workload and course
            completion all look healthy.
          </div>
        )}
        {flags?.map((f, i) => (
          <div key={i} className="flex items-start gap-3 border-b px-5 py-3.5 last:border-b-0" style={{ borderColor: principalColors.borderMuted }}>
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: principalColors.primary }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: principalColors.heading }}>
                {f.title}
              </div>
              <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                {f.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
