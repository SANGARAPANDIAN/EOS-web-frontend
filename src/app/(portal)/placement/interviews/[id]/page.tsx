"use client";

import { useParams, useRouter } from "next/navigation";
import { useInterviews } from "@/modules/placement/hooks/useInterviews";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApplicationStatus, InterviewRow, InterviewStatus } from "@/modules/placement/types";

function statusLabel(status: InterviewStatus): string {
  if (status === "scheduled") return "Scheduled";
  if (status === "in_progress") return "In progress";
  return "Completed";
}

function statusTone(status: InterviewStatus): "accent" | "accentDark" | "neutral" {
  if (status === "completed") return "accentDark";
  if (status === "in_progress") return "accent";
  return "neutral";
}

function resultLabel(status: ApplicationStatus | null): string {
  if (status === "placed") return "Selected";
  if (status === "rejected") return "Rejected";
  if (status === "r1_cleared" || status === "r2_cleared" || status === "r3_cleared") return "In process";
  return "Pending";
}

function DetailRow({ label, value, badge, tone }: { label: string; value: string; badge?: string; tone?: "accent" | "accentDark" | "neutral" }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-divider py-2.5">
      <span className="min-w-33 text-[12.5px] text-muted">{label}</span>
      <span className="flex-1 text-[13px] font-semibold">{value}</span>
      {badge && <Badge tone={tone}>{badge}</Badge>}
    </div>
  );
}

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { data, isLoading, error } = useInterviews();
  const interview: InterviewRow | undefined = data?.find((i) => i.id === id);

  if (isLoading || error || !interview) {
    return <EmptyState loading={isLoading} message={error ? "Failed to load this interview." : "Interview not found."} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" className="w-auto self-start" onClick={() => router.push("/placement/interviews")}>
        ← Back to Interviews
      </Button>

      <Card>
        <div className="font-mono text-[11px] tracking-[.8px] text-subtle">INTERVIEW</div>
        <div className="mt-1.5 text-[27px] font-bold tracking-[-.02em] text-ink">{interview.studentName}</div>
        <div className="mt-1 text-[13.5px] text-muted">
          {interview.companyName} · {interview.roundLabel}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-bold text-ink">Details</div>
        <div className="mt-2 flex flex-col">
          <DetailRow label="Register number" value={interview.registerNo ?? interview.studentIdNo} />
          <DetailRow label="Department" value={interview.departmentCode ?? "—"} />
          <DetailRow label="Role" value={interview.jobRole ?? "—"} />
          <DetailRow label="Slot" value={interview.slotLabel} />
          <DetailRow label="Panel" value={interview.panelMember} />
          <DetailRow label="Status" value="" badge={statusLabel(interview.status)} tone={statusTone(interview.status)} />
          <DetailRow label="Result" value={resultLabel(interview.applicationStatus)} />
          {interview.panelFeedback && <DetailRow label="Panel feedback" value={interview.panelFeedback} />}
        </div>
      </Card>
    </div>
  );
}
