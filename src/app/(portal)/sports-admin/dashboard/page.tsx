"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, StatCard, Badge, SegmentedTabs, EmptyState, Icon } from "@/components/ui";
import { useSportsDashboard, type DashboardTimeframe } from "@/modules/sports-admin/api/dashboard";
import { useSportsAdminIdentity } from "@/modules/sports-admin/api/me";
import { useMarkSessionDone } from "@/modules/sports-admin/api/sessions";
import { useConfirmFixture } from "@/modules/sports-admin/api/fixtures";
import { formatDisplayDate, formatLongDate, greetingForHour } from "@/lib/utils/date";

const BASE = "/sports-admin";

const TIMEFRAME_TABS: { key: DashboardTimeframe; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "term", label: "This term" },
  { key: "year", label: "This year" },
];

const TIMEFRAME_WINDOW_LABEL: Record<DashboardTimeframe, string> = {
  today: "today",
  term: "this term",
  year: "this year",
};

export default function SportsDashboardPage() {
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>("today");
  const dashboard = useSportsDashboard(timeframe);
  const identity = useSportsAdminIdentity();
  const markSessionDone = useMarkSessionDone();
  const confirmFixture = useConfirmFixture();
  const [dismissedFlags, setDismissedFlags] = useState<Set<string>>(new Set());

  const d = dashboard.data;
  const flags = useMemo(
    () => (d?.flags ?? []).filter((f) => !dismissedFlags.has(`${f.route}:${f.title}`)),
    [d, dismissedFlags],
  );

  const coachesIsSessionsCard = timeframe !== "today";
  const coachesBarPercent =
    d && d.kpis.coaches.value > 0
      ? Math.round(
          (coachesIsSessionsCard
            ? d.kpis.coaches.value - d.kpis.coaches.on_duty
            : d.kpis.coaches.on_duty) / d.kpis.coaches.value * 100,
        )
      : undefined;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">
          {greetingForHour()}
          {identity.data?.name ? `, ${identity.data.name}` : ""}
        </h1>
        <p className="mt-1 text-[13.5px] text-muted">
          {formatLongDate(undefined, true)} · figures for {TIMEFRAME_WINDOW_LABEL[timeframe]}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedTabs
          options={TIMEFRAME_TABS.map((t) => ({ key: t.key, label: t.label }))}
          value={timeframe}
          onChange={(k) => setTimeframe(k as DashboardTimeframe)}
        />
        {d && d.pending_fixtures_count > 0 && (
          <Link
            href={`${BASE}/fixtures`}
            className="flex items-center gap-2 rounded-pill border border-border-accent bg-accent-50 px-4 py-2.5 text-[13px] font-bold text-primary hover:bg-accent-100"
          >
            <Icon name="warning" size={16} />
            {d.pending_fixtures_count} fixture{d.pending_fixtures_count === 1 ? "" : "s"} need squad confirmation
          </Link>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          href={`${BASE}/athletes`}
          label="Sports students"
          value={d?.kpis.athletes.value ?? "—"}
          icon="sports_gymnastics"
          delta={d ? d.kpis.athletes.strong : undefined}
          sub={d ? "active now" : undefined}
          barPercent={
            d && d.kpis.athletes.value > 0
              ? Math.round((d.kpis.athletes.strong / d.kpis.athletes.value) * 100)
              : undefined
          }
        />
        <StatCard
          href={coachesIsSessionsCard ? `${BASE}/sessions` : `${BASE}/coaches`}
          label={coachesIsSessionsCard ? "Sessions held" : "Coaches on duty"}
          value={d ? `${d.kpis.coaches.on_duty} / ${d.kpis.coaches.value}` : "—"}
          icon={coachesIsSessionsCard ? "event_available" : "sports"}
          sub={d?.kpis.coaches.foot}
          barPercent={coachesBarPercent}
        />
        <StatCard
          href={`${BASE}/achievements`}
          label="Achievements"
          value={d?.kpis.achievements.value ?? "—"}
          icon="emoji_events"
          delta={d ? d.kpis.achievements.strong : undefined}
          sub={d?.kpis.achievements.foot}
          barPercent={
            d && d.kpis.achievements.value > 0
              ? Math.round((d.kpis.achievements.strong / d.kpis.achievements.value) * 100)
              : undefined
          }
        />
        <StatCard
          href={`${BASE}/equipment`}
          label="Equipment"
          value={d?.kpis.equipment.value ?? "—"}
          icon="inventory_2"
          delta={d ? d.kpis.equipment.strong : undefined}
          sub={d?.kpis.equipment.foot}
          barPercent={
            d && d.kpis.equipment.value > 0
              ? Math.round((d.kpis.equipment.strong / d.kpis.equipment.value) * 100)
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4">
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div>
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Today&rsquo;s sessions</h2>
              <p className="mt-0.5 text-[12px] text-muted">Ground, courts and gymnasium</p>
            </div>
            <Link href={`${BASE}/sessions`} className="text-[12.5px] font-bold text-primary">
              Timetable
            </Link>
          </div>
          <div className="border-t border-divider">
            {!d || d.todays_sessions.length === 0 ? (
              <div className="px-5">
                <EmptyState message={dashboard.isLoading ? "Loading…" : "No sessions scheduled today."} />
              </div>
            ) : (
              d.todays_sessions.map((s) => (
                <div
                  key={s.id}
                  className="hover-lift flex items-center gap-3.5 rounded-[10px] border-t border-divider px-5 py-3 first:border-0"
                >
                  <Link href={`${BASE}/sessions/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                    <span className="font-mono text-[12px] text-muted">{s.start_time?.slice(0, 5) ?? "—"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold text-ink">{s.title}</div>
                      <div className="text-[12px] text-muted">{s.sub}</div>
                    </div>
                  </Link>
                  <Badge tone={s.status === "done" ? "accent" : s.status === "cancelled" ? "accentDark" : "neutral"}>
                    {s.status === "confirmed" ? "Upcoming" : s.status}
                  </Badge>
                  {s.status === "confirmed" && (
                    <button
                      onClick={() => markSessionDone.mutate(s.id)}
                      disabled={markSessionDone.isPending}
                      className="shrink-0 rounded-[8px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary disabled:opacity-50"
                    >
                      Mark done
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Needs attention</h2>
            {d && <Badge tone="neutral">{flags.length}</Badge>}
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {!d || flags.length === 0 ? (
              <div className="text-[13px] text-muted">
                {dashboard.isLoading ? "Loading…" : "All flags cleared for today."}
              </div>
            ) : (
              flags.map((f) => (
                <div key={`${f.route}:${f.title}`} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-[6px] shrink-0 rounded-full bg-primary" />
                  <Link href={`${BASE}/${f.route}`} className="hover-lift min-w-0 flex-1 rounded-[10px] p-1.5 -m-1.5">
                    <div className="text-[13px] font-bold text-ink">{f.title}</div>
                    <div className="text-[12px] text-muted">{f.sub}</div>
                  </Link>
                  <button
                    onClick={() => setDismissedFlags((prev) => new Set(prev).add(`${f.route}:${f.title}`))}
                    title="Dismiss"
                    className="shrink-0 text-[15px] text-muted hover:text-ink"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4">
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Achievements {TIMEFRAME_WINDOW_LABEL[timeframe]}</h2>
            <Link href={`${BASE}/achievements`} className="text-[12.5px] font-bold text-primary">
              All
            </Link>
          </div>
          <div className="border-t border-divider">
            {!d || d.recent_achievements.length === 0 ? (
              <div className="px-5">
                <EmptyState message={dashboard.isLoading ? "Loading…" : "No results recorded yet."} />
              </div>
            ) : (
              d.recent_achievements.map((a) => (
                <Link
                  key={a.id}
                  href={`${BASE}/achievements`}
                  className="hover-lift flex items-center gap-3.5 rounded-[10px] border-t border-divider px-5 py-3 first:border-0"
                >
                  <Icon name="emoji_events" size={17} className="shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{a.title}</div>
                    <div className="text-[12px] text-muted">{a.sub}</div>
                  </div>
                  <Badge tone="accent">{a.badge}</Badge>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Upcoming fixtures</h2>
            <Link href={`${BASE}/fixtures`} className="text-[12.5px] font-bold text-primary">
              All
            </Link>
          </div>
          <div className="border-t border-divider">
            {!d || d.upcoming_fixtures.length === 0 ? (
              <div className="px-5">
                <EmptyState message={dashboard.isLoading ? "Loading…" : "No fixtures in the next week."} />
              </div>
            ) : (
              d.upcoming_fixtures.map((fx) => (
                <div
                  key={fx.id}
                  className="hover-lift flex items-center gap-3.5 rounded-[10px] border-t border-divider px-5 py-3 first:border-0"
                >
                  <Link href={`${BASE}/fixtures`} className="flex min-w-0 flex-1 items-center gap-3.5">
                    <span className="font-mono text-[12px] text-muted">{formatDisplayDate(fx.fixture_date)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold text-ink">{fx.title}</div>
                      <div className="text-[12px] text-muted">{fx.sub}</div>
                    </div>
                  </Link>
                  {fx.status === "pending" ? (
                    <button
                      onClick={() => confirmFixture.mutate(fx.id)}
                      disabled={confirmFixture.isPending}
                      className="shrink-0 rounded-[8px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  ) : (
                    <Badge tone="accent">{fx.status}</Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Facility use today</h2>
        <div className="mt-3 flex flex-col gap-3">
          {!d || d.facility_use.length === 0 ? (
            <div className="text-[13px] text-muted">{dashboard.isLoading ? "Loading…" : "No facilities recorded yet."}</div>
          ) : (
            d.facility_use.map((v) => (
              <div key={v.id}>
                <div className="mb-1 flex justify-between text-[13px] font-semibold text-ink">
                  <span>{v.name}</span>
                  <span className="font-mono text-muted">{v.usage_pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-tint">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${v.usage_pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
