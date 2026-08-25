import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import type { PrincipalCampusInfrastructure } from "@/modules/principal/api/dashboard";

interface Tile {
  key: string;
  icon: string;
  label: string;
  value: string;
  caption: string;
  tracked: boolean;
  /** Real page this tile's data lives on — omitted for "Maintenance": no dedicated Principal page shows secretary_service_requests yet. */
  href?: string;
}

/**
 * Matches the reference design's exact 6-tile layout/labels/icons.
 * Classrooms/Labs show a real room count once query.md #1 has run; until
 * then (or if the read fails) they honestly show "—". "Maintenance" uses
 * secretary_service_requests as the closest real proxy — that table has no
 * category field, so it covers any Secretary-handled request, not
 * exclusively facility repairs.
 */
function buildTiles(c?: PrincipalCampusInfrastructure): Tile[] {
  return [
    {
      key: "classrooms",
      icon: "apartment",
      label: "Classrooms",
      value: c?.classrooms.tracked ? c.classrooms.classrooms_count.toLocaleString("en-IN") : "—",
      caption: c?.classrooms.tracked ? "on file" : "not available yet",
      tracked: c?.classrooms.tracked ?? false,
      href: "/principal/facilities/classrooms",
    },
    {
      key: "labs",
      icon: "science",
      label: "Labs",
      value: c?.classrooms.tracked ? c.classrooms.labs_count.toLocaleString("en-IN") : "—",
      caption: c?.classrooms.tracked ? "on file" : "not available yet",
      tracked: c?.classrooms.tracked ?? false,
      href: "/principal/facilities/laboratories",
    },
    {
      key: "library",
      icon: "local_library",
      label: "Library",
      value: c ? c.library.book_transactions_today.toLocaleString("en-IN") : "—",
      caption: "book transactions today",
      tracked: true,
      href: "/principal/facilities/library",
    },
    {
      key: "transport",
      icon: "directions_bus",
      label: "Transport",
      value: c ? `${c.transport.routes_running} / ${c.transport.routes_total}` : "—",
      caption: "routes running",
      tracked: true,
      href: "/principal/transport",
    },
    {
      key: "hostel",
      icon: "bed",
      label: "Hostel",
      value: c && c.hostel.occupancy_percentage != null ? `${c.hostel.occupancy_percentage}%` : "—",
      caption: c ? `${c.hostel.residents.toLocaleString("en-IN")} residents` : "residents",
      tracked: true,
      href: "/principal/hostel",
    },
    {
      key: "maintenance",
      icon: "build",
      label: "Maintenance",
      value: c ? c.service_requests.pending.toLocaleString("en-IN") : "—",
      caption: "open tickets",
      tracked: true,
    },
  ];
}

interface PrincipalCampusCardProps {
  data?: PrincipalCampusInfrastructure;
  isLoading: boolean;
}

export function PrincipalCampusCard({ data, isLoading }: PrincipalCampusCardProps) {
  const router = useRouter();
  return (
    <div className="rounded-2xl border p-5 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
          Campus & infrastructure
        </div>
        <div className="text-sm" style={{ color: principalColors.textFaint }}>
          Utilisation today
        </div>
        <Link href="/principal/facilities" className="ml-auto text-sm font-semibold" style={{ color: principalColors.primary }}>
          Facilities board
        </Link>
      </div>

      {isLoading && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4" style={{ background: principalColors.surfaceMuted, borderColor: principalColors.borderLight }}>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2.5 h-7 w-10" />
              <Skeleton className="mt-1.5 h-3 w-14" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
                  style={{
                    fontFamily: "var(--font-plus-jakarta-sans)",
                    color: tile.tracked ? principalColors.heading : principalColors.textSubtle,
                  }}
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
