"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDrive } from "@/modules/placement/hooks/useDrives";
import { useApplications } from "@/modules/placement/hooks/useApplications";
import { useUpdateDriveStatus } from "@/modules/placement/hooks/useDriveMutations";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApplicationStatus, DriveApplication, DriveDetail, DriveDisplayStatus } from "@/modules/placement/types";

function statusLabel(status: DriveDisplayStatus): string {
  if (status === "upcoming") return "Upcoming";
  if (status === "ongoing") return "Ongoing";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

function statusTone(status: DriveDisplayStatus): "accent" | "accentDark" | "neutral" | "danger" {
  if (status === "upcoming") return "accent";
  if (status === "ongoing") return "accentDark";
  if (status === "completed") return "neutral";
  return "danger";
}

function modeLabel(mode: DriveDetail["mode"]): string {
  if (mode === "on_campus") return "On campus";
  if (mode === "virtual") return "Virtual";
  return "—";
}

function lpa(value: number | undefined): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  r1_cleared: "Shortlisted",
  r2_cleared: "In process",
  r3_cleared: "In process",
  placed: "Selected",
  rejected: "Rejected",
};

function applicationStatusTone(status: ApplicationStatus): "accent" | "accentDark" | "neutral" | "danger" {
  if (status === "placed") return "accentDark";
  if (status === "rejected") return "danger";
  return "accent";
}

function roundLabel(app: DriveApplication, drive: DriveDetail): string | null {
  if (app.status === "placed" || app.status === "rejected") return null;
  if (app.lastClearedRound == null) return null;
  const next = Math.min(app.lastClearedRound + 1, 3);
  const label = [drive.round1Label, drive.round2Label, drive.round3Label][next - 1];
  return label ?? `Round ${next}`;
}

function rowLabel(label: string, value: string, badge?: string): { label: string; value: string; badge?: string } {
  return { label, value, badge };
}

function DetailRow({ label, value, badge, tone }: { label: string; value: string; badge?: string; tone?: "accent" | "accentDark" | "neutral" | "danger" }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-divider py-2.5 first:border-t-0">
      <span className="min-w-33 text-[12.5px] text-subtle">{label}</span>
      <span className="flex-1 text-[13px] font-semibold text-ink">{value}</span>
      {badge && <Badge tone={tone ?? "neutral"}>{badge}</Badge>}
    </div>
  );
}

function StudentRow({ name, meta, badge, tone, onClick }: { name: string; meta: string; badge: string; tone: "accent" | "accentDark" | "neutral" | "danger"; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="flex cursor-pointer items-center gap-3.5 border-t border-divider py-3 first:border-t-0 hover:bg-surface-tint">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-ink">{name}</div>
        <div className="mt-0.5 text-xs text-subtle">{meta}</div>
      </div>
      <Badge tone={tone}>{badge}</Badge>
    </div>
  );
}

