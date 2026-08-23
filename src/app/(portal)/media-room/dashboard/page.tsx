"use client";

import Link from "next/link";
import { Card, Badge, Icon, EmptyState } from "@/components/ui";
import { useMyIdentity } from "@/modules/media-room/api/identity";
import { useMediaRequests, useReviewMediaRequest } from "@/modules/media-room/api/mediaRequests";
import { useAchievements } from "@/modules/media-room/api/achievements";
import { useShootAssignments } from "@/modules/media-room/api/shoots";
import { useIndents } from "@/modules/media-room/api/indents";
import { useEquipment } from "@/modules/media-room/api/equipment";
import { useAppPerformance } from "@/modules/media-room/api/reports";
import { formatLongDate, formatDayAndTime, greetingForHour } from "@/lib/utils/date";

const DAY_MS = 86_400_000;

/** Matches the Medical Centre/Hostel Warden dashboard hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

function fmtCompactNumber(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} K` : String(value);
}

/**
 * The design's "App performance" panel shows student-reach numbers with no
 * real backing anywhere (no view/read-receipt tracking exists). Redefined
 * honestly: "reach" = distinct accounts actually notified of a Media-Room
 * post (real, via the notifications table) — see
 * MediaRoomReportsService.appPerformance for the exact per-channel query.
 */
