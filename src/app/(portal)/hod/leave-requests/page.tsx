"use client";

import { useState } from "react";
import { Card, Badge, Button, Avatar, EmptyState, SkeletonRows, PillTabs } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  useHodLeaveRequests,
  useDecideHodLeaveRequest,
  type LeaveAudience,
  type LeaveTab,
  type HodLeaveRow,
} from "@/modules/hod/api/leaveRequests";
import { formatDisplayDate } from "@/lib/utils/date";

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "approved") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "awaiting_mentor") return "Awaiting mentor";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function dateRangeLabel(row: HodLeaveRow): string {
  if (row.from_date === row.to_date) return formatDisplayDate(row.from_date);
  return `${formatDisplayDate(row.from_date)} – ${formatDisplayDate(row.to_date)}`;
}

export default function HodLeaveRequestsPage() {
  const [audience, setAudience] = useState<LeaveAudience>("student");
  const [tab, setTab] = useState<LeaveTab>("pending");
  const list = useHodLeaveRequests(audience, tab);
  const decide = useDecideHodLeaveRequest();

  const c = list.data?.counts;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {list.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load leave requests — please try again.
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">
            {audience === "student" ? "Student Leave" : "Faculty Leave"}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {c ? `${c.pending} pending of ${c.all} requests` : ""} ·{" "}
            {audience === "student" ? "students, all sections" : "faculty, all designations"} · Head of
            Department
          </p>
        </div>
        <SegmentedTabs
          value={audience}
          onChange={(k) => setAudience(k as LeaveAudience)}
          options={[
            { key: "student", label: "Student" },
            { key: "faculty", label: "Faculty" },
          ]}
        />
      </div>

      <PillTabs
        value={tab}
        onChange={(k) => setTab(k as LeaveTab)}
        options={[
          { key: "pending", label: `Pending (${c?.pending ?? 0})` },
          { key: "approved", label: `Approved (${c?.approved ?? 0})` },
          { key: "rejected", label: `Rejected (${c?.rejected ?? 0})` },
          { key: "all", label: `All (${c?.all ?? 0})` },
        ]}
      />

      {list.isLoading ? (
        <SkeletonRows count={5} />
      ) : list.isError ? null : !list.data || list.data.rows.length === 0 ? (
        <Card>
          <EmptyState message="No requests in this view." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.data.rows.map((row) => (
            <div
              key={row.id}
              className="hod-hover-row flex items-center gap-5 rounded-[11px] border border-border-default px-5 py-4"
            >
              <Avatar name={row.name} size={38} />
              <div className="w-[190px] min-w-0">
                <div className="truncate text-[14px] font-bold text-ink">{row.name}</div>
                <div className="truncate text-[12px] text-subtle">{row.subtitle}</div>
              </div>
              <div className="w-[170px]">
                <div className="text-[13.5px] font-bold text-ink">{dateRangeLabel(row)}</div>
                <div className="text-[11.5px] text-subtle">
                  {row.days > 1 ? `${row.days} days · ` : ""}applied {formatDisplayDate(row.applied_at)}
                </div>
              </div>
              <div className="w-[140px]">
                {row.type_label && (
                  <div className="text-[13.5px] font-bold text-ink">{row.type_label}</div>
                )}
                <Badge tone={statusTone(row.status)} className="mt-1">
                  {statusLabel(row.status)}
                </Badge>
              </div>
              <div className="min-w-0 flex-1 text-[13px] text-body">{row.detail_text ?? ""}</div>
              {row.can_act && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="primarySmall"
                    onClick={() => decide.mutate({ kind: row.kind, id: row.id, decision: "approved" })}
                    disabled={decide.isPending}
                    loading={
                      decide.isPending &&
                      decide.variables?.id === row.id &&
                      decide.variables?.decision === "approved"
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => decide.mutate({ kind: row.kind, id: row.id, decision: "rejected" })}
                    disabled={decide.isPending}
                    loading={
                      decide.isPending &&
                      decide.variables?.id === row.id &&
                      decide.variables?.decision === "rejected"
                    }
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
