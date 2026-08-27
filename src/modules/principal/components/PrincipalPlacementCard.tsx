import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import type { PrincipalPlacementSummary } from "@/modules/principal/api/dashboard";

function formatLpa(value: number | null): string {
  return value == null ? "—" : `₹${value} LPA`;
}

interface PrincipalPlacementCardProps {
  data?: PrincipalPlacementSummary;
  isLoading: boolean;
}

export function PrincipalPlacementCard({ data, isLoading }: PrincipalPlacementCardProps) {
  const offersPercent =
    data && data.registered > 0 ? Math.min(100, (data.offers_released / data.registered) * 100) : 0;

  return (
    <div
      className="hover-lift flex h-[340px] flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div className="flex items-center gap-3 border-b px-5 py-[18px]" style={{ borderColor: principalColors.borderLight }}>
        <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
          Placement command center
        </div>
        <Link href="/principal/placements" className="ml-auto text-sm font-semibold" style={{ color: principalColors.primary }}>
          Open placements
        </Link>
      </div>

      {isLoading && (
        <>
          <div className="grid grid-cols-2 gap-4 px-5 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="mt-2 h-7 w-16" />
              </div>
            ))}
          </div>
          <div className="px-5 pb-[18px]">
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 px-5 py-4">
            <div>
              <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                Registered
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                {data.registered.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                Companies visited
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                {data.companies_visited.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                Highest package
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                {formatLpa(data.highest_package_lpa)}
              </div>
            </div>
            <div>
              <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                Average package
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                {formatLpa(data.average_package_lpa)}
              </div>
            </div>
          </div>

          <div className="px-5 pb-[18px]">
            <div className="mb-1.5 flex justify-between text-[13px]" style={{ color: principalColors.textFaint }}>
              <span>Offers released</span>
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#252D3B" }}>
                {data.offers_released.toLocaleString("en-IN")} / {data.registered.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: principalColors.borderLight }}>
              <div className="h-full rounded-full" style={{ width: `${offersPercent}%`, background: principalColors.primary }} />
            </div>
            {data.drives_this_week > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                <span
                  className="rounded-lg border px-2.5 py-1 text-xs font-semibold"
                  style={{ color: principalColors.primaryDark, background: principalColors.surfaceTint, borderColor: principalColors.chipBorder }}
                >
                  {data.drives_this_week} drive{data.drives_this_week === 1 ? "" : "s"} this week
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
