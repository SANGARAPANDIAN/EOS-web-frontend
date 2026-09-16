"use client";

import Link from "next/link";
import { PageHeader, Badge, type BadgeTone } from "@/modules/admin/components/ui";
import { SkeletonStatTiles, SkeletonBlock } from "@/components/ui";
import { KpiCard, SectionCard, EmptyState } from "@/modules/admin/components/ui";
import {
  useStationaryStats,
  useStationaryRequests,
  useStockItems,
  type StationaryRequestStatus,
} from "@/modules/stationary/api/requests";
import { ApiError } from "@/types/api";

// Ported from "Stationery Portal.dc.html"'s Dashboard page: statCards +
// "Live queue" (lines 76-134), plus "Stock alerts" (lines 118-133) now that
// stationary_stock_items exists (user-approved before creation). The 4 stat
// cards map exactly onto GET /stationary-requests/stats's shape
// (pending_count, pages_printed_today, completed_today, collected_today).

const STATUS_TONE: Record<StationaryRequestStatus, BadgeTone> = {
  pending_payment: "neutral",
  paid: "primary",
  processing: "primary",
  ready_for_pickup: "warning",
  completed: "success",
  rejected: "danger",
};

const STATUS_LABEL: Record<StationaryRequestStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Pending",
  processing: "In progress",
  ready_for_pickup: "Ready",
  completed: "Collected",
  rejected: "Rejected",
};

function formatRupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function StationaryDashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useStationaryStats();
  const { data: requests, isLoading: requestsLoading } = useStationaryRequests();
  const { data: stockItems, isLoading: stockLoading } = useStockItems();

  const errorMessage = statsError instanceof ApiError ? statsError.message : statsError ? "Failed to load the dashboard." : null;
  const isLoading = statsLoading || requestsLoading;

  const queue = (requests ?? [])
    .filter((r) => r.status !== "pending_payment")
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Dashboard"
        description={`Print shop activity for ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      />

      {errorMessage && (
        <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <SkeletonStatTiles count={4} className="sm:grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Pending requests"
            icon="hourglass_top"
            value={stats?.pending_count ?? "—"}
            sub={stats?.oldest_pending_minutes != null ? `oldest ${stats.oldest_pending_minutes} min` : undefined}
            href="/stationary/requests"
          />
          <KpiCard
            label="Pages printed"
            icon="description"
            value={stats?.pages_printed_today?.toLocaleString("en-IN") ?? "—"}
            sub="today so far"
            href="/stationary/requests"
          />
          <KpiCard
            label="Completed today"
            icon="check_circle"
            value={stats?.completed_today ?? "—"}
            href="/stationary/requests"
          />
          <KpiCard
            label="Collected today"
            icon="payments"
            value={stats ? formatRupees(stats.collected_today) : "—"}
            href="/stationary/reports"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
        <SectionCard
          title="Live queue"
          subtitle="Most recent jobs, online and walk-in"
          actions={
            <Link href="/stationary/requests" className="text-sm font-semibold text-admin-primary hover:text-admin-primary-deep">
              View all requests
            </Link>
          }
        >
          {isLoading ? (
            <SkeletonBlock />
          ) : queue.length > 0 ? (
            <div className="-mx-5 -my-5 flex flex-col">
              {queue.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-4 border-t border-admin-divider px-5 py-3.5 transition-[transform,box-shadow,background-color] duration-150 first:border-t-0 hover:-translate-y-0.5 hover:bg-admin-tint hover:shadow-admin-row-hover-ring"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-admin-md bg-admin-tint-strong text-sm font-bold text-admin-primary-deep">
                    #{q.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-admin-ink">{q.file_summary ?? "Untitled job"}</p>
                    <p className="truncate text-xs text-admin-muted">
                      {q.requester_name ?? "Walk-in"} · {q.requester_department ?? "—"} · {q.specification ?? "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-admin-ink">{formatRupees(q.amount)}</p>
                  </div>
                  <Badge tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="inbox" title="No jobs yet" description="Paid and walk-in jobs will show up here." />
          )}
        </SectionCard>

        <SectionCard title="Stock alerts">
          {stockLoading ? (
            <SkeletonBlock />
          ) : stockItems && stockItems.length > 0 ? (
            <div className="flex flex-col gap-4">
              {stockItems.map((item) => {
                const pct = item.full_stock_quantity > 0 ? (item.quantity_left / item.full_stock_quantity) * 100 : 0;
                const low = item.quantity_left <= item.low_stock_threshold;
                return (
                  <div key={item.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm font-medium text-admin-body">{item.item_name}</span>
                      <span className={`text-sm font-semibold ${low ? "text-admin-danger" : "text-admin-muted"}`}>
                        {item.quantity_left} left
                      </span>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded-admin-pill bg-admin-tint-deep">
                      <div
                        className={`h-full rounded-admin-pill ${low ? "bg-admin-danger" : "bg-admin-primary"}`}
                        style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="inventory_2" title="No stock items tracked yet" />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
