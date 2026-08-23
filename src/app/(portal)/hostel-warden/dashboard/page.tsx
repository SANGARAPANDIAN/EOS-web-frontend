"use client";

import Link from "next/link";
import { Card, Badge, Icon, ProgressBar, EmptyState } from "@/components/ui";
import { useHostelDashboardSummary } from "@/modules/hostel-warden/api/dashboard";
import { useMyIdentity } from "@/modules/hostel-warden/api/identity";
import { useOutings, useDecideOuting } from "@/modules/hostel-warden/api/outings";
import { useComplaints } from "@/modules/hostel-warden/api/complaints";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatLongDate, formatTime12h, greetingForHour } from "@/lib/utils/date";
import { useState } from "react";

/** Matches the Medical Centre/Transport dashboard hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

export default function HostelWardenDashboardPage() {
  const identity = useMyIdentity();
  const summary = useHostelDashboardSummary();
  const pendingOutings = useOutings({ status: "pending", page_size: 3 });
  const openComplaints = useComplaints({ status: "open", page_size: 50 });
  const decide = useDecideOuting();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const data = summary.data;
  const isLoading = summary.isLoading;
  const hostel = data?.hostel;
  const totalResidents = data?.total_residents ?? 0;

  const insidePct = data && totalResidents > 0 ? Math.round((data.currently_present / totalResidents) * 100) : 0;
  const onLeavePct = data && totalResidents > 0 ? Math.round((data.on_leave / totalResidents) * 100) : 0;
  const approvalsPct = data ? Math.min(100, Math.round((data.pending_approvals / Math.max(1, totalResidents * 0.05)) * 100)) : 0;

  const overdueComplaints = (openComplaints.data?.data ?? []).filter(
    (c) => Date.now() - new Date(c.created_at).getTime() > 48 * 60 * 60 * 1000,
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">
          {greetingForHour()}
          {identity.data?.name ? `, ${identity.data.name}` : ""}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {formatLongDate()}
          {hostel ? ` · ${hostel.name}` : ""} · {isLoading ? "—" : totalResidents.toLocaleString("en-IN")} residents · night
          attendance closes at 9.30 pm
        </p>
      </div>

      {data && data.pending_approvals > 0 && (
        <div className="rounded-pill border border-border-accent bg-accent-50 px-4 py-2.5 text-[13.5px] font-bold text-primary-dark">
          {data.pending_approvals} approval{data.pending_approvals === 1 ? "" : "s"} are waiting on you
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Link href="/hostel-warden/residents" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Residents</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="groups" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : totalResidents}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-primary">{data?.currently_present ?? 0}</span>
            <span className="text-[13px] text-muted">inside the hostel now</span>
          </div>
          <ProgressBar percent={isLoading ? 0 : insidePct} height={6} className="mt-3" />
          <div className="mt-3 text-[12.5px] text-subtle">
            {data ? `${data.beds_vacant} of ${data.beds_total} beds vacant` : "—"}
          </div>
        </Link>

        <Link href="/hostel-warden/leave" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Out on leave</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="directions_walk" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : data?.on_leave ?? 0}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-primary">{onLeavePct}%</span>
            <span className="text-[13px] text-muted">of residents away right now</span>
          </div>
          <ProgressBar percent={isLoading ? 0 : onLeavePct} height={6} className="mt-3" />
          <div className="mt-3 text-[12.5px] text-subtle">On an approved outing covering today</div>
        </Link>

        <Link href="/hostel-warden/passes" className={`min-w-0 rounded-card border border-border-accent bg-accent-50 p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-primary-dark">Approvals waiting</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-surface">
              <Icon name="pending_actions" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-primary-dark">
            {isLoading ? "—" : data?.pending_approvals ?? 0}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[13px] text-primary-dark/80">Outing and leave requests</span>
          </div>
          <ProgressBar percent={isLoading ? 0 : approvalsPct} height={6} className="mt-3" />
          <span className="mt-3 block text-[13px] font-bold text-primary-dark">Open the queue →</span>
        </Link>

        <Link href="/hostel-warden/complaints" className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Open complaints</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="report" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : data?.complaints_open ?? 0}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-primary">{overdueComplaints.length}</span>
            <span className="text-[13px] text-muted">open beyond 48 hrs</span>
          </div>
          <ProgressBar percent={isLoading ? 0 : Math.min(100, (data?.complaints_open ?? 0) * 20)} height={6} className="mt-3" />
          <span className="mt-3 block text-[13px] font-bold text-primary">View complaints →</span>
        </Link>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 items-start">
        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Gate passes waiting</h2>
            <Link href="/hostel-warden/passes" className="text-[13.5px] font-bold text-primary hover:underline">
              Open queue
            </Link>
          </div>
          {pendingOutings.isLoading ? (
            <EmptyState message="Loading…" />
          ) : !pendingOutings.data || pendingOutings.data.data.length === 0 ? (
            <EmptyState message="Nothing waiting on you." />
          ) : (
            <div className="flex flex-col">
              {pendingOutings.data.data.map((o) => (
                <div key={o.id} className="flex items-center gap-3 border-t border-divider py-3 first:border-0 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => setSelectedStudentId(o.student.id)} className="text-[14.5px] font-bold text-ink hover:text-primary hover:underline">
                      {o.student.name}
                    </button>
                    <div className="text-[13px] text-muted">
                      {o.room_number ?? "—"} · out {formatTime12h(o.start_time)}
                      {o.reason ? ` · ${o.reason}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => decide.mutate({ id: o.id, decision: "rejected" })}
                    disabled={decide.isPending}
                    className="shrink-0 rounded-[7px] border border-border-default px-2.5 py-1.5 text-[12.5px] font-bold text-body hover:bg-surface-tint"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => decide.mutate({ id: o.id, decision: "approved" })}
                    disabled={decide.isPending}
                    className="shrink-0 rounded-[7px] bg-primary px-2.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Needs attention</h2>
            <Badge tone="accentDark">{overdueComplaints.length} flags</Badge>
          </div>
          {openComplaints.isLoading ? (
            <EmptyState message="Loading…" />
          ) : overdueComplaints.length === 0 ? (
            <EmptyState message="You're all caught up." />
          ) : (
            <div className="flex flex-col">
              {overdueComplaints.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-2.5 border-t border-divider py-3 first:border-0 first:pt-0">
                  <span className="mt-0 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold leading-snug text-ink">{c.title}</div>
                    <div className="text-[13px] text-muted">
                      {c.category} · {c.room_number ?? "—"} · open beyond 48 hrs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {selectedStudentId != null && <StudentDetailModal studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />}
    </div>
  );
}
