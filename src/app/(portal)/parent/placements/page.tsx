"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, EmptyState } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildUpcomingDrives, useChildPlacementHistory } from "@/modules/parent/api/placements";
import { formatDisplayDate } from "@/lib/utils/date";
import { APPLICATION_STATUS_LABEL } from "@/lib/config";

type Tab = "upcoming" | "history";

function driveMeta(packageLpa: number | null, roleOrDate: string): string {
  return packageLpa !== null ? `₹${packageLpa} LPA · ${roleOrDate}` : roleOrDate;
}

// Same honestly-derived progress signal as the student's own Placements page
// (there's no per-round-name table, only this generic stage) — see that
// page's own doc comment for why.
function ProgressLine({ status, lastClearedRound }: { status: string; lastClearedRound: number | null }) {
  if (status === "placed") return <div className="mt-2.5 text-[12.5px] font-semibold text-primary">Offer received</div>;
  if (status === "rejected" && lastClearedRound !== null) {
    return <div className="mt-2.5 text-[12.5px] text-muted">Not selected · cleared through round {lastClearedRound}</div>;
  }
  if (lastClearedRound !== null) {
    return <div className="mt-2.5 text-[12.5px] font-semibold text-primary">Cleared through round {lastClearedRound}</div>;
  }
  if (status === "applied") return <div className="mt-2.5 text-[12.5px] text-muted">Applied · results awaited</div>;
  return null;
}

function UpcomingTab({ childId }: { childId: number | null }) {
  const drives = useChildUpcomingDrives(childId);
  if (drives.isLoading) return <Card><EmptyState message="Loading…" /></Card>;
  if (!drives.data || drives.data.length === 0) return <Card><EmptyState message="No drives to show right now." /></Card>;
  return (
    <div className="flex flex-col gap-3">
      {drives.data.map((d) => (
        <Card key={d.drive_id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[16.5px] font-extrabold tracking-[-.02em] text-ink">{d.company_name}</div>
              <div className="mt-1 text-[13px] text-muted">{driveMeta(d.package_lpa, formatDisplayDate(d.scheduled_date))}</div>
              {d.company_profile_info && <p className="mt-1.5 text-[13px] text-body">{d.company_profile_info}</p>}
              {!d.is_disclosed && d.disclosed_reveal_date && (
                <div className="mt-1.5 text-[12px] text-subtle">Company reveals on {formatDisplayDate(d.disclosed_reveal_date)}</div>
              )}
            </div>
            <Badge tone={d.application_status === "rejected" ? "accentDark" : "accent"}>
              {APPLICATION_STATUS_LABEL[d.application_status] ?? d.application_status}
            </Badge>
          </div>
          <ProgressLine status={d.application_status} lastClearedRound={d.last_cleared_round} />
        </Card>
      ))}
    </div>
  );
}

function HistoryTab({ childId }: { childId: number | null }) {
  const history = useChildPlacementHistory(childId);
  if (history.isLoading) return <Card><EmptyState message="Loading…" /></Card>;
  if (!history.data || history.data.length === 0) return <Card><EmptyState message="No concluded drives yet." /></Card>;
  return (
    <div className="flex flex-col gap-3">
      {history.data.map((d) => (
        <Card key={d.drive_id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[16.5px] font-extrabold tracking-[-.02em] text-ink">{d.company_name}</div>
              <div className="mt-1 text-[13px] text-muted">
                {driveMeta(d.package_lpa, d.job_role ?? formatDisplayDate(d.scheduled_date))}
              </div>
            </div>
            <Badge tone={d.application_status === "rejected" ? "accentDark" : "accent"}>
              {APPLICATION_STATUS_LABEL[d.application_status] ?? d.application_status}
            </Badge>
          </div>
          <ProgressLine status={d.application_status} lastClearedRound={d.last_cleared_round} />
        </Card>
      ))}
    </div>
  );
}

export default function ParentPlacementsPage() {
  const { selectedChildId } = useSelectedChild();
  const [tab, setTab] = useState<Tab>("upcoming");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Placements</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {tab === "upcoming" ? "Drives your child is shortlisted or applied for" : "Drives already concluded this placement season"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ChildSwitcher />
          <SegmentedTabs
            options={[
              { key: "upcoming", label: "Upcoming drives" },
              { key: "history", label: "History" },
            ]}
            value={tab}
            onChange={(k) => setTab(k as Tab)}
          />
        </div>
      </div>

      {tab === "upcoming" ? <UpcomingTab childId={selectedChildId} /> : <HistoryTab childId={selectedChildId} />}
    </div>
  );
}
