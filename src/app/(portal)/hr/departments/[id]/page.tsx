"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Card, EmptyState, Icon, ProgressBar, StatCard } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useHrDepartment, type DepartmentAppraisalRollupStatus } from "@/modules/hr/api/departments";

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

export default function HrDepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const departmentId = Number(id);
  const router = useRouter();

  const department = useHrDepartment(departmentId);
  const d = department.data;

  const leavePct = d && d.total_faculty ? (d.on_leave_today / d.total_faculty) * 100 : 0;
  const odPct = d && d.total_faculty ? (d.on_od_today / d.total_faculty) * 100 : 0;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/hr/departments")}
        className="flex items-center gap-2 self-start text-[13px] font-bold text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Departments
      </button>

      {!d ? (
        <Card>
          <EmptyState loading={department.isLoading} message="Department not found." />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{d.name}</h1>
              <p className="mt-1 font-mono text-[13px] text-muted">{d.code}</p>
            </div>
            <Link
              href={`/hr/faculty-directory?department_id=${d.id}`}
              className="flex items-center gap-1.5 rounded-[10px] border border-border-accent bg-accent-50 px-4 py-2.5 text-[13px] font-bold text-primary"
            >
              <Icon name="groups" size={16} />
              View faculty in this department
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total faculty" icon="groups" value={d.total_faculty} sub="active roster size" />
            <StatCard
              label="On leave today"
              icon="event_available"
              value={`${leavePct.toFixed(0)}%`}
              sub={`${d.on_leave_today} of ${d.total_faculty} faculty`}
              barPercent={leavePct}
            />
            <StatCard
              label="On OD today"
              icon="badge"
              value={`${odPct.toFixed(0)}%`}
              sub={`${d.on_od_today} of ${d.total_faculty} faculty`}
              barPercent={odPct}
            />
            <StatCard
              label="Pending requests"
              icon="inbox"
              value={d.pending_requests}
              sub="leave + OD awaiting a decision"
              accent={d.pending_requests > 0}
            />
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Appraisal cycle</h2>
              <Badge tone={APPRAISAL_STATUS_TONE[d.appraisal_status]}>{APPRAISAL_STATUS_LABEL[d.appraisal_status]}</Badge>
            </div>
            <p className="mt-1.5 text-[13px] text-muted">
              {d.appraisal_status === "complete"
                ? "Every faculty member in this department has completed their appraisal for the current cycle."
                : d.appraisal_status === "in_progress"
                  ? "Some faculty in this department have started or submitted their appraisal for the current cycle."
                  : "No faculty in this department have started their appraisal for the current cycle yet."}
            </p>
            <ProgressBar
              percent={d.appraisal_status === "complete" ? 100 : d.appraisal_status === "in_progress" ? 50 : 0}
              height={6}
              className="mt-3"
            />
          </Card>
        </>
      )}
    </div>
  );
}
