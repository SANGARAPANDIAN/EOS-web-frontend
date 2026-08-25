import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";

interface PrincipalStatCardProps {
  label: string;
  icon: string;
  value: string | number;
  delta?: string;
  sub?: string;
  progressPercent?: number;
  footer?: string;
  /** True while the query backing this tile is still in flight — renders skeleton bars instead of the (still-fallback) value/sub/footer, so nothing flashes text before real data arrives. */
  loading?: boolean;
  /** Real page this tile's data actually lives on — omit when no such page exists yet, rather than linking somewhere that doesn't back it. */
  href?: string;
}

/** One KPI tile matching the reference design's card style exactly (border, radius, hover lift). Clickable to the real page its data comes from, when one exists. */
export function PrincipalStatCard({ label, icon, value, delta, sub, progressPercent, footer, loading, href }: PrincipalStatCardProps) {
  const router = useRouter();
  const Tag = href ? "button" : "div";
  return (
    <Tag
      type={href ? "button" : undefined}
      onClick={href ? () => router.push(href) : undefined}
      className={`rounded-2xl border p-5 text-left shadow-[0_1px_2px_rgba(13,30,79,0.06)] hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)] ${href ? "cursor-pointer" : ""}`}
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold" style={{ color: principalColors.textMuted }}>
          {label}
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: principalColors.surfaceTint }}>
          <Icon name={icon} size={20} style={{ color: principalColors.primary }} />
        </div>
      </div>

      {loading ? (
        <>
          <Skeleton className="my-2.5 h-9 w-24" />
          <Skeleton className="h-3.5 w-32" />
        </>
      ) : (
        <>
          <div
            className="my-2.5 text-[38px] font-extrabold tracking-tight tabular-nums"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
          >
            {value}
          </div>
          {(delta || sub) && (
            <div className="flex items-baseline gap-2">
              {delta && (
                <div className="text-[13px] font-bold tabular-nums" style={{ color: principalColors.primary }}>
                  {delta}
                </div>
              )}
              {sub && (
                <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
                  {sub}
                </div>
              )}
            </div>
          )}
          {progressPercent != null && (
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-full" style={{ background: principalColors.borderLight }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%`, background: principalColors.primary }}
              />
            </div>
          )}
          {footer && (
            <div className="mt-2 text-xs" style={{ color: principalColors.textSubtle }}>
              {footer}
            </div>
          )}
        </>
      )}
    </Tag>
  );
}
