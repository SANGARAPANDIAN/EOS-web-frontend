"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { useInitialQueryParam } from "@/lib/utils/useInitialQueryParam";
import {
  useApprovalsSummary,
  useApprovalsList,
  useDecideApproval,
  type ApprovalStatusFilter,
  type ApprovalKindFilter,
  type ApprovalItem,
} from "@/modules/principal/api/approvals";

const STATUS_TABS: { key: ApprovalStatusFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function RejectComposer({ onConfirm, onCancel, pending }: { onConfirm: (remarks: string) => void; onCancel: () => void; pending: boolean }) {
  const [remarks, setRemarks] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Reason for rejecting…"
        className="h-9 w-48 rounded-lg border px-2.5 text-sm outline-none"
        style={{ borderColor: principalColors.border, color: principalColors.heading }}
      />
      <button
        type="button"
        disabled={!remarks.trim() || pending}
        onClick={() => onConfirm(remarks.trim())}
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

function RequestRow({ item }: { item: ApprovalItem }) {
  const [rejecting, setRejecting] = useState(false);
  const decide = useDecideApproval();

  return (
    <div className="flex items-start gap-4 border-t px-5 py-4 transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]" style={{ borderColor: principalColors.borderMuted }}>
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
      >
        <Icon name={item.kind === "leave" ? "event_busy" : "directions_walk"} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide"
            style={{ color: principalColors.primaryDark, background: principalColors.surfaceTint, borderColor: principalColors.chipBorder }}
          >
            {item.kind === "leave" ? "LEAVE" : "OD"}
          </span>
          <span className="text-xs" style={{ color: principalColors.textFaint }}>
            #{item.id} · raised {daysAgo(item.created_at)}
          </span>
        </div>
        <div className="mt-1 text-[15px] font-bold" style={{ color: principalColors.heading }}>
          {item.faculty.name} · {item.summary}
        </div>
        <div className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
          {item.faculty.department_code ?? "—"} · {item.faculty.designation} · HoD: {item.hod_approval_status} · HR: {item.hr_approval_status}
        </div>
        <div className="mt-0.5 text-xs" style={{ color: principalColors.textFaint }}>
          {item.from_date} → {item.to_date}
        </div>
        {item.principal_remarks && (
          <div className="mt-1.5 text-xs italic" style={{ color: principalColors.textFaint }}>
            &quot;{item.principal_remarks}&quot;
          </div>
        )}
        {decide.isError && (
          <div className="mt-1.5 text-xs" style={{ color: "#B42318" }}>
            {decide.error instanceof Error ? decide.error.message : "Something went wrong. Please try again."}
          </div>
        )}
      </div>

      {item.principal_approval_status === "pending" ? (
        rejecting ? (
          <RejectComposer
            pending={decide.isPending}
            onCancel={() => setRejecting(false)}
            onConfirm={(remarks) => decide.mutate({ kind: item.kind, id: item.id, decision: "rejected", remarks })}
          />
        ) : (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => decide.mutate({ kind: item.kind, id: item.id, decision: "approved" })}
              className="h-9 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: principalColors.primary }}
            >
              Accept
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
        )
      ) : (
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          style={
            item.principal_approval_status === "approved"
              ? { background: "#E9F8EE", color: "#1B7A3D" }
              : { background: "#FEF0EE", color: "#B42318" }
          }
        >
          {item.principal_approval_status === "approved" ? "Accepted" : "Rejected"}
        </span>
      )}
    </div>
  );
}

export default function PrincipalApprovalsPage() {
  const initialQ = useInitialQueryParam("q");
  const [status, setStatus] = useState<ApprovalStatusFilter>("pending");
  const [kind, setKind] = useState<ApprovalKindFilter>("all");
  const [q, setQ] = useState("");
  useEffect(() => {
    if (initialQ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ(initialQ);
      setStatus("all");
    }
  }, [initialQ]);

  const summary = useApprovalsSummary();
  const list = useApprovalsList({ status, kind: kind === "all" ? undefined : kind, q: q || undefined });

  const items = list.data?.items ?? [];
  const decidedCount = (summary.data?.accepted ?? 0) + (summary.data?.rejected ?? 0);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Approvals
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          {summary.data
            ? `Every leave and on-duty request routed to the Principal · ${summary.data.pending} pending, ${summary.data.accepted} accepted, ${summary.data.rejected} rejected`
            : "Every leave and on-duty request routed to the Principal"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PrincipalStatCard
          label="Pending"
          icon="hourglass_top"
          loading={summary.isLoading}
          value={summary.data?.pending ?? "—"}
          footer={summary.data?.oldest_pending_created_at ? `oldest raised ${daysAgo(summary.data.oldest_pending_created_at)}` : undefined}
        />
        <PrincipalStatCard label="Accepted" icon="check_circle" loading={summary.isLoading} value={summary.data?.accepted ?? "—"} footer="approved to date" />
        <PrincipalStatCard label="Rejected" icon="cancel" loading={summary.isLoading} value={summary.data?.rejected ?? "—"} footer="reason recorded on each" />
        <PrincipalStatCard
          label="Average close time"
          icon="schedule"
          loading={summary.isLoading}
          value={summary.data?.average_close_days != null ? `${summary.data.average_close_days} days` : "—"}
          footer={decidedCount > 0 ? `across ${decidedCount} decided requests` : "no requests decided yet"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-4" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="flex gap-1 rounded-xl border p-1" style={{ borderColor: principalColors.border }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className="h-9 rounded-lg px-3.5 text-sm font-semibold"
              style={
                status === tab.key
                  ? { background: principalColors.primary, color: "#FFFFFF" }
                  : { background: "transparent", color: principalColors.body }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label
          className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl border px-3.5"
          style={{ borderColor: principalColors.border }}
        >
          <Icon name="search" size={20} style={{ color: principalColors.textFaint }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search requests by name, department or reason"
            className="flex-1 border-0 bg-transparent text-[15px] outline-none"
            style={{ color: principalColors.heading }}
          />
        </label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ApprovalKindFilter)}
          className="h-11 rounded-xl border px-3 text-sm"
          style={{ borderColor: principalColors.border, color: principalColors.heading }}
          title="Leave and OD are the only two request types with a real Principal approval stage in this system."
        >
          <option value="all">All request types</option>
          <option value="od">OD</option>
          <option value="leave">LEAVE</option>
        </select>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="flex items-center border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Request queue
          </div>
          <span className="ml-auto text-[13px]" style={{ color: principalColors.textFaint }}>
            {list.isLoading ? "Loading…" : `Showing ${items.length} of ${list.data?.total ?? 0} requests`}
          </span>
        </div>

        {items.map((item) => (
          <RequestRow key={`${item.kind}-${item.id}`} item={item} />
        ))}

        {!list.isLoading && items.length === 0 && (
          <div className="px-5 py-11 text-center">
            <Icon name="task_alt" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Nothing here
            </div>
            <div className="mt-1 text-sm" style={{ color: principalColors.textFaint }}>
              No requests match this filter.
            </div>
          </div>
        )}

        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          Only Leave and On-duty requests are shown: these are the only two request types in this system with a real
          Principal approval stage. Purchase/service requests, appraisals, and venue bookings resolve at HOD, Finance,
          HR, or IQAC level and never reach the Principal.
        </div>
      </div>
    </div>
  );
}
