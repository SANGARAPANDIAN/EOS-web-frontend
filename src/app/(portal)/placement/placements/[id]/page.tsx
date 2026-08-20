"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Badge, Card } from "@/modules/admin/components/ui";
import { useOffers } from "@/modules/placement/api/offers";
import { lpa } from "@/modules/placement/lib/format";

function joiningLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function DetailRow({ label, value, badge }: { label: string; value?: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-admin-divider py-2.5 first:border-t-0">
      <span className="min-w-[150px] text-[12.5px] text-admin-muted">{label}</span>
      {value !== undefined && <span className="flex-1 text-sm font-medium text-admin-ink">{value}</span>}
      {badge}
    </div>
  );
}

export default function PlacementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, error } = useOffers();
  const placement = data?.find((o) => o.id === id && o.offerResponse === "accepted");

  if (isLoading) return <p className="text-sm text-admin-muted">Loading…</p>;
  if (error || !placement) return <p className="text-sm text-admin-danger">Failed to load this placement.</p>;

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/placement/placements" className="hover:text-admin-body">
          Placements
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">{placement.studentName ?? placement.studentIdNo}</span>
      </nav>

      <Card hoverable={false} className="p-6">
        <p className="font-mono text-[11px] tracking-[.08em] text-admin-subtle uppercase">Placement</p>
        <h1 className="mt-1.5 font-sans text-[27px] font-extrabold tracking-tight text-admin-ink">
          {placement.studentName ?? placement.studentIdNo}
        </h1>
        <p className="mt-1 text-sm text-admin-muted">
          {placement.companyName} · {placement.jobRole ?? "—"}
        </p>
        <div className="mt-3">
          <Badge tone="success">Accepted</Badge>
        </div>
      </Card>

      <Card hoverable={false} className="p-5">
        <h2 className="font-sans text-[15px] font-bold text-admin-ink">Details</h2>
        <div className="mt-2">
          <DetailRow label="Register number" value={placement.registerNo ?? placement.rollNo ?? placement.studentIdNo} />
          <DetailRow label="Department" value={placement.departmentCode ?? "—"} />
          <DetailRow label="CTC" value={lpa(placement.offeredPackageLpa ?? placement.packageLpa)} />
          <DetailRow label="Joining" value={joiningLabel(placement.joiningDate)} />
          <DetailRow label="Location" value={placement.workLocation ?? "—"} />
          <DetailRow label="Status" badge={<Badge tone="success">Accepted</Badge>} />
        </div>
      </Card>
    </div>
  );
}
