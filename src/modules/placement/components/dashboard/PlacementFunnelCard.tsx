import { SectionCard } from "@/modules/admin/components/ui";
import type { PlacementFunnel } from "@/modules/placement/api/dashboard";

interface PlacementFunnelCardProps {
  data: PlacementFunnel;
  studentsInProcess: number;
  studentsInProcessDriveCount: number;
}

const STAGES: { key: keyof PlacementFunnel; label: string }[] = [
  { key: "eligible", label: "Registered" },
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interviewed", label: "Interviewed" },
  { key: "offers", label: "Offers" },
  { key: "placed", label: "Placed" },
];

/** Six-stage placement funnel — every value is a real backend count from GET /drives/placement-stats. */
export function PlacementFunnelCard({ data, studentsInProcess, studentsInProcessDriveCount }: PlacementFunnelCardProps) {
  const max = Math.max(...STAGES.map((s) => data[s.key]), 1);
  const converted = data.eligible > 0 ? Math.round((data.placed / data.eligible) * 1000) / 10 : 0;

  return (
    <SectionCard
      title="Placement funnel"
      subtitle={`${data.eligible.toLocaleString("en-IN")} registered students this cycle`}
      actions={
        <span className="rounded-admin-sm bg-admin-tint-strong px-2.5 py-1 font-mono text-xs font-bold text-admin-primary-deep">
          {converted}% converted
        </span>
      }
    >
      <div className="flex h-40 items-end gap-2.5">
        {STAGES.map((s, i) => {
          const value = data[s.key];
          const height = Math.max(6, Math.round((value / max) * 128));
          const isLast = i === STAGES.length - 1;
          return (
            <div key={s.key} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
              <span className="font-mono text-xs font-semibold text-admin-ink">{value.toLocaleString("en-IN")}</span>
              <div
                className={`w-full rounded-t ${isLast ? "bg-admin-primary-deep" : "bg-admin-primary"}`}
                style={{ height, opacity: 0.55 + i * 0.09 }}
              />
              <span className="text-[10.5px] leading-tight text-admin-muted">{s.label}</span>
            </div>
          );
        })}
      </div>
      {studentsInProcess > 0 && (
        <p className="mt-4 border-t border-admin-divider pt-3 text-[13px] text-admin-muted">
          <span className="font-semibold text-admin-ink">{studentsInProcess.toLocaleString("en-IN")}</span> students
          currently in process across <span className="font-semibold text-admin-ink">{studentsInProcessDriveCount}</span>{" "}
          active drive{studentsInProcessDriveCount === 1 ? "" : "s"}.
        </p>
      )}
    </SectionCard>
  );
}
