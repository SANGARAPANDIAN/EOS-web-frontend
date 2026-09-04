"use client";

import { PageHeader, KpiCard, SectionCard, PendingNotice, EmptyState, QueueRow } from "@/modules/admin/components/ui";
import { SkeletonStatTiles, SkeletonBlock } from "@/components/ui";
import { useDashboardSummary } from "@/modules/library/api/dashboard";
import type { RecentActivityEvent, DepartmentAvailability } from "@/modules/library/api/dashboard";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const ACTIVITY_ICON: Record<RecentActivityEvent["type"], string> = {
  borrowed: "assignment_turned_in",
  returned: "assignment_return",
  lost: "report",
  damaged: "broken_image",
};

function activityTitle(e: RecentActivityEvent): string {
  if (e.type === "borrowed") return `${e.person} borrowed "${e.book_title}"`;
  if (e.type === "returned") return `${e.person} returned "${e.book_title}"`;
  if (e.type === "lost") return `${e.person}'s copy of "${e.book_title}" reported lost`;
  return `${e.person}'s copy of "${e.book_title}" reported damaged`;
}

/**
 * Short real department codes (books.department_id -> departments.code, e.g.
 * "CS", "IT") instead of full names — the full names run 30-50 characters
 * and just truncate into indistinguishable "B.E. Computer ..." labels at
 * this column width. Full name still shown on hover, and the real
 * available/total fraction is labeled directly since there are few enough
 * bars (≤ ~12 departments) for that to stay readable.
 *
 * Each bar's fill is available/total FOR THAT ROW (not relative to whichever
 * department happens to own the most copies overall) — that's what makes a
 * fully-available department (e.g. 16/16) actually render as a full bar.
 * Clamped to 100% since a data entry issue upstream (total_copies edited
 * down without reconciling available_copies) can otherwise make a row
 * compute above 100% — the bar caps out rather than overflowing/misleading.
 */
function DepartmentAvailabilityChart({ data }: { data: DepartmentAvailability[] }) {
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => {
        const pct = d.total_copies > 0 ? (d.available_copies / d.total_copies) * 100 : 0;
        return (
          <div key={d.department} className="flex items-center gap-3" title={d.department}>
            <span className="w-9 shrink-0 rounded-admin-sm bg-admin-tint-strong px-1.5 py-1 text-center font-mono text-[11px] font-bold text-admin-primary-deep">
              {d.department_code}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
              <div
                className="h-full rounded-admin-pill bg-admin-primary"
                style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-admin-muted">
              {d.available_copies}/{d.total_copies}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function LibraryDashboardPage() {
  const { data, isLoading, error } = useDashboardSummary();

  const errorMessage = error instanceof ApiError ? error.message : error ? "Failed to load the library dashboard." : null;

  const val = (n: number | undefined) => (n !== undefined ? n : "—");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Library dashboard" description="Institution overview · Library Module" />
        <SkeletonStatTiles count={6} className="sm:grid-cols-2 lg:grid-cols-3" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Library dashboard" description="Institution overview · Library Module" />

      {errorMessage && (
        <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          className="min-h-[180px]"
          label="Available books"
          icon="check_circle"
          value={val(data?.available_books)}
          sub={data ? `of ${data.total_books} total copies` : undefined}
          href="/library/books"
        />
        <KpiCard
          className="min-h-[180px]"
          label="Active borrowings"
          icon="assignment_turned_in"
          value={val(data?.active_borrowings)}
          sub="currently checked out"
          href="/library/history"
        />
        <KpiCard
          className="min-h-[180px]"
          label="Overdue books"
          icon="schedule"
          value={val(data?.overdue_books)}
          sub={data && data.overdue_books > 0 ? "need follow-up" : "all clear"}
          tinted={!!data && data.overdue_books > 0}
          href="/library/overdue"
        />
        <KpiCard
          className="min-h-[180px]"
          label="Today's activity"
          icon="today"
          value={val(data?.today.issued)}
          sub="issued today"
          footnote={data ? `${data.today.due} due today · ${data.today.returned} returned today` : undefined}
          href="/library/issue"
        />
        <KpiCard
          className="min-h-[180px]"
          label="Total eBooks"
          icon="tablet"
          value={val(data?.total_ebooks)}
          href="/library/ebooks"
        />
        <KpiCard
          className="min-h-[180px]"
          label="Lost & damaged"
          icon="report"
          value={data ? data.lost_books + data.damaged_books : "—"}
          sub={data ? `${data.lost_books} lost · ${data.damaged_books} damaged` : undefined}
          href="/library/lost"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Books available by department" subtitle="Available copies out of each department's total">
          {data && data.department_availability.length > 0 ? (
            <DepartmentAvailabilityChart data={data.department_availability} />
          ) : (
            <PendingNotice reason="No books linked to a department yet." height={200} />
          )}
        </SectionCard>

        <SectionCard title="Recent activity" subtitle="Latest issues, returns, and reported losses/damage">
          {data && data.recent_activity.length > 0 ? (
            <div className="-mx-5 -my-5">
              {data.recent_activity.map((e) => (
                <QueueRow
                  key={e.id}
                  icon={ACTIVITY_ICON[e.type]}
                  title={activityTitle(e)}
                  meta={formatDisplayDate(e.date)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon="history" title="No activity yet" description="Issues and returns will show up here as they happen." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
