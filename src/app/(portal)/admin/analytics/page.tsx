"use client";

import { PageHeader, KpiCard, SectionCard, PendingNotice } from "@/modules/admin/components/ui";
import { DonutChart, VerticalBarChart } from "@/modules/admin/components/ui/charts";
import { useHostelDashboardSummary, useLibraryDashboardSummary, usePlacementStats } from "@/modules/admin/api/analytics";
import { percent1 } from "@/modules/admin/lib/format";

/**
 * Home (/admin/dashboard) is finance + student headcount. This page is the
 * operational layer underneath that: hostel, library and placement — each
 * already has a real dashboard/stats aggregate endpoint the home page never
 * surfaces. HR is deliberately excluded — the old console's HRShell.tsx
 * documents that admin accounts are intentionally walled off from HR data
 * everywhere else in the app, so this page respects that rather than
 * punching a hole in it.
 */
export default function AdminAnalyticsPage() {
  const hostel = useHostelDashboardSummary();
  const library = useLibraryDashboardSummary();
  const placement = usePlacementStats();

  const placementByDept = placement.data?.departmentWise.map((d) => ({ label: d.department, a: d.placed, b: d.students })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Operational metrics across hostel, library and placements — the layer beneath the finance-focused home dashboard."
      />

      <section className="flex flex-col gap-3.5">
        <h2 className="text-[11px] font-bold tracking-[.09em] text-admin-subtle uppercase">Hostel</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Residents"
            icon="how_to_reg"
            value={hostel.data ? hostel.data.total_residents : hostel.isLoading ? "…" : "—"}
          />
          <KpiCard
            label="Occupancy"
            icon="bed"
            value={hostel.data ? percent1(hostel.data.occupancy_pct) : hostel.isLoading ? "…" : "—"}
          />
          <KpiCard label="Beds vacant" icon="bed" value={hostel.data ? hostel.data.beds_vacant : hostel.isLoading ? "…" : "—"} />
          <KpiCard
            label="Complaints open"
            icon="assignment"
            value={hostel.data ? hostel.data.complaints_open : hostel.isLoading ? "…" : "—"}
          />
        </div>
        <SectionCard title="Bed occupancy" subtitle="Occupied vs. vacant, across all hostels">
          {hostel.data ? (
            <DonutChart
              data={[
                { label: "Occupied", value: hostel.data.beds_occupied, color: "#1d47ae" },
                { label: "Vacant", value: hostel.data.beds_vacant, color: "#c1d5f5" },
              ]}
              centerLabel="Beds"
              centerValue={hostel.data.beds_total}
            />
          ) : (
            <PendingNotice reason={hostel.isLoading ? "Loading…" : "No hostel data recorded yet."} height={180} />
          )}
        </SectionCard>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="text-[11px] font-bold tracking-[.09em] text-admin-subtle uppercase">Library</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total books" icon="menu_book" value={library.data ? library.data.total_books : library.isLoading ? "…" : "—"} />
          <KpiCard
            label="Active borrowings"
            icon="import_contacts"
            value={library.data ? library.data.active_borrowings : library.isLoading ? "…" : "—"}
          />
          <KpiCard label="Overdue" icon="schedule" value={library.data ? library.data.overdue_books : library.isLoading ? "…" : "—"} />
          <KpiCard
            label="Lost / damaged"
            icon="report"
            value={library.data ? library.data.lost_books + library.data.damaged_books : library.isLoading ? "…" : "—"}
          />
        </div>
        <SectionCard title="Book availability" subtitle="Available vs. currently out or unavailable">
          {library.data ? (
            <DonutChart
              data={[
                { label: "Available", value: library.data.available_books, color: "#1d47ae" },
                {
                  label: "Out / overdue / lost",
                  value: library.data.total_books - library.data.available_books,
                  color: "#c1d5f5",
                },
              ]}
              centerLabel="Books"
              centerValue={library.data.total_books}
            />
          ) : (
            <PendingNotice reason={library.isLoading ? "Loading…" : "No library data recorded yet."} height={180} />
          )}
        </SectionCard>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="text-[11px] font-bold tracking-[.09em] text-admin-subtle uppercase">Placements</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Placement rate"
            icon="work"
            value={placement.data ? percent1(placement.data.placementRate) : placement.isLoading ? "…" : "—"}
          />
          <KpiCard
            label="Students placed"
            icon="how_to_reg"
            value={placement.data ? placement.data.studentsPlaced : placement.isLoading ? "…" : "—"}
          />
          <KpiCard
            label="Highest package"
            icon="currency_rupee"
            value={placement.data ? `${placement.data.highestPackageLpa} LPA` : placement.isLoading ? "…" : "—"}
          />
          <KpiCard
            label="Average package"
            icon="currency_rupee"
            value={placement.data ? `${placement.data.averagePackageLpa} LPA` : placement.isLoading ? "…" : "—"}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Offers by month" subtitle="Offers extended, most recent months">
            {placement.data && placement.data.offersByMonth.length > 0 ? (
              <VerticalBarChart data={placement.data.offersByMonth.map((m) => ({ label: m.month, value: m.count }))} height={180} />
            ) : (
              <PendingNotice reason={placement.isLoading ? "Loading…" : "No offers recorded yet."} height={180} />
            )}
          </SectionCard>
          <SectionCard title="Placed vs. eligible, by department" subtitle="Current batch-wide figures">
            {placementByDept.length > 0 ? (
              <div className="flex flex-col gap-3">
                {placementByDept.map((d) => (
                  <div key={d.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate text-admin-body">{d.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
                      <div
                        className="h-full rounded-admin-pill bg-admin-primary"
                        style={{ width: `${d.b > 0 ? Math.max(4, (d.a / d.b) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono tabular-nums text-admin-muted">
                      {d.a}/{d.b}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <PendingNotice reason={placement.isLoading ? "Loading…" : "No placement data recorded yet."} height={160} />
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
