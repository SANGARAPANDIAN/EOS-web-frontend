"use client";

import { useState } from "react";
import { Card, Badge, Button, Avatar, EmptyState, SkeletonRows } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  useHodOdRequests,
  useDecideHodOdRequest,
  type OdAudience,
  type OdTab,
} from "@/modules/hod/api/odRequests";
import { useSportsOdHodQueue, useDecideSportsOd, type SportsOdHodQueueRow } from "@/modules/hod/api/sportsOd";
import { formatDisplayDate } from "@/lib/utils/date";

/** Unified shape the row list renders from — either a general (student/faculty) OD row or a sports OD row. */
type UnifiedRow =
  | { source: "general"; id: number; kind: OdAudience; name: string; subtitle: string; from_date: string; to_date: string; days: number; type_label: string | null; detail_text: string | null; status: string; can_act: boolean }
  | { source: "sports"; id: number; name: string; subtitle: string; from_date: string; to_date: string; type_label: string | null; detail_text: string | null; status: string; can_act: boolean };

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "approved") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function dateRangeLabel(row: { from_date: string; to_date: string }): string {
  if (row.from_date === row.to_date) return formatDisplayDate(row.from_date);
  return `${formatDisplayDate(row.from_date)} – ${formatDisplayDate(row.to_date)}`;
}

function sportsRowToUnified(row: SportsOdHodQueueRow): UnifiedRow {
  return {
    source: "sports",
    id: row.od_request_id,
    name: row.event,
    subtitle: `${row.department_name ?? "—"} · ${row.students_from_my_department} student${row.students_from_my_department === 1 ? "" : "s"}`,
    from_date: row.from_date,
    to_date: row.to_date,
    type_label: "Sports",
    detail_text: [row.od_type, row.venue, row.level].filter(Boolean).join(" · "),
    status: row.status,
    can_act: row.status === "pending",
  };
}

export default function HodOdRequestsPage() {
  const [audience, setAudience] = useState<OdAudience>("student");
  const [tab, setTab] = useState<OdTab>("pending");
  const list = useHodOdRequests(audience, tab);
  const decide = useDecideHodOdRequest();
  const sportsQueue = useSportsOdHodQueue(tab);
  const decideSports = useDecideSportsOd();

  const isBusy = list.isLoading || (audience === "student" && sportsQueue.isLoading);
  const hasError = list.isError || (audience === "student" && sportsQueue.isError);

  const generalRows: UnifiedRow[] = (list.data?.rows ?? []).map((r) => ({
    source: "general",
    id: r.id,
    kind: r.kind,
    name: r.name,
    subtitle: r.subtitle,
    from_date: r.from_date,
    to_date: r.to_date,
    days: r.days,
    type_label: r.type_label,
    detail_text: r.detail_text,
    status: r.status,
    can_act: r.can_act,
  }));
  const sportsRows: UnifiedRow[] = audience === "student" ? (sportsQueue.data?.rows ?? []).map(sportsRowToUnified) : [];
  const rows = [...generalRows, ...sportsRows].sort((a, b) => (a.from_date < b.from_date ? 1 : -1));

  const c =
    audience === "student" && sportsQueue.data
      ? {
          pending: (list.data?.counts.pending ?? 0) + sportsQueue.data.counts.pending,
          approved: (list.data?.counts.approved ?? 0) + sportsQueue.data.counts.approved,
          rejected: (list.data?.counts.rejected ?? 0) + sportsQueue.data.counts.rejected,
          all: (list.data?.counts.all ?? 0) + sportsQueue.data.counts.all,
        }
      : list.data?.counts;

  function handleApprove(row: UnifiedRow) {
    if (row.source === "sports") {
      decideSports.mutate({ id: row.id, decision: "approved" });
    } else {
      decide.mutate({ kind: row.kind, id: row.id, decision: "approved" });
    }
  }

  function handleReject(row: UnifiedRow) {
    if (row.source === "sports") {
      decideSports.mutate({ id: row.id, decision: "rejected" });
    } else {
      decide.mutate({ kind: row.kind, id: row.id, decision: "rejected" });
    }
  }

  function isRowMutating(row: UnifiedRow, decision: "approved" | "rejected"): boolean {
    if (row.source === "sports") {
      return decideSports.isPending && decideSports.variables?.id === row.id && decideSports.variables?.decision === decision;
    }
    return decide.isPending && decide.variables?.id === row.id && decide.variables?.decision === decision;
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {hasError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load OD requests — please try again.
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">
            {audience === "student" ? "Student OD Requests" : "Faculty OD Requests"}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {c ? `${c.pending} pending of ${c.all} requests` : ""} ·{" "}
            {audience === "student" ? "students, all sections, includes sports" : "faculty, all designations"} · Head of
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

      {isBusy ? (
        <SkeletonRows count={5} />
      ) : hasError ? null : rows.length === 0 ? (
        <Card>
          <EmptyState message="No requests in this view." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={`${row.source}-${row.id}`}
              className="hod-hover-row flex items-center gap-5 rounded-[11px] border border-border-default px-5 py-4"
            >
              <Avatar name={row.name} size={38} />
              <div className="w-[190px] min-w-0">
                <div className="truncate text-[14px] font-bold text-ink">{row.name}</div>
                <div className="truncate text-[12px] text-subtle">{row.subtitle}</div>
              </div>
              <div className="w-[170px]">
                <div className="text-[13.5px] font-bold text-ink">{dateRangeLabel(row)}</div>
                {row.source === "general" && (
                  <div className="text-[11.5px] text-subtle">{row.days > 1 ? `${row.days} days` : ""}</div>
                )}
              </div>
              <div className="w-[160px]">
                {row.type_label && <div className="text-[13.5px] font-bold text-ink">{row.type_label}</div>}
                {row.can_act ? null : (
                  <Badge tone={statusTone(row.status)} className="mt-1">
                    {statusLabel(row.status)}
                  </Badge>
                )}
              </div>
              <div className="min-w-0 flex-1 text-[13px] text-body">{row.detail_text ?? ""}</div>
              {row.can_act && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="primarySmall"
                    onClick={() => handleApprove(row)}
                    disabled={row.source === "sports" ? decideSports.isPending : decide.isPending}
                    loading={isRowMutating(row, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleReject(row)}
                    disabled={row.source === "sports" ? decideSports.isPending : decide.isPending}
                    loading={isRowMutating(row, "rejected")}
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
