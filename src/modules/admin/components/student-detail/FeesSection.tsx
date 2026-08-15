"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatCurrency, formatDate } from "@/modules/admin/lib/students-format";
import type { StudentFeeWorkspace } from "@/modules/admin/api/students";
import { DlGrid, MetricTile, SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

export function FeesSection({ workspace, isLoading }: { workspace: StudentFeeWorkspace | undefined; isLoading: boolean }) {
  if (isLoading || !workspace) return <Stub message="Loading…" />;
  const { fee_summary, demand_summary, payment_summary } = workspace;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricTile label="Total demand" value={formatCurrency(fee_summary.total_demand)} tone="muted" />
        <MetricTile label="Paid" value={formatCurrency(fee_summary.total_paid)} tone="success" />
        <MetricTile
          label="Outstanding"
          value={formatCurrency(fee_summary.total_outstanding)}
          tone={fee_summary.due_status === "paid" ? "success" : fee_summary.due_status === "partial" ? "warning" : "danger"}
        />
      </div>
      <SectionCard title="Demand breakdown">
        <SimpleTable
          headers={["Fee structure", "Year / Sem", "Total", "Paid", "Outstanding", "Status"]}
          emptyMessage="No fee demand mappings for this student."
          rows={demand_summary.map((d) => [
            d.fee_structure_name,
            `${d.academic_year}${d.semester ? ` · Sem ${d.semester}` : ""}`,
            formatCurrency(d.total_amount),
            formatCurrency(d.paid_amount),
            formatCurrency(d.outstanding_amount),
            <span key="s" className="capitalize">
              {d.due_status}
            </span>,
          ])}
        />
      </SectionCard>
      <SectionCard title="Payment summary">
        <DlGrid
          pairs={[
            ["Payments made", String(payment_summary.payment_count)],
            ["Last payment", payment_summary.last_payment_date ? formatDate(payment_summary.last_payment_date) : null],
          ]}
        />
      </SectionCard>
    </div>
  );
}
