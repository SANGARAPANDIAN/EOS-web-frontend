"use client";

import { useState } from "react";
import { Card, Badge, Button, Avatar, EmptyState, SkeletonRows } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  useHodOdRequests,
  useDecideHodOdRequest,
  type OdAudience,
  type OdTab,
  type HodOdRow,
} from "@/modules/hod/api/odRequests";
import { formatDisplayDate } from "@/lib/utils/date";

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "approved") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function dateRangeLabel(row: HodOdRow): string {
  if (row.from_date === row.to_date) return formatDisplayDate(row.from_date);
  return `${formatDisplayDate(row.from_date)} – ${formatDisplayDate(row.to_date)}`;
}

export default function HodOdRequestsPage() {
  const [audience, setAudience] = useState<OdAudience>("student");
  const [tab, setTab] = useState<OdTab>("pending");
  const list = useHodOdRequests(audience, tab);
  const decide = useDecideHodOdRequest();

  const c = list.data?.counts;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">
            {audience === "student" ? "Student OD Requests" : "Faculty OD Requests"}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {c ? `${c.pending} pending of ${c.all} requests` : ""} ·{" "}
            {audience === "student" ? "students, all sections" : "faculty, all designations"} · Head of
            Department
          </p>
        </div>
        <SegmentedTabs
          value={audience}
          onChange={(k) => setAudience(k as OdAudience)}
          options={[
            { key: "student", label: "Student" },
            { key: "faculty", label: "Faculty" },
          ]}
        />
      </div>

      <SegmentedTabs
        value={tab}
        onChange={(k) => setTab(k as OdTab)}
        options={[
          { key: "pending", label: `Pending (${c?.pending ?? 0})` },
          { key: "approved", label: `Approved (${c?.approved ?? 0})` },
          { key: "rejected", label: `Rejected (${c?.rejected ?? 0})` },
          { key: "all", label: `All (${c?.all ?? 0})` },
        ]}
      />

      {list.isLoading ? (
        <SkeletonRows count={5} />
      ) : !list.data || list.data.rows.length === 0 ? (
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
              <div className="w-[160px]">
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
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => decide.mutate({ kind: row.kind, id: row.id, decision: "rejected" })}
                    disabled={decide.isPending}
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
