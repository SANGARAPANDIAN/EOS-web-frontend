import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import type { PrincipalAttentionFlag } from "@/modules/principal/api/dashboard";

interface PrincipalAttentionCardProps {
  flags?: PrincipalAttentionFlag[];
  isLoading: boolean;
}

/** Where each real flag type is actually shown elsewhere in the Principal module. */
const FLAG_DESTINATIONS: Record<PrincipalAttentionFlag["type"], string> = {
  attendance: "/principal/students",
  fees: "/principal/finance",
  workload: "/principal/faculty",
  course_completion: "/principal/exams",
};

/** Every flag here is threshold-triggered from real data (see PrincipalDashboardService.attentionFlags on the backend) — nothing is a static mockup value. */
export function PrincipalAttentionCard({ flags, isLoading }: PrincipalAttentionCardProps) {
  const router = useRouter();
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
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
        {flags?.map((f, i) => {
          const dest = FLAG_DESTINATIONS[f.type];
          return (
            <button
              key={i}
              type="button"
              onClick={() => router.push(dest)}
              className="hover-lift flex w-full items-start gap-3 border-b px-5 py-3.5 text-left last:border-b-0"
              style={{ borderColor: principalColors.borderMuted }}
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: principalColors.primary }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: principalColors.heading }}>
                  {f.title}
                </div>
                <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                  {f.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
