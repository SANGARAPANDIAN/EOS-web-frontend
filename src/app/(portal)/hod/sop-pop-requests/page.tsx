"use client";

import { useState } from "react";
import { Card, Badge, Button, PillTabs, SegmentedTabs, Textarea, EmptyState, SkeletonRows } from "@/components/ui";
import {
  useHodSopPopRequests,
  useDecideHodSopPopRequest,
  type HodSopPopRequestRow,
  type SopPopKind,
  type SopPopStatus,
} from "@/modules/hod/api/sopPopRequests";
import { formatDisplayDate } from "@/lib/utils/date";

function statusTone(status: SopPopStatus): "accent" | "danger" | "neutral" {
  if (status === "sent_to_principal") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: SopPopStatus): string {
  if (status === "sent_to_principal") return "Sent to Finance";
  if (status === "rejected") return "Rejected";
  return "Awaiting HoD approval";
}

function currency(value: number | null): string {
  return `₹${(value ?? 0).toLocaleString("en-IN")}`;
}

function SopPopRequestCard({
  r,
  onDecide,
  approvePending,
  rejectPending,
}: {
  r: HodSopPopRequestRow;
  onDecide: (decision: "approved" | "rejected", remarks: string) => void;
  approvePending: boolean;
  rejectPending: boolean;
}) {
  const [remarks, setRemarks] = useState("");

  return (
    <Card className="hod-hover-card py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Badge tone="accent">{r.kind.toUpperCase()}</Badge>
          <span className="text-[13px] text-subtle">
            {r.display_id} · raised {formatDisplayDate(r.raised_at)}
          </span>
        </div>
        <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
      </div>

      <h2 className="mt-2 text-[16px] font-extrabold text-ink">{r.title}</h2>
      <p className="mt-1 text-[13px] text-body">{r.description}</p>

      <p className="mt-2 text-[12.5px] text-muted">
        {r.raised_by} · {r.raised_by_role}
        {" · "}
        {currency(r.amount)}
        {r.needed_by ? ` · Due ${formatDisplayDate(r.needed_by)}` : ""}
        {" · Next: "}
        {r.next_stage}
      </p>

      {r.status === "awaiting_hod" ? (
        <div className="mt-3 flex items-start gap-2.5">
          <Textarea
            rows={1}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (optional)"
            className="flex-1"
          />
          <Button
            variant="secondary"
            className="shrink-0 text-danger-fg border-danger-border"
            onClick={() => onDecide("rejected", remarks)}
            disabled={approvePending || rejectPending}
            loading={rejectPending}
          >
            Reject
          </Button>
          <Button
            variant="primarySmall"
            className="shrink-0"
            onClick={() => onDecide("approved", remarks)}
            disabled={approvePending || rejectPending}
            loading={approvePending}
          >
            Send to Finance
          </Button>
        </div>
      ) : (
        (r.hod_remarks || r.reviewed_by) && (
          <p className="mt-2 text-[12.5px] text-subtle">
            <span className="font-bold text-ink">Your review:</span>{" "}
            {r.hod_remarks ? r.hod_remarks : "Approved"}
            {r.reviewed_by
              ? ` — ${r.reviewed_by}${r.reviewed_at ? ` · ${formatDisplayDate(r.reviewed_at)}` : ""}`
              : ""}
          </p>
        )
      )}
    </Card>
  );
}

type View = "pending" | "history";

export default function HodSopPopRequestsPage() {
  const [kind, setKind] = useState<SopPopKind>("sop");
  const [view, setView] = useState<View>("pending");
  const requests = useHodSopPopRequests();
  const decide = useDecideHodSopPopRequest();

  const allRows = requests.data ? requests.data[kind] : [];
  const pendingSop = requests.data?.sop.filter((r) => r.status === "awaiting_hod").length ?? 0;
  const pendingPop = requests.data?.pop.filter((r) => r.status === "awaiting_hod").length ?? 0;
  const rows = allRows.filter((r) =>
    view === "pending" ? r.status === "awaiting_hod" : r.status !== "awaiting_hod",
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {requests.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load SOP/POP requests — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">
          {kind === "sop" ? "SOP Requests" : "POP Requests"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {kind === "sop"
            ? "Standard operating procedures raised by the department secretary · your approval forwards them to Finance for review"
            : "Purchase order proposals raised by the department secretary · your approval forwards them to Finance for review"}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <PillTabs
          value={kind}
          onChange={(k) => setKind(k as SopPopKind)}
          options={[
            { key: "sop", label: `SOP requests (${pendingSop})` },
            { key: "pop", label: `POP requests (${pendingPop})` },
          ]}
        />
        <SegmentedTabs
          value={view}
          onChange={(k) => setView(k as View)}
          options={[
            { key: "pending", label: "Pending" },
            { key: "history", label: "History" },
          ]}
        />
      </div>

      {requests.isLoading ? (
        <SkeletonRows count={3} />
      ) : requests.isError ? null : rows.length === 0 ? (
        <Card>
          <EmptyState
            message={
              view === "pending"
                ? `No ${kind === "sop" ? "SOP" : "POP"} requests awaiting your review.`
                : `No decided ${kind === "sop" ? "SOP" : "POP"} requests yet.`
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r: HodSopPopRequestRow) => (
            <SopPopRequestCard
              key={r.id}
              r={r}
              approvePending={
                decide.isPending &&
                decide.variables?.kind === r.kind &&
                decide.variables?.id === r.id &&
                decide.variables?.decision === "approved"
              }
              rejectPending={
                decide.isPending &&
                decide.variables?.kind === r.kind &&
                decide.variables?.id === r.id &&
                decide.variables?.decision === "rejected"
              }
              onDecide={(decision, remarks) =>
                decide.mutate({ kind: r.kind, id: r.id, decision, remarks: remarks || undefined })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