function SectionCard({ title, rows }: { title: string; rows: { label: string; value: string; badge?: string; tone?: "accent" | "accentDark" | "neutral" | "danger" }[] }) {
  return (
    <Card>
      <div className="text-sm font-bold tracking-[-.01em] text-ink">{title}</div>
      <div className="mt-2 flex flex-col">
        {rows.map((r) => (
          <DetailRow key={r.label} {...r} />
        ))}
      </div>
    </Card>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DriveDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { show } = useToast();
  const [tab, setTab] = useState<"overview" | "students">("overview");
  const { data: drive, isLoading, error } = useDrive(id);
  const { data: applications } = useApplications(id);
  const updateStatus = useUpdateDriveStatus();

  const rows = useMemo(() => applications ?? [], [applications]);

  function handleExport() {
    if (!drive) return;
    const header = ["Register number", "Student", "Department", "Status"];
    const body = rows.map((a) => [a.rollNo ?? a.studentIdNo, a.studentName ?? a.studentIdNo, a.departmentName ?? "—", APPLICATION_STATUS_LABEL[a.status]]);
    downloadCsv(`${drive.companyName.replace(/\s+/g, "-").toLowerCase()}-candidates.csv`, [header, ...body]);
  }

  function handleCloseDrive() {
    if (!drive) return;
    updateStatus.mutate(
      { id: drive.id, status: drive.displayStatus === "completed" ? "scheduled" : "completed" },
      {
        onSuccess: () => show(drive.displayStatus === "completed" ? "Drive reopened." : "Drive closed.", "success"),
        onError: (err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"),
      },
    );
  }

  if (isLoading || error || !drive) {
    return <EmptyState loading={isLoading} message={error ? "Failed to load this drive." : "Drive not found."} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" className="h-8.5 self-start px-3.5" onClick={() => router.push("/placement/drives")}>
        ← Back to Placement Drives
      </Button>

      <Card className="p-[22px_24px]">
        <div className="font-mono text-[11px] tracking-[.06em] text-subtle uppercase">DRIVE · {dateLabel(drive.scheduledDate)}</div>
        <div className="mt-1.5 text-[27px] font-bold tracking-[-.02em] text-ink">{drive.companyName}</div>
        <div className="mt-1 text-[13.5px] text-muted">
          {(drive.role ?? "—") + " · " + lpa(drive.packageLpa) + " · " + modeLabel(drive.mode)}
        </div>

        <div className="mt-4.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          {([
            ["Applied", drive.appliedCount],
            ["Shortlisted", drive.shortlistedCount],
            ["Selected", drive.selectedCount],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-input bg-surface-tint p-[13px_15px]">
              <div className="text-[11.5px] text-subtle">{label}</div>
              <div className="mt-1 text-xl font-bold tracking-[-.02em] text-ink">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4.5 flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            Export list
          </Button>
          <Button variant="primarySmall" disabled={updateStatus.isPending} onClick={handleCloseDrive}>
            {drive.displayStatus === "completed" ? "Reopen drive" : "Close drive"}
          </Button>
        </div>
      </Card>

      <SegmentedTabs
        options={[
          { key: "overview", label: "Overview" },
          { key: "students", label: "Student list" },
        ]}
        value={tab}
        onChange={(k) => setTab(k as "overview" | "students")}
      />

      {tab === "overview" && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-3.5">
          <SectionCard
            title="Company and role"
            rows={[
              rowLabel("Company", drive.companyName),
              rowLabel("Role", drive.role ?? "—"),
              rowLabel("CTC", lpa(drive.packageLpa)),
              rowLabel("Mode", modeLabel(drive.mode)),
              rowLabel("Drive date", dateLabel(drive.scheduledDate)),
            ]}
          />
          <SectionCard
            title="Criteria"
            rows={[
              rowLabel("Minimum CGPA", drive.eligibilityCgpa != null ? drive.eligibilityCgpa.toFixed(1) : "—"),
              rowLabel("Backlogs allowed", drive.backlogsAllowed ?? "—"),
              rowLabel("Departments", drive.eligibleDepartmentCodes ? drive.eligibleDepartmentCodes.split(",").join(", ") : "—"),
              { label: "Status", value: "", badge: statusLabel(drive.displayStatus), tone: statusTone(drive.displayStatus) },
            ]}
          />
          <SectionCard
            title="Selection process"
            rows={[
              rowLabel("Round 1", drive.round1Label ?? "—"),
              rowLabel("Round 2", drive.round2Label ?? "—"),
              rowLabel("Round 3", drive.round3Label ?? "—"),
              rowLabel("Result declaration", drive.resultDeclarationNote ?? "—"),
            ]}
          />
          <SectionCard
            title="Round progress"
            rows={[
              rowLabel("Registrations", String(drive.appliedCount)),
              rowLabel("Shortlisted", String(drive.shortlistedCount)),
              rowLabel("Interviewed", String(drive.interviewedCount)),
              rowLabel("Selected", String(drive.selectedCount)),
            ]}
          />
        </div>
      )}

      {tab === "students" && (
        <Card>
          <div className="text-sm font-bold tracking-[-.01em] text-ink">
            {rows.length && drive.appliedCount > rows.length ? `Students on record · showing ${rows.length} of ${drive.appliedCount} registrations` : "Students on record"}
          </div>
          <div className="mt-2 flex flex-col">
            {rows.length === 0 && <div className="py-4.5 pb-1.5 text-[12.5px] text-subtle">No students registered for this drive yet.</div>}
            {rows.map((a) => {
              const round = roundLabel(a, drive);
              const deptCode = a.classLabel ? a.classLabel.split(" - ")[0] : (a.departmentName ?? "—");
              const meta = [a.rollNo ?? a.studentIdNo, deptCode, round].filter(Boolean).join(" · ");
              return (
                <StudentRow
                  key={a.id}
                  name={a.studentName ?? a.studentIdNo}
                  meta={meta}
                  badge={APPLICATION_STATUS_LABEL[a.status]}
                  tone={applicationStatusTone(a.status)}
                  onClick={() => router.push(`/placement/students/${a.studentId}?driveId=${id}`)}
                />
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
