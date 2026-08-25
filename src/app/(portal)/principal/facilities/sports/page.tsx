"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { useSportsSummary, useSportsFaculty, useSportsAchievements } from "@/modules/principal/api/facilities";

function resultBadge(result: string): { fg: string; bg: string; bd: string } {
  const lower = result.toLowerCase();
  if (lower.includes("gold") || lower.includes("winner")) return { fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
  if (lower.includes("runner")) return { fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
  return { fg: principalColors.primaryDark, bg: principalColors.surfaceTint, bd: principalColors.chipBorder };
}

export default function PrincipalSportsPage() {
  const summary = useSportsSummary();
  const faculty = useSportsFaculty();
  const achievements = useSportsAchievements();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Link
        href="/principal/facilities"
        className="flex h-10 w-fit items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
        style={{ borderColor: principalColors.border, color: principalColors.body }}
      >
        <Icon name="arrow_back" size={18} />
        Campus &amp; facilities
      </Link>

      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Sports
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Achievements, sports faculty and facilities across the ground, courts and gymnasium
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PrincipalStatCard
          label="Sports students"
          icon="sports_soccer"
          loading={summary.isLoading}
          value={summary.data?.sports_students ?? "—"}
          sub={summary.data ? `Across ${summary.data.disciplines_count} disciplines` : undefined}
        />
        <PrincipalStatCard
          label="Sports faculty"
          icon="sports"
          loading={summary.isLoading}
          value={summary.data?.sports_faculty_count ?? "—"}
          sub="Physical directors and coaches"
        />
        <PrincipalStatCard
          label="Achievements this semester"
          icon="emoji_events"
          loading={summary.isLoading}
          value={summary.data?.achievements_this_semester ?? "—"}
        />
        <PrincipalStatCard
          label="Equipment"
          icon="inventory_2"
          loading={summary.isLoading}
          value={summary.data?.equipment_total_quantity ?? "—"}
          sub={summary.data ? `${summary.data.equipment_types} types` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
          <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
            <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Achievements this semester
            </div>
            <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
              Individual and team results recorded by the physical education office
            </p>
          </div>
          <div className="flex flex-col">
            {achievements.data?.map((a) => {
              const badge = resultBadge(a.result);
              return (
                <div key={a.id} className="flex items-center gap-3 border-b px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[rgba(13,30,79,0.03)]" style={{ borderColor: principalColors.borderMuted }}>
                  <Icon name="emoji_events" size={18} style={{ color: principalColors.primary }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold" style={{ color: principalColors.heading }}>
                      {a.event_name}
                    </div>
                    <div className="text-xs" style={{ color: principalColors.textFaint }}>
                      {[a.participant_name, a.discipline].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>
                    {a.result}
                  </span>
                </div>
              );
            })}
            {!achievements.isLoading && (achievements.data?.length ?? 0) === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: principalColors.textFaint }}>
                No achievements recorded in this system yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
          <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
            <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Sports faculty
            </div>
          </div>
          <div className="flex flex-col">
            {faculty.data?.map((f) => (
              <div key={f.team_id} className="flex items-center gap-3 border-b px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[rgba(13,30,79,0.03)]" style={{ borderColor: principalColors.borderMuted }}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                  <Icon name="person" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold" style={{ color: principalColors.heading }}>
                    {f.coach_name}
                  </div>
                  <div className="text-xs" style={{ color: principalColors.textFaint }}>
                    {[f.coach_role, f.discipline].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="font-mono text-sm" style={{ color: principalColors.textFaint }}>
                  {f.coach_phone ?? "—"}
                </div>
              </div>
            ))}
            {!faculty.isLoading && (faculty.data?.length ?? 0) === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: principalColors.textFaint }}>
                No sports faculty on file.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
