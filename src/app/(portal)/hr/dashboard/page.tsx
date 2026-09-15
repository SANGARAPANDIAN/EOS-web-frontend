"use client";

import { useRouter } from "next/navigation";
import { Badge, Card, DataTable, Icon, ProgressBar, StatCard, SkeletonStatTiles, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useHrDashboard, type DepartmentAppraisalRollupStatus, type HrDepartmentRollup } from "@/modules/hr/api/dashboard";
import { monthLabel } from "@/lib/utils/date";

const APPRAISAL_STATUS_LABEL: Record<DepartmentAppraisalRollupStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

const APPRAISAL_STATUS_TONE: Record<DepartmentAppraisalRollupStatus, BadgeTone> = {
  not_started: "neutral",
  in_progress: "accent",
  complete: "accentDark",
};

export default function HrDashboardPage() {
  const router = useRouter();
  const dashboard = useHrDashboard();
  const data = dashboard.data;
  const isLoading = dashboard.isLoading;
  const payroll = data?.payroll;

  const columns: DataTableColumn<HrDepartmentRollup>[] = [
    {
      key: "name",
      header: "Department",
      width: "1.4fr",
      render: (d) => (
        <div>
          <div className="font-bold text-ink">{d.name}</div>
          <div className="font-mono text-[11.5px] text-subtle">{d.code}</div>
        </div>
      ),
    },
    { key: "total_faculty", header: "Faculty", width: "0.7fr", render: (d) => d.total_faculty },
    { key: "on_leave_today", header: "On leave today", width: "0.9fr", render: (d) => d.on_leave_today },
    { key: "on_od_today", header: "On OD today", width: "0.9fr", render: (d) => d.on_od_today },
    {
      key: "pending_requests",
      header: "Pending requests",
      width: "0.9fr",
      render: (d) => (d.pending_requests > 0 ? <span className="font-bold text-primary">{d.pending_requests}</span> : "0"),
    },
    {
      key: "appraisal_status",
      header: "Appraisal status",
      width: "1fr",
      render: (d) => <Badge tone={APPRAISAL_STATUS_TONE[d.appraisal_status]}>{APPRAISAL_STATUS_LABEL[d.appraisal_status]}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">HR & Payroll</h1>
        <p className="mt-1 text-[13px] text-muted">Faculty, leave/OD, appraisal and payroll activity across every department.</p>
      </div>

      {isLoading ? (
        <SkeletonStatTiles count={4} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Pending requests"
            icon="inbox"
            value={data?.pending_requests_count ?? 0}
            sub="Leave + OD awaiting your decision"
            href="/hr/requests"
          />
          <StatCard
            label="Today's leave & OD"
            icon="event_available"
            value={data?.todays_leave_count ?? 0}
            delta={`${data?.todays_od_count ?? 0} OD`}
            sub="faculty on leave today"
            href="/hr/vacation-management"
          />
          <StatCard
            label="Pending appraisals"
            icon="military_tech"
            value={data?.pending_appraisals_count ?? 0}
            sub="reviews awaiting HR"
            href="/hr/employee-reviews"
          />
          <StatCard
            label="Payroll completion"
            icon="payments"
            value={`${payroll?.completion_percent ?? 0}%`}
            sub={
              payroll
                ? `${payroll.processed_count} of ${payroll.total_active_faculty} faculty · ${monthLabel(payroll.year, payroll.month - 1)}`
                : undefined
            }
            barPercent={payroll?.completion_percent ?? 0}
            href="/hr/payroll"
          />
        </div>
      )}

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-ink">Department overview</h2>
          {!isLoading && data && (
            <span className="text-[12.5px] text-muted">
              {data.department_overview.length} department{data.department_overview.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <p className="mb-4 text-[13px] text-muted">Live faculty, leave/OD and appraisal rollups — open a department for the full breakdown.</p>
        <DataTable
          columns={columns}
          data={data?.department_overview ?? []}
          rowKey={(d) => d.id}
          loading={isLoading}
          emptyMessage="No departments found."
          onRowClick={(d) => router.push(`/hr/departments/${d.id}`)}
        />
      </Card>

      {!isLoading && payroll && (
        <Card className="flex items-center gap-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[11px] bg-icon-chip">
            <Icon name="payments" size={22} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-extrabold text-ink">Payroll — {monthLabel(payroll.year, payroll.month - 1)}</h2>
              <span className="text-[13px] font-bold text-primary">{payroll.completion_percent}% complete</span>
            </div>
            <ProgressBar percent={payroll.completion_percent} height={6} className="mt-2.5" />
            <div className="mt-2 text-[12.5px] text-muted">
              {payroll.processed_count} of {payroll.total_active_faculty} active faculty processed this run
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
