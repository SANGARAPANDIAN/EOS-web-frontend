import { SectionCard, Badge } from "@/modules/admin/components/ui";
import { lpa, dateLabel, driveDisplayStatusLabel, driveModeLabel } from "@/modules/placement/lib/format";
import type { DriveDetail } from "@/modules/placement/api/drives";

interface DriveOverviewTabProps {
  drive: DriveDetail;
}

function DetailRow({ label, value, badge }: { label: string; value?: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-admin-divider py-2.5 first:border-t-0">
      <span className="w-32 shrink-0 text-[12.5px] text-admin-subtle">{label}</span>
      {value && <span className="flex-1 text-[13px] font-semibold text-admin-ink">{value}</span>}
      {badge && <Badge tone="primary">{badge}</Badge>}
    </div>
  );
}

const STATUS_TONE = { upcoming: "primary", ongoing: "warning", completed: "success", cancelled: "danger" } as const;

/** Read-only detail rows — every field is real from GET /drives/:id (round labels/backlogs/eligible departments render an honest "—" until query.md #14 ships). */
export function DriveOverviewTab({ drive }: DriveOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <SectionCard title="Company and role">
        <DetailRow label="Company" value={drive.companyName} />
        <DetailRow label="Role" value={drive.role ?? "—"} />
        <DetailRow label="CTC" value={lpa(drive.packageLpa)} />
        <DetailRow label="Mode" value={driveModeLabel(drive.mode)} />
        <DetailRow label="Drive date" value={dateLabel(drive.scheduledDate)} />
      </SectionCard>

      <SectionCard title="Criteria">
        <DetailRow label="Minimum CGPA" value={drive.eligibilityCgpa != null ? drive.eligibilityCgpa.toFixed(1) : "—"} />
        <DetailRow label="Backlogs allowed" value={drive.backlogsAllowed ?? "—"} />
        <DetailRow label="Departments" value={drive.eligibleDepartmentCodes ? drive.eligibleDepartmentCodes.split(",").join(", ") : "—"} />
        <div className="flex items-center gap-3.5 border-t border-admin-divider py-2.5">
          <span className="w-32 shrink-0 text-[12.5px] text-admin-subtle">Status</span>
          <Badge tone={STATUS_TONE[drive.displayStatus]}>{driveDisplayStatusLabel(drive.displayStatus)}</Badge>
        </div>
      </SectionCard>

      <SectionCard title="Selection process">
        <DetailRow label="Round 1" value={drive.round1Label ?? "—"} />
        <DetailRow label="Round 2" value={drive.round2Label ?? "—"} />
        <DetailRow label="Round 3" value={drive.round3Label ?? "—"} />
        <DetailRow label="Result declaration" value={drive.resultDeclarationNote ?? "—"} />
      </SectionCard>

      <SectionCard title="Round progress">
        <DetailRow label="Registrations" value={String(drive.appliedCount)} />
        <DetailRow label="Shortlisted" value={String(drive.shortlistedCount)} />
        <DetailRow label="Interviewed" value={String(drive.interviewedCount)} />
        <DetailRow label="Selected" value={String(drive.selectedCount)} />
      </SectionCard>
    </div>
  );
}
