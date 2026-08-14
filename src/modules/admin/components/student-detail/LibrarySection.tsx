"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatCurrency, formatDate } from "@/modules/admin/lib/students-format";
import { useLibrarySettings, useStudentBorrowRecords } from "@/modules/admin/api/students";
import { MetricTile, SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

export function LibrarySection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentBorrowRecords(studentId, active);
  const { data: settings } = useLibrarySettings(active);
  if (isLoading) return <Stub message="Loading…" />;

  const records = data ?? [];
  const onLoan = records.filter((r) => r.status === "borrowed");
  const history = records.filter((r) => r.status !== "borrowed");
  const outstandingFine = records.reduce((sum, r) => sum + (r.fine_paid ? 0 : r.fine_amount), 0);
  const overdueCount = records.filter((r) => r.is_overdue).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricTile
          label="On loan"
          value={String(onLoan.length)}
          note={settings ? `of ${settings.books_per_student} permitted` : undefined}
          tone={onLoan.length > 0 ? "success" : "muted"}
        />
        <MetricTile label="Lifetime borrowed" value={String(records.length)} note="titles" tone={records.length ? "success" : "muted"} />
        <MetricTile
          label="Outstanding fine"
          value={formatCurrency(outstandingFine)}
          note={outstandingFine > 0 ? "Due" : "No dues"}
          tone={outstandingFine > 0 ? "danger" : "success"}
        />
        <MetricTile label="Overdue" value={String(overdueCount)} note="items past due" tone={overdueCount > 0 ? "danger" : "success"} />
      </div>

      <SectionCard title="Current loans">
        <SimpleTable
          headers={["Accession", "Title", "Issued", "Due", "Status"]}
          emptyMessage="No books currently on loan."
          rows={onLoan.map((r) => [
            <span key="a" className="font-mono text-xs">
              {r.book.qr_code}
            </span>,
            r.book.title,
            formatDate(r.borrowed_date),
            formatDate(r.due_date),
            <span key="s" className={r.is_overdue ? "font-medium text-admin-danger" : "text-admin-primary"}>
              {r.is_overdue ? `Overdue (${r.days_overdue}d)` : "On loan"}
            </span>,
          ])}
        />
      </SectionCard>

      <SectionCard title="Borrowing history">
        <SimpleTable
          headers={["Accession", "Title", "Issued", "Returned", "Fine"]}
          emptyMessage="No past borrow records."
          rows={history.map((r) => [
            <span key="a" className="font-mono text-xs">
              {r.book.qr_code}
            </span>,
            r.book.title,
            formatDate(r.borrowed_date),
            r.returned_date ? formatDate(r.returned_date) : "—",
            r.fine_amount > 0 ? formatCurrency(r.fine_amount) : "—",
          ])}
        />
      </SectionCard>
    </div>
  );
}
