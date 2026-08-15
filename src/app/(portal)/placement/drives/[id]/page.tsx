"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Card, Badge, Button, SegmentedPillToggle, PendingNotice, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useDrive, useUpdateDriveStatus } from "@/modules/placement/api/drives";
import { lpa, dateLabel, driveDisplayStatusLabel, driveModeLabel } from "@/modules/placement/lib/format";
import { DriveOverviewTab } from "@/modules/placement/components/drives/DriveOverviewTab";
import { DriveStudentsTab } from "@/modules/placement/components/drives/DriveStudentsTab";

const STATUS_TONE = { upcoming: "primary", ongoing: "warning", completed: "success", cancelled: "danger" } as const;

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "students", label: "Student list" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export default function DriveDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { show } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const { data: drive, isLoading, error } = useDrive(id);
  const updateStatus = useUpdateDriveStatus();

  function handleCloseDrive() {
    if (!drive) return;
    const nextStatus = drive.displayStatus === "completed" ? "scheduled" : "completed";
    updateStatus.mutate(
      { id: drive.id, status: nextStatus },
      {
        onSuccess: () => show(nextStatus === "completed" ? "Drive closed." : "Drive reopened.", "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/placement/drives" className="flex w-fit items-center gap-1 text-sm font-semibold text-admin-primary hover:text-admin-primary-dark">
        <Icon name="chevron_left" size={17} /> Back to Placement Drives
      </Link>

      {isLoading && <PendingNotice reason="Loading…" height={140} />}
      {!isLoading && (error || !drive) && <PendingNotice reason="Failed to load this drive." height={140} />}

      {drive && (
        <>
          <Card hoverable={false} className="p-6">
            <div className="font-mono text-xs tracking-wide text-admin-subtle uppercase">DRIVE · {dateLabel(drive.scheduledDate)}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <h1 className="font-sans text-[27px] font-extrabold tracking-[-.02em] text-admin-ink">{drive.companyName}</h1>
              <Badge tone={STATUS_TONE[drive.displayStatus]}>{driveDisplayStatusLabel(drive.displayStatus)}</Badge>
            </div>
            <p className="mt-1 text-[13.5px] text-admin-muted">
              {(drive.role ?? "—") + " · " + lpa(drive.packageLpa) + " · " + driveModeLabel(drive.mode)}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Applied", drive.appliedCount],
                ["Shortlisted", drive.shortlistedCount],
                ["Selected", drive.selectedCount],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-admin-lg bg-admin-tint px-4 py-3">
                  <div className="text-[11.5px] text-admin-muted">{label}</div>
                  <div className="mt-1 font-mono text-xl font-bold text-admin-ink">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2.5 border-t border-admin-divider pt-4">
              <Button variant="secondary" onClick={handleCloseDrive} disabled={updateStatus.isPending}>
                {drive.displayStatus === "completed" ? "Reopen drive" : "Close drive"}
              </Button>
            </div>
          </Card>

          <SegmentedPillToggle options={[...TABS]} value={tab} onChange={setTab} />

          {tab === "overview" && <DriveOverviewTab drive={drive} />}
          {tab === "students" && <DriveStudentsTab driveId={drive.id} companyName={drive.companyName} />}
        </>
      )}
    </div>
  );
}
