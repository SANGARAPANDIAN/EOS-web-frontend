"use client";

import { useState } from "react";
import { Card, Badge, Button, Textarea, EmptyState, SkeletonRows } from "@/components/ui";
import {
  usePendingApprovalRequests,
  useDecideApprovalRequest,
  type ApprovalRequestItem,
} from "@/modules/shared/api/approvalRequests";
import { formatDisplayDate } from "@/lib/utils/date";

function mappingLabel(item: ApprovalRequestItem): string {
  const p = item.payload as { department_id?: number; semester?: number; subject_id?: number };
  const verb = item.action === "remove_mapping" ? "Remove" : "Add";
  return `${verb} subject #${p.subject_id} for semester ${p.semester}`;
}

function CurriculumRequestCard({ item }: { item: ApprovalRequestItem }) {
  const [reason, setReason] = useState("");
  const decide = useDecideApprovalRequest();
  const rejecting = decide.isPending && decide.variables?.id === item.id && decide.variables?.decision === "reject";
  const approving = decide.isPending && decide.variables?.id === item.id && decide.variables?.decision === "approve";

  return (
    <Card className="hod-hover-card py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Badge tone={item.action === "remove_mapping" ? "danger" : "accent"}>
            {item.action === "remove_mapping" ? "REMOVE" : "ADD"}
          </Badge>
          <span className="text-[13px] text-subtle">
            #{item.id} · raised {formatDisplayDate(item.requested_at)}
          </span>
        </div>
      </div>

      <h2 className="mt-2 text-[16px] font-extrabold text-ink">{mappingLabel(item)}</h2>

      {decide.isError && (
        <p className="mt-1.5 text-[12.5px] text-danger-fg">
          {decide.error instanceof Error ? decide.error.message : "Something went wrong. Please try again."}
        </p>
      )}

      <div className="mt-3 flex items-start gap-2.5">
        <Textarea rows={1} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional for approve, shown to requester on reject)" className="flex-1" />
        <Button
          variant="secondary"
          className="shrink-0 text-danger-fg border-danger-border"
          onClick={() => decide.mutate({ id: item.id, decision: "reject", reason: reason || undefined })}
          disabled={decide.isPending}
          loading={rejecting}
        >
          Reject
        </Button>
        <Button
          variant="primarySmall"
          className="shrink-0"
          onClick={() => decide.mutate({ id: item.id, decision: "approve" })}
          disabled={decide.isPending}
          loading={approving}
        >
          Approve
        </Button>
      </div>
    </Card>
  );
}

export default function HodCurriculumRequestsPage() {
  const requests = usePendingApprovalRequests();
  const items = requests.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {requests.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load curriculum-mapping requests — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Curriculum Requests</h1>
        <p className="mt-1 text-[13px] text-muted">
          Subject-mapping changes proposed by the Academic Coordinator for your department, waiting on your review.
        </p>
      </div>

      {requests.isLoading ? (
        <SkeletonRows count={3} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState message="No curriculum-mapping requests awaiting your review." />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <CurriculumRequestCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
