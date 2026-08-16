"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge, Button, Icon, ProgressBar, EmptyState, Input, Select, SegmentedTabs, type BadgeTone } from "@/components/ui";
import { useTransportDashboard, type TransportDashboardPeriod } from "@/modules/transport/api/dashboard";
import { useCreateTransportNotice } from "@/modules/transport/api/notices";
import { formatLongDate, formatDayAndTime, greetingForHour } from "@/lib/utils/date";

const NOTICE_TAG_TONE: Record<string, BadgeTone> = {
  ROUTE: "accentDark",
  FEES: "accent",
  CREW: "neutral",
  FLEET: "neutral",
  ALERT: "danger",
};

const NOTICE_TAG_OPTIONS = ["ROUTE", "FEES", "CREW", "FLEET", "ALERT"];

const PERIOD_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "term", label: "This term" },
  { key: "year", label: "This year" },
];

const PERIOD_LABEL: Record<TransportDashboardPeriod, string> = {
  today: "today",
  term: "this term",
  year: "this year",
};

/** Applied to every card/tile on this dashboard per design feedback — hover lift matching the design reference. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

export default function TransportDashboardPage() {
  const [period, setPeriod] = useState<TransportDashboardPeriod>("today");
  const dashboard = useTransportDashboard(period);
  const createNotice = useCreateTransportNotice();
  const [addingNotice, setAddingNotice] = useState(false);
  const [noticeTag, setNoticeTag] = useState(NOTICE_TAG_OPTIONS[0]);
  const [noticeTitle, setNoticeTitle] = useState("");

  const data = dashboard.data;
  const isLoading = dashboard.isLoading;
  const extended = data?.extended;

  const totalBuses = data?.fleet.total_buses ?? 0;
  const busesIdle = data ? totalBuses - data.fleet.buses_on_route : 0;
  const onRoutePercent = data && totalBuses > 0 ? Math.round((data.fleet.buses_on_route / totalBuses) * 100) : 0;

  const capacity = data?.ridership.total_capacity ?? null;
  const riders = data?.ridership.students_on_transport ?? 0;
  const occupancyPercent = data?.ridership.occupancy_percent ?? null;
  const seatsFree = capacity !== null ? capacity - riders : null;
  const routesAbove90 = data?.ridership.routes.filter((r) => r.capacity && r.student_count / r.capacity >= 0.9).length ?? null;

  const renewalsTotal = (data?.renewals.documents_due ?? 0) + (data?.renewals.service_due ?? 0);
  const renewalsTracked = Boolean(extended?.documents || extended?.fleet_status);

  const STAT_TILES = [
    {
      key: "on-route",
      icon: "directions_bus",
      label: "Buses on route",
      value: !data ? "—" : extended?.fleet_status ? String(data.fleet.buses_on_route) : "—",
      subA: !data ? "—" : extended?.fleet_status ? String(busesIdle) : "Not tracked yet",
      subB: extended?.fleet_status ? "idle, in depot or workshop" : "run the setup SQL to enable",
      barPercent: extended?.fleet_status ? onRoutePercent : 0,
      foot: extended?.fleet_status ? `${data?.fleet.buses_maintenance ?? 0} off road for service` : "see fleet status notes below",
    },
    {
      key: "students",
      icon: "school",
      label: "Students ferried",
      value: !data ? "—" : String(riders),
      subA: capacity !== null ? String(seatsFree) : "—",
      subB: capacity !== null ? "seats free across fleet" : "add bus capacity to see seats free",
      barPercent: occupancyPercent ?? 0,
      foot: capacity !== null ? `of ${capacity} seats on roll` : "capacity not tracked yet",
    },
    {
      key: "occupancy",
      icon: "monitoring",
      label: "Mean occupancy",
      value: occupancyPercent !== null ? `${occupancyPercent}%` : "—",
      subA: routesAbove90 !== null ? String(routesAbove90) : "—",
      subB: "routes at/above 90%",
      barPercent: occupancyPercent ?? 0,
      foot: data ? `${riders} students across ${data.ridership.routes.length} routes` : "—",
    },
    {
      key: "renewals",
      icon: "assignment_late",
      label: "Renewals & service",
      value: !data ? "—" : renewalsTracked ? String(renewalsTotal) : "—",
      subA: !data ? "—" : renewalsTracked ? String(data.renewals.documents_due) : "Not tracked yet",
      subB: renewalsTracked ? "document renewals due" : "compliance & service tracking not enabled",
      barPercent: renewalsTracked && totalBuses > 0 ? Math.min(100, Math.round((renewalsTotal / totalBuses) * 100)) : 0,
      foot: renewalsTracked ? `${data?.renewals.service_due ?? 0} bus${data?.renewals.service_due === 1 ? "" : "es"} due for service` : "see fleet status notes below",
    },
  ];

  const alertCount = renewalsTotal;

  function submitNotice() {
    if (!noticeTitle.trim()) return;
    createNotice.mutate(
      { tag: noticeTag, title: noticeTitle.trim() },
      {
        onSuccess: () => {
          setNoticeTitle("");
          setAddingNotice(false);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">{greetingForHour()}, Transport office</h1>
        <p className="mt-1 text-[13px] text-muted">
          {formatLongDate()} · {totalBuses} buses · {data?.routes_count ?? 0} routes
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SegmentedTabs options={PERIOD_OPTIONS} value={period} onChange={(key) => setPeriod(key as TransportDashboardPeriod)} />
        {data && alertCount > 0 && (
          <div className="flex items-center gap-2 rounded-pill border border-border-accent bg-accent-50 px-4 py-2.5 text-[13.5px] font-bold text-primary-dark">
            <Icon name="error" size={18} />
            {alertCount} item{alertCount === 1 ? "" : "s"} need your decision
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {STAT_TILES.map((tile) => (
          <div
            key={tile.key}
            className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[14.5px] font-bold text-body">{tile.label}</div>
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
                <Icon name={tile.icon} size={19} className="text-primary" />
              </div>
            </div>
            <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
              {isLoading ? "—" : tile.value}
            </div>
            <div className="mt-3 flex items-baseline gap-2 flex-wrap">
              <span className="text-[14px] font-extrabold text-primary">{isLoading ? "—" : tile.subA}</span>
              <span className="text-[13px] text-muted">{tile.subB}</span>
            </div>
            <ProgressBar percent={isLoading ? 0 : tile.barPercent} height={6} className="mt-3" />
            <div className="mt-3 text-[12.5px] text-subtle">{tile.foot}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-4 items-start">
        <Card className={HOVERABLE}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Fleet command center</h2>
            <Link href="/transport/buses">
              <span className="text-[13.5px] font-bold text-primary hover:underline">Detail</span>
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[13px] font-semibold text-muted">Buses reporting {PERIOD_LABEL[period]}</div>
              <div className="mt-1 text-[26px] font-extrabold text-ink">
                {isLoading ? "—" : data?.fleet_command.buses_reporting ?? 0}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-muted">GPS online now</div>
              <div className="mt-1 text-[26px] font-extrabold text-ink">
                {isLoading ? "—" : data?.fleet_command.gps_online_now ?? 0}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-muted">Diesel cost {PERIOD_LABEL[period]}</div>
              <div className="mt-1 text-[26px] font-extrabold text-ink">
                {isLoading
                  ? "—"
                  : extended?.fuel_tracking
                    ? `₹${(data?.fleet_command.diesel_cost ?? 0).toLocaleString("en-IN")}`
                    : "Not tracked"}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-muted">Fee collected {PERIOD_LABEL[period]}</div>
              <div className="mt-1 text-[26px] font-extrabold text-ink">
                {isLoading ? "—" : `₹${(data?.fleet_command.transport_fee_collected ?? 0).toLocaleString("en-IN")}`}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[13px] font-semibold text-muted">
              <span>Passes issued</span>
              <span className="font-mono text-ink-soft">{capacity !== null ? `${riders} / ${capacity}` : riders}</span>
            </div>
            <ProgressBar percent={occupancyPercent ?? 0} height={8} className="mt-2" />
            <div className="mt-3.5 flex flex-wrap gap-2">
              <span className="rounded-[9px] border border-border-default px-[13px] py-2 text-[12.5px] font-bold text-ink-soft">
                {data?.fleet_command.gps_online_now ?? 0} GPS units online
              </span>
              {extended?.fleet_status && (
                <span className="rounded-[9px] border border-border-default px-[13px] py-2 text-[12.5px] font-bold text-ink-soft">
                  {data?.fleet.buses_maintenance ?? 0} under maintenance
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Needs attention</h2>
            <Badge tone="accentDark">{data?.needs_attention.length ?? 0} flags</Badge>
          </div>
          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.needs_attention.length === 0 ? (
            <EmptyState
              message={
                extended?.fleet_status || extended?.documents
                  ? "You're all caught up."
                  : "Enable fleet status and compliance tracking (see setup notes) to surface issues here."
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {data.needs_attention.map((flag, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-[13.5px] font-bold text-ink">{flag.title}</div>
                    <div className="text-[12px] text-muted">{flag.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Notices</h2>
            <button
              type="button"
              disabled={!extended?.notices}
              onClick={() => setAddingNotice((v) => !v)}
              className="rounded-[9px] bg-primary px-3.5 py-2 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              New
            </button>
          </div>

          {!extended?.notices && !isLoading && (
            <p className="mb-3 text-[12px] text-subtle">Noticeboard not set up yet — see setup notes below.</p>
          )}

          {addingNotice && (
            <div className="mb-3 flex flex-col gap-2 rounded-[11px] border border-border-default p-3">
              <Select value={noticeTag} onChange={(e) => setNoticeTag(e.target.value)}>
                {NOTICE_TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Notice text"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" className="w-auto" onClick={() => setAddingNotice(false)}>
                  Cancel
                </Button>
                <Button variant="primarySmall" onClick={submitNotice} disabled={createNotice.isPending}>
                  Post
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.notices.length === 0 ? (
            <EmptyState message="No notices yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {data.notices.map((notice) => (
                <div key={notice.id} className="flex flex-col gap-1.5 border-b border-divider pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <Badge tone={NOTICE_TAG_TONE[notice.tag] ?? "neutral"}>{notice.tag}</Badge>
                    <span className="text-[12px] text-subtle">{formatDayAndTime(notice.created_at)}</span>
                  </div>
                  <div className="text-[14px] font-bold leading-snug text-ink">{notice.title}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
