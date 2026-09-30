"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import {
  usePendingApprovalRequests,
  useDecideApprovalRequest,
  type ApprovalRequestItem,
} from "@/modules/shared/api/approvalRequests";

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function entityLabel(item: ApprovalRequestItem): string {
  const p = item.payload as Record<string, unknown>;
  switch (item.entity_type) {
    case "department":
      return `New department: ${p.name} (${p.code})`;
    case "course":
      return `New course: ${p.name} (${p.code})`;
    case "batch":
      return `New batch: ${p.name}`;
    case "class":
      return `New class: section ${p.section}, semester ${p.current_semester}`;
    default:
      return "Request";
  }
}

function RejectComposer({ onConfirm, onCancel, pending }: { onConfirm: (reason: string) => void; onCancel: () => void; pending: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for rejecting…"
        className="h-9 w-48 rounded-lg border px-2.5 text-sm outline-none"
        style={{ borderColor: principalColors.border, color: principalColors.heading }}
      />
      <button
        type="button"
        disabled={!reason.trim() || pending}
        onClick={() => onConfirm(reason.trim())}
        className="h-9 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "#B42318" }}
      >
        Confirm
      </button>
      <button type="button" onClick={onCancel} className="h-9 rounded-lg px-2 text-sm" style={{ color: principalColors.textFaint }}>
        Cancel
      </button>
    </div>
  );
}

function RequestRow({ item }: { item: ApprovalRequestItem }) {
  const [rejecting, setRejecting] = useState(false);
  const decide = useDecideApprovalRequest();

  return (
    <div className="flex items-start gap-4 border-t px-5 py-4" style={{ borderColor: principalColors.borderMuted }}>
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
      >
        <Icon name="account_tree" size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: principalColors.primaryDark, background: principalColors.surfaceTint, borderColor: principalColors.chipBorder }}
          >
            {item.entity_type.replace("_", " ")}
          </span>
          <span className="text-xs" style={{ color: principalColors.textFaint }}>
            #{item.id} · raised {daysAgo(item.requested_at)}
          </span>
        </div>
        <div className="mt-1 text-[15px] font-bold" style={{ color: principalColors.heading }}>
          {entityLabel(item)}
        </div>
        {decide.isError && (
          <div className="mt-1.5 text-xs" style={{ color: "#B42318" }}>
            {decide.error instanceof Error ? decide.error.message : "Something went wrong. Please try again."}
          </div>
        )}
      </div>

      {rejecting ? (
        <RejectComposer
          pending={decide.isPending}
          onCancel={() => setRejecting(false)}
          onConfirm={(reason) => decide.mutate({ id: item.id, decision: "reject", reason })}
        />
      ) : (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: item.id, decision: "approve" })}
            className="h-9 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: principalColors.primary }}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => setRejecting(true)}
            className="h-9 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: principalColors.border, color: principalColors.body }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function PrincipalStructureRequestsPage() {
  const requests = usePendingApprovalRequests();
  const items = requests.data ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Structure Requests
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          New departments, courses, batches, and classes proposed by Admin, waiting on your approval before they go live.
        </p>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="flex items-center border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Pending requests
          </div>
          <span className="ml-auto text-[13px]" style={{ color: principalColors.textFaint }}>
            {requests.isLoading ? "Loading…" : `${items.length} pending`}
          </span>
        </div>

        {items.map((item) => (
          <RequestRow key={item.id} item={item} />
        ))}

        {!requests.isLoading && items.length === 0 && (
          <div className="px-5 py-11 text-center">
            <Icon name="task_alt" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Nothing here
            </div>
            <div className="mt-1 text-sm" style={{ color: principalColors.textFaint }}>
              No structure requests are waiting on your review.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
