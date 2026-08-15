"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Badge, type BadgeTone, Card } from "@/modules/admin/components/ui";
import { useInterviews } from "@/modules/placement/api/interviews";
import { interviewStatusLabel, interviewResultLabel } from "@/modules/placement/lib/format";

function statusTone(status: string): BadgeTone {
  if (status === "Completed") return "success";
  if (status === "In progress") return "warning";
  return "primary";
}

function resultTone(result: string): BadgeTone {
  if (result === "Selected") return "success";
  if (result === "Rejected") return "danger";
  if (result === "In process") return "warning";
  return "neutral";
}

function DetailRow({ label, value, badge, badgeTone }: { label: string; value?: string; badge?: string; badgeTone?: BadgeTone }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-admin-divider py-2.5 first:border-t-0">
      <span className="min-w-[150px] text-[12.5px] text-admin-muted">{label}</span>
      {value !== undefined && <span className="flex-1 text-sm font-medium text-admin-ink">{value}</span>}
      {badge && (
        <Badge tone={badgeTone ?? "neutral"} className={value === undefined ? "flex-1 justify-self-start" : undefined}>
          {badge}
        </Badge>
      )}
    </div>
  );
}

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, error } = useInterviews();
  const interview = data?.find((i) => i.id === id);

  if (isLoading) return <p className="text-sm text-admin-muted">Loading…</p>;
  if (error || !interview) return <p className="text-sm text-admin-danger">Failed to load this interview.</p>;

  const statusLabel = interviewStatusLabel(interview.status);
  const resultLabel = interviewResultLabel(interview.applicationStatus);

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/placement/interviews" className="hover:text-admin-body">
          Interviews
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">{interview.studentName}</span>
      </nav>

      <Card hoverable={false} className="p-6">
        <p className="font-mono text-[11px] tracking-[.08em] text-admin-subtle uppercase">Interview</p>
        <h1 className="mt-1.5 font-sans text-[27px] font-extrabold tracking-tight text-admin-ink">{interview.studentName}</h1>
        <p className="mt-1 text-sm text-admin-muted">
          {interview.companyName} · {interview.roundLabel}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={statusTone(statusLabel)}>{statusLabel}</Badge>
          <Badge tone={resultTone(resultLabel)}>{resultLabel}</Badge>
        </div>
      </Card>

      <Card hoverable={false} className="p-5">
        <h2 className="font-sans text-[15px] font-bold text-admin-ink">Details</h2>
        <div className="mt-2">
          <DetailRow label="Register number" value={interview.registerNo ?? interview.studentIdNo} />
          <DetailRow label="Department" value={interview.departmentCode ?? "—"} />
          <DetailRow label="Role" value={interview.jobRole ?? "—"} />
          <DetailRow label="Slot" value={interview.slotLabel} />
          <DetailRow label="Panel" value={interview.panelMember} />
          <DetailRow label="Status" badge={statusLabel} badgeTone={statusTone(statusLabel)} />
          <DetailRow label="Result" badge={resultLabel} badgeTone={resultTone(resultLabel)} />
          {interview.panelFeedback && <DetailRow label="Panel feedback" value={interview.panelFeedback} />}
        </div>
      </Card>
    </div>
  );
}
