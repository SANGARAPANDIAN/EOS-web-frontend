"use client";

import Link from "next/link";
import { Badge, EmptyState, Icon, ProgressBar } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useHrDepartments, type DepartmentAppraisalRollupStatus } from "@/modules/hr/api/departments";

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

const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

export default function HrDepartmentsPage() {
  const departments = useHrDepartments();
  const rows = departments.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Departments</h1>
        <p className="mt-1 text-[13.5px] text-muted">Faculty strength, leave/OD activity and appraisal progress across every department.</p>
      </div>

      {(departments.isLoading || rows.length === 0) && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState loading={departments.isLoading} message="No departments found." />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {rows.map((d) => {
          const leavePct = d.total_faculty ? (d.on_leave_today / d.total_faculty) * 100 : 0;
          const odPct = d.total_faculty ? (d.on_od_today / d.total_faculty) * 100 : 0;
          return (
            <Link key={d.id} href={`/hr/departments/${d.id}`} className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[15px] font-extrabold text-ink">{d.name}</div>
                  <div className="font-mono text-[11.5px] text-subtle">{d.code}</div>
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
                  <Icon name="apartment" size={18} className="text-primary" />
                </div>
              </div>

              <div className="mt-3.5 flex items-baseline gap-2">
                <span className="text-[30px] font-extrabold tracking-[-.03em] leading-none text-ink">{d.total_faculty}</span>
                <span className="text-[12.5px] text-muted">faculty</span>
              </div>

              <div className="mt-3.5 flex flex-col gap-2.5">
                <div>
                  <div className="flex items-center justify-between text-[12px] text-muted">
                    <span>On leave today</span>
                    <span className="font-bold text-body">
                      {d.on_leave_today} ({leavePct.toFixed(0)}%)
                    </span>
                  </div>
                  <ProgressBar percent={leavePct} height={5} className="mt-1" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[12px] text-muted">
                    <span>On OD today</span>
                    <span className="font-bold text-body">
                      {d.on_od_today} ({odPct.toFixed(0)}%)
                    </span>
                  </div>
                  <ProgressBar percent={odPct} height={5} className="mt-1" />
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-divider pt-3">
                <span className="text-[12.5px] text-muted">
                  {d.pending_requests > 0 ? (
                    <span className="font-bold text-primary">{d.pending_requests} pending requests</span>
                  ) : (
                    "No pending requests"
                  )}
                </span>
                <Badge tone={APPRAISAL_STATUS_TONE[d.appraisal_status]}>{APPRAISAL_STATUS_LABEL[d.appraisal_status]}</Badge>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
