"use client";

import { useParams, useRouter } from "next/navigation";
import { useOffers } from "@/modules/placement/hooks/useOffers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

function lpa(value: number | undefined): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

function joiningLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function DetailRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-divider py-2.5">
      <span className="min-w-33 text-[12.5px] text-muted">{label}</span>
      <span className="flex-1 text-[13px] font-semibold">{value}</span>
      {badge && <Badge tone="accentDark">{badge}</Badge>}
    </div>
  );
}

export default function PlacementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { data, isLoading, error } = useOffers();
  const placement = data?.find((o) => o.id === id && o.offerResponse === "accepted");

  if (isLoading || error || !placement) {
    return <EmptyState loading={isLoading} message={error ? "Failed to load this placement." : "Placement not found."} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" className="w-auto self-start" onClick={() => router.push("/placement/placements")}>
        ← Back to Placements
      </Button>

      <Card>
        <div className="font-mono text-[11px] tracking-[.8px] text-subtle">PLACEMENT</div>
        <div className="mt-1.5 text-[27px] font-bold tracking-[-.02em] text-ink">{placement.studentName ?? placement.studentIdNo}</div>
        <div className="mt-1 text-[13.5px] text-muted">
          {placement.companyName} · {placement.jobRole ?? "—"}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-bold text-ink">Details</div>
        <div className="mt-2 flex flex-col">
          <DetailRow label="Register number" value={placement.registerNo ?? placement.rollNo ?? placement.studentIdNo} />
          <DetailRow label="Department" value={placement.departmentCode ?? "—"} />
          <DetailRow label="CTC" value={lpa(placement.offeredPackageLpa ?? placement.packageLpa)} />
          <DetailRow label="Joining" value={joiningLabel(placement.joiningDate)} />
          <DetailRow label="Location" value={placement.workLocation ?? "—"} />
          <DetailRow label="Status" value="" badge="Accepted" />
        </div>
      </Card>
    </div>
  );
}
