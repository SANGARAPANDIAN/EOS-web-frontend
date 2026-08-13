"use client";

import { useState } from "react";
import { Card, Badge, Button, PillTabs, Textarea, EmptyState, SkeletonRows } from "@/components/ui";
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
  if (status === "sent_to_principal") return "Sent to Principal";
  if (status === "rejected") return "Rejected";
  return "Awaiting HoD approval";
}

function currency(value: number | null): string {
  return `₹${(value ?? 0).toLocaleString("en-IN")}`;
}

function SopPopRequestCard({
  r,
  onDecide,
  isPending,
}: {
  r: HodSopPopRequestRow;
  onDecide: (decision: "approved" | "rejected", remarks: string) => void;
  isPending: boolean;
}) {
  const [remarks, setRemarks] = useState("");

  return (
    <Card className="hod-hover-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Badge tone="accent">{r.kind.toUpperCase()}</Badge>
          <span className="text-[13px] text-subtle">
            {r.display_id} · raised {formatDisplayDate(r.raised_at)}
          </span>
        </div>
        <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
      </div>

      <h2 className="mt-3 text-[19px] font-extrabold text-ink">{r.title}</h2>
      <p className="mt-1.5 text-[13.5px] text-body">{r.description}</p>

      <div className="mt-4 grid grid-cols-4 gap-4 border-t border-divider pt-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Raised by</div>
          <div className="mt-1 text-[13.5px] font-bold text-ink">
            {r.raised_by} · {r.raised_by_role}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Amount</div>
          <div className="mt-1 text-[13.5px] font-bold text-ink">{currency(r.amount)}</div>
        </div>
        <div>
          <div className="text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Needed by</div>
          <div className="mt-1 text-[13.5px] font-bold text-ink">
            {r.needed_by ? formatDisplayDate(r.needed_by) : "—"}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Next stage</div>
          <div className="mt-1 text-[13.5px] font-bold text-ink">{r.next_stage}</div>
        </div>
      </div>

      {r.status === "awaiting_hod" ? (
        <div className="mt-4 border-t border-divider pt-4">
          <Textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (optional)"
          />
          <div className="mt-3 flex justify-end gap-2.5">
            <Button
              variant="secondary"
              className="text-danger-fg border-danger-border"
              onClick={() => onDecide("rejected", remarks)}
              disabled={isPending}
            >
              Reject
            </Button>
            <Button variant="primarySmall" onClick={() => onDecide("approved", remarks)} disabled={isPending}>
              Send to Principal
            </Button>
          </div>
        </div>
      ) : (
        (r.hod_remarks || r.reviewed_by) && (
          <div className="mt-4 border-t border-divider pt-4">
            <div className="text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Your review</div>
            {r.hod_remarks && <p className="mt-1 text-[13.5px] text-body">{r.hod_remarks}</p>}
            {r.reviewed_by && (
              <p className="mt-1 text-[12px] text-subtle">
                {r.reviewed_by}
                {r.reviewed_at ? ` · ${formatDisplayDate(r.reviewed_at)}` : ""}
              </p>
            )}
          </div>
        )
      )}
    </Card>
  );
}

export default function HodSopPopRequestsPage() {
  const [kind, setKind] = useState<SopPopKind>("sop");
  const requests = useHodSopPopRequests();
  const decide = useDecideHodSopPopRequest();

  const c = requests.data?.counts;
  const rows = requests.data ? requests.data[kind] : [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">
          {kind === "sop" ? "SOP Requests" : "POP Requests"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {kind === "sop"
            ? "Standard operating procedures raised by the department secretary · your approval forwards them to the Principal"
            : "Purchase order proposals raised by the department secretary · your approval forwards them to the Principal"}
        </p>
      </div>

      <PillTabs
        value={kind}
        onChange={(k) => setKind(k as SopPopKind)}
        options={[
          { key: "sop", label: `SOP requests (${c?.sop ?? 0})` },
          { key: "pop", label: `POP requests (${c?.pop ?? 0})` },
        ]}
      />

      {requests.isLoading ? (
        <SkeletonRows count={3} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState message={`No ${kind === "sop" ? "SOP" : "POP"} requests.`} />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r: HodSopPopRequestRow) => (
            <SopPopRequestCard
              key={r.id}
              r={r}
              isPending={decide.isPending}
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
