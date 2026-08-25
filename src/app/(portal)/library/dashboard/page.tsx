"use client";

import { PageHeader, KpiCard } from "@/modules/admin/components/ui";
import { useDashboardSummary } from "@/modules/library/api/dashboard";
import { ApiError } from "@/types/api";

export default function LibraryDashboardPage() {
  const { data, isLoading, error } = useDashboardSummary();

  const errorMessage = error instanceof ApiError ? error.message : error ? "Failed to load the library dashboard." : null;

  const val = (n: number | undefined) => (n !== undefined ? n : isLoading ? "…" : "—");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Library dashboard" description="Institution overview · Library Module" />

      {errorMessage && (
        <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total books" icon="menu_book" value={val(data?.total_books)} href="/library/books" />
        <KpiCard label="Available books" icon="check_circle" value={val(data?.available_books)} href="/library/books" />
        <KpiCard label="Total eBooks" icon="tablet" value={val(data?.total_ebooks)} href="/library/ebooks" />
        <KpiCard label="Active borrowings" icon="assignment_turned_in" value={val(data?.active_borrowings)} href="/library/history" />
        <KpiCard label="Overdue books" icon="schedule" value={val(data?.overdue_books)} href="/library/overdue" />
        <KpiCard label="Lost books" icon="report" value={val(data?.lost_books)} href="/library/lost" />
        <KpiCard label="Damaged books" icon="broken_image" value={val(data?.damaged_books)} href="/library/lost" />
      </div>
    </div>
  );
}