function AppPerformance() {
  const performance = useAppPerformance();
  if (!performance.data) return null;

  return (
    <Card data-mr-lift="1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-extrabold text-ink">App performance</h2>
          <p className="mt-0.5 text-[12.5px] text-subtle">Last 30 days · all handles managed by the media room</p>
        </div>
        <Link href="/media-room/report" className="shrink-0 text-[13.5px] font-bold text-primary hover:underline">
          Full report
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3.5">
        {performance.data.channels.map((c) => (
          <div key={c.key} data-mr-lift="1" className="rounded-[12px] border border-divider p-[16px_18px]">
            <div className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full bg-primary" />
              <span className="text-[14.5px] font-bold text-ink">{c.name}</span>
            </div>
            <div className="mt-2.5 text-[26px] font-extrabold tracking-[-.02em] text-ink">{c.reach !== null ? fmtCompactNumber(c.reach) : "—"}</div>
            <div className="text-[12px] text-subtle">
              {c.reach !== null ? "accounts reached" : "not enough data yet"}
              {c.growth_pct !== null && <span className="ml-1.5 font-bold text-primary">{c.growth_pct >= 0 ? "+" : ""}{c.growth_pct}%</span>}
            </div>
            <div className="mt-1.5 text-[11.5px] text-subtle">
              {c.posts !== null ? `${c.posts} post${c.posts === 1 ? "" : "s"}` : "—"} · {c.reach !== null ? `${fmtCompactNumber(c.reach)} reach` : "—"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function MediaRoomDashboardPage() {
  const identity = useMyIdentity();
  const pending = useMediaRequests("pending", 5);
  const approved = useMediaRequests("approved", 5);
  const delivered = useMediaRequests("delivered", 1);
  const achievements = useAchievements(undefined, 4);
  const review = useReviewMediaRequest();
  const shoots = useShootAssignments();
  const indents = useIndents();
  const equipment = useEquipment();

  const pendingCount = pending.data?.meta.total ?? 0;
  const approvedCount = approved.data?.meta.total ?? 0;
  const deliveredCount = delivered.data?.meta.total ?? 0;
  const achievementsCount = achievements.data?.meta.total ?? 0;

  const isLoading = pending.isLoading;

  const todayIso = new Date().toISOString().slice(0, 10);
  const shootRows = shoots.data?.ready ? shoots.data.data : [];
  const todayShoots = shootRows
    .filter((s) => s.scheduled_at?.slice(0, 10) === todayIso)
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));

  const now = Date.now();
  const staleRequests = (pending.data?.data ?? []).filter((r) => now - new Date(r.created_at).getTime() > 2 * DAY_MS);
  const unscheduledShoots = shootRows.filter((s) => (s.status === "planned" || s.status === "confirmed") && !s.scheduled_at);
  const indentRows = indents.data?.ready ? indents.data.data : [];
  const pendingIndents = indentRows.filter((i) => i.status === "pending");
  const equipmentRows = equipment.data?.ready ? equipment.data.data : [];
  const needsRepair = equipmentRows.filter((e) => e.condition === "needs_repair");

  const flags = [
    ...staleRequests.map((r) => ({ title: `${r.event_name ?? "Untitled request"} · pending 48h+`, sub: `Raised by ${r.requested_by.name}` })),
    ...unscheduledShoots.map((s) => ({ title: `${s.media_request?.event_name ?? s.event_title ?? "Shoot"} has no date set`, sub: "Add a scheduled time on Shoot Assignments" })),
    ...pendingIndents.map((i) => ({ title: `Indent awaiting review · ${i.title}`, sub: `₹${Number(i.estimated_cost ?? 0).toLocaleString("en-IN")} · raised ${formatDayAndTime(i.created_at)}` })),
    ...needsRepair.map((e) => ({ title: `${e.name} flagged for repair`, sub: e.asset_tag ?? "No asset tag" })),
  ].slice(0, 5);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">
          {greetingForHour()}
          {identity.data?.name ? `, ${identity.data.name}` : ""}
        </h1>
        <p className="mt-1 text-[13px] text-muted">{formatLongDate()} · Media room</p>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-pill border border-border-accent bg-accent-50 px-4 py-2.5 text-[13.5px] font-bold text-primary-dark">
          {pendingCount} media request{pendingCount === 1 ? "" : "s"} waiting on you
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Link href="/media-room/requests?status=pending" className={`min-w-0 rounded-card border border-border-accent bg-accent-50 p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-primary-dark">Pending requests</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-surface">
              <Icon name="pending_actions" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-primary-dark">
            {isLoading ? "—" : pendingCount}
          </div>
          <div className="mt-3 text-[13px] font-bold text-primary-dark">Review the queue</div>
        </Link>

        <Link href="/media-room/requests?status=approved" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Approved · awaiting delivery</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="local_shipping" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : approvedCount}
          </div>
          <div className="mt-3 text-[13px] font-bold text-primary">View approved</div>
        </Link>

        <Link href="/media-room/requests?status=delivered" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Delivered</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="check_circle" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : deliveredCount}
          </div>
          <div className="mt-3 text-[13px] text-muted">Completed coverage requests</div>
        </Link>

        <Link href="/media-room/achievements" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Achievements posted</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="emoji_events" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {achievements.isLoading ? "—" : achievementsCount}
          </div>
          <div className="mt-3 text-[13px] font-bold text-primary">Open achievements</div>
        </Link>
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] gap-4 items-start">
        <Card data-mr-lift="1" className={HOVERABLE}>
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Today&apos;s shoots</h2>
            <Link href="/media-room/shoots" className="text-[13.5px] font-bold text-primary hover:underline">
              All assignments
            </Link>
          </div>
          {shoots.isLoading ? (
            <EmptyState message="Loading…" />
          ) : todayShoots.length === 0 ? (
            <EmptyState message="Nothing scheduled today." />
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {todayShoots.map((s) => {
                const time = s.scheduled_at
                  ? new Date(s.scheduled_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
                  : "—";
                return (
                  <div key={s.id} className="flex items-center gap-3.5 rounded-[12px] border border-divider p-[12px_14px]">
                    <div className="w-[62px] shrink-0 rounded-[10px] bg-accent-50 py-2 text-center">
                      <div className="font-mono text-[14px] font-semibold text-primary-dark">{time}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-bold text-ink">{s.media_request?.event_name ?? s.event_title ?? "Untitled"}</div>
                      <div className="text-[13px] text-muted">{[s.crew, s.assigned_to?.full_name].filter(Boolean).join(" · ") || "Unassigned"}</div>
                    </div>
                    <Badge tone={s.status === "delivered" ? "accent" : "neutral"}>{s.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card data-mr-lift="1" className={HOVERABLE}>
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Needs attention</h2>
            {flags.length > 0 && <Badge tone="accentDark">{flags.length} flag{flags.length === 1 ? "" : "s"}</Badge>}
          </div>
          {flags.length === 0 ? (
            <EmptyState message="Nothing needs attention right now." />
          ) : (
            <div className="mt-2 flex flex-col">
              {flags.map((f, i) => (
                <div key={i} className="flex gap-2.5 border-t border-divider py-3 first:border-0 first:pt-0">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-bold leading-snug text-ink">{f.title}</div>
                    <div className="text-[13px] text-muted">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 items-start">
        <Card data-mr-lift="1" className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Media requests waiting</h2>
            <Link href="/media-room/requests" className="text-[13.5px] font-bold text-primary hover:underline">
              Open queue
            </Link>
          </div>
          {pending.isLoading ? (
            <EmptyState message="Loading…" />
          ) : !pending.data || pending.data.data.length === 0 ? (
            <EmptyState message="Nothing waiting on you." />
          ) : (
            <div className="flex flex-col">
              {pending.data.data.map((r) => (
                <div key={r.id} className="flex items-center gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold text-ink">{r.event_name ?? "Untitled event"}</div>
                    <div className="text-[13px] text-muted">
                      {r.requested_by.name} · {formatDayAndTime(r.created_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => review.mutate({ id: r.id, status: "rejected" })}
                    disabled={review.isPending}
                    className="shrink-0 rounded-[7px] border border-border-default px-2.5 py-1.5 text-[12.5px] font-bold text-body hover:bg-surface-tint"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => review.mutate({ id: r.id, status: "approved" })}
                    disabled={review.isPending}
                    className="shrink-0 rounded-[7px] bg-primary px-2.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card data-mr-lift="1" className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Recent achievements</h2>
            <Badge tone="neutral">{achievementsCount} total</Badge>
          </div>
          {achievements.isLoading ? (
            <EmptyState message="Loading…" />
          ) : !achievements.data || achievements.data.data.length === 0 ? (
            <EmptyState message="Nothing posted yet." />
          ) : (
            <div className="flex flex-col">
              {achievements.data.data.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 border-t border-divider py-3 first:border-0 first:pt-0">
                  <span className="mt-0 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold leading-snug text-ink">{a.title}</div>
                    <div className="text-[13px] text-muted">{a.departments.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AppPerformance />
    </div>
  );
}
