import { SectionCard, PendingNotice } from "@/modules/admin/components/ui";
import { DonutChart } from "@/modules/admin/components/ui/charts";
import type { PackageBand } from "@/modules/placement/api/dashboard";

interface PackageDistributionCardProps {
  data: PackageBand[];
  isLoading: boolean;
}

// Sequential single-hue ramp (light -> dark), taken straight from this
// repo's admin-* color tokens — package bands are ordered magnitude bins
// (lowest CTC to highest), so a light-to-dark progression reads correctly
// rather than an arbitrary categorical palette.
const RAMP = ["#eaf0fb", "#c1d5f5", "#8aa0c6", "#2f63cc", "#1d47ae", "#16358a", "#12296b"];

function rampColor(index: number, count: number): string {
  if (count <= 1) return RAMP[RAMP.length - 1];
  const step = (RAMP.length - 1) / (count - 1);
  return RAMP[Math.round(index * step)];
}

/** Accepted-offer count by package band, this cycle — real counts from GET /drives/placement-stats. */
export function PackageDistributionCard({ data, isLoading }: PackageDistributionCardProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <SectionCard title="Package distribution" subtitle={`${total.toLocaleString("en-IN")} accepted offers`}>
      {total === 0 ? (
        <PendingNotice reason={isLoading ? "Loading…" : "No accepted offers yet."} height={140} />
      ) : (
        <DonutChart
          data={data.map((d, i) => ({ label: `₹${d.label}`, value: d.count, color: rampColor(i, data.length) }))}
          centerLabel="Offers"
          centerValue={total}
        />
      )}
    </SectionCard>
  );
}
