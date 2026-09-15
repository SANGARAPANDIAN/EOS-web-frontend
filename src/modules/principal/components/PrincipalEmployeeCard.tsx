import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import type { PrincipalEmployeeSnapshot } from "@/modules/principal/api/dashboard";

interface Tile {
  key: string;
  icon: string;
  label: string;
  value: string;
  caption: string;
  /** Real page this tile's data lives on — omitted where no dedicated Principal page exists yet (matches PrincipalCampusCard's "Maintenance" convention). */
  href?: string;
}

/**
 * Labels/icons/order mirror HoD's and Secretary's sidebar "Employee" nav
 * group (src/modules/hod/nav.ts, src/modules/secretary/nav.ts) — Attendance,
 * Leave, Appraisal — condensed into one institution-wide dashboard card
 * rather than duplicating those full page sets under Principal.
 */
function buildTiles(e?: PrincipalEmployeeSnapshot): Tile[] {
  return [
    {
      key: "attendance",
      icon: "event_available",
      label: "Attendance",
      value: e?.attendance_marked_today && e.attendance_percentage_today != null ? `${e.attendance_percentage_today}%` : "—",
      caption: e?.attendance_marked_today ? "faculty marked present today" : "not marked yet today",
      href: "/principal/faculty",
    },
    {
      key: "leave",
      icon: "event_busy",
      label: "Leave",
      value: e ? e.on_leave_today.toLocaleString("en-IN") : "—",
      caption: "faculty on leave today",
      href: "/principal/faculty",
    },
    {
      key: "appraisal",
      icon: "workspace_premium",
      label: "Appraisal",
      value: e ? e.pending_appraisals.toLocaleString("en-IN") : "—",
      caption: "awaiting HR action",
    },
  ];
}

interface PrincipalEmployeeCardProps {
  data?: PrincipalEmployeeSnapshot;
  isLoading: boolean;
}

/** Institution-wide employee-category summary — attendance/leave/appraisal, the same grouping used across HoD/Secretary. */
export function PrincipalEmployeeCard({ data, isLoading }: PrincipalEmployeeCardProps) {
  const router = useRouter();
  return (
    <div
      className="rounded-2xl border p-5 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div className="flex flex-wrap items-baseline gap-2.5">
        <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
          Employee
        </div>
        <div className="text-sm" style={{ color: principalColors.textFaint }}>
          Attendance, leave & appraisal today
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4" style={{ background: principalColors.surfaceMuted, borderColor: principalColors.borderLight }}>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2.5 h-7 w-10" />
              <Skeleton className="mt-1.5 h-3 w-14" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          {buildTiles(data).map((tile) => {
            const Tag = tile.href ? "button" : "div";
            return (
              <Tag
                key={tile.key}
                type={tile.href ? "button" : undefined}
                onClick={tile.href ? () => router.push(tile.href!) : undefined}
                className={`rounded-xl border p-4 text-left transition-all ${tile.href ? "cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_8px_18px_rgba(13,30,79,0.12)]" : ""}`}
                style={{ background: principalColors.surfaceMuted, borderColor: principalColors.borderLight }}
              >
                <div className="flex items-center gap-2">
                  <Icon name={tile.icon} size={18} style={{ color: principalColors.textFaint }} />
                  <span className="text-[13px] font-semibold" style={{ color: principalColors.textMuted }}>
                    {tile.label}
                  </span>
                </div>
                <div
                  className="mt-2 text-2xl font-bold"
                  style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
                >
                  {tile.value}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: principalColors.textFaint }}>
                  {tile.caption}
                </div>
              </Tag>
            );
          })}
        </div>
      )}
    </div>
  );
}
