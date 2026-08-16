import { Drawer, Badge } from "@/modules/admin/components/ui";
import { lpa, dateLabel, recruiterStatusLabel } from "@/modules/placement/lib/format";
import type { CompanyReportRow } from "@/modules/placement/api/companies";

interface CompanyDetailDrawerProps {
  open: boolean;
  company: CompanyReportRow | null;
  onClose: () => void;
}

const STATUS_TONE = { returning: "success", new: "primary", no_drives: "neutral" } as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-admin-lg border border-admin-border bg-admin-tint px-3.5 py-3">
      <div className="text-[11px] font-semibold text-admin-muted">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold text-admin-ink">{value}</div>
    </div>
  );
}

/** Recruiter profile + real computed hiring stats — read-only view for a company row. */
export function CompanyDetailDrawer({ open, company, onClose }: CompanyDetailDrawerProps) {
  return (
    <Drawer open={open && company !== null} onClose={onClose} eyebrow="Company" title={company?.name ?? ""}>
      {company && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[company.recruiterStatus]}>{recruiterStatusLabel(company.recruiterStatus)}</Badge>
            {company.industry && <Badge tone="neutral">{company.industry}</Badge>}
            {company.location && <Badge tone="neutral">{company.location}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Drives run" value={String(company.drivesCount)} />
            <Stat label="Open roles" value={String(company.openRoles)} />
            <Stat label="Hired" value={String(company.hired)} />
            <Stat label="Last drive" value={dateLabel(company.lastDriveDate)} />
            <Stat label="Average package" value={lpa(company.averagePackageLpa)} />
            <Stat label="Highest package" value={lpa(company.highestPackageLpa)} />
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-admin-subtle uppercase">Profile info</p>
            <p className="mt-1.5 text-sm whitespace-pre-wrap text-admin-body">
              {company.profileInfo || "No profile info added yet."}
            </p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
