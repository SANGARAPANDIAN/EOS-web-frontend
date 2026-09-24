"use client";

import { Card, Badge, EmptyState } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildOdRequests } from "@/modules/parent/api/od";
import type { OdOverallStatus } from "@/modules/parent/api/od";
import { formatDisplayDate } from "@/lib/utils/date";

const STATUS_LABEL: Record<OdOverallStatus, string> = {
  pending_mentor: "Pending mentor",
  pending_hod: "Pending HoD",
  approved: "Approved",
  rejected: "Rejected",
};

export default function ParentOdPage() {
  const { selectedChildId } = useSelectedChild();
  const odRequests = useChildOdRequests(selectedChildId);
  const rows = odRequests.data?.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">On duty</h1>
          <p className="mt-1 text-[13.5px] text-muted">Team OD requests your child is part of</p>
        </div>
        <ChildSwitcher />
      </div>

      {odRequests.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState message="No OD requests yet." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold tracking-[-.02em] text-ink">{r.reason}</div>
                  <div className="mt-1 text-[13px] text-muted">
                    {formatDisplayDate(r.from_date)} – {formatDisplayDate(r.to_date)}
                    {r.faculty_guide_name ? ` · Guide: ${r.faculty_guide_name}` : ""}
                  </div>
                  <div className="mt-1.5 text-[12px] text-subtle">
                    {r.member_count} member{r.member_count === 1 ? "" : "s"} · {r.approved_count} approved
                    {r.rejected_count > 0 ? ` · ${r.rejected_count} rejected` : ""}
                    {r.pending_count > 0 ? ` · ${r.pending_count} pending` : ""}
                  </div>
                </div>
                <Badge tone={r.overall_status === "rejected" ? "accentDark" : "accent"}>
                  {STATUS_LABEL[r.overall_status] ?? r.overall_status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
