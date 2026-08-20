"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import { useStudentRequests } from "@/modules/admin/api/students";
import { SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  leave: "Leave",
  outing: "Hostel outing",
  bonafide: "Bonafide certificate",
  od: "On-duty",
};

export function RequestsSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentRequests(studentId, active);
  if (isLoading) return <Stub message="Loading…" />;

  return (
    <SectionCard title="Requests" actions={<span className="text-xs text-admin-subtle">Leave · Outing · Bonafide · On-duty</span>}>
      <SimpleTable
        headers={["Type", "Dates", "Detail", "Status", "Submitted"]}
        emptyMessage="No requests on record across leave, outing, bonafide, or on-duty."
        rows={(data ?? []).map((r) => [
          REQUEST_TYPE_LABELS[r.type] ?? r.type,
          r.from_date ? `${formatDate(r.from_date)} – ${formatDate(r.to_date)}` : "—",
          r.detail ?? "—",
          <span key="s" className="capitalize">
            {r.status.replace(/_/g, " ")}
          </span>,
          formatDate(r.created_at),
        ])}
      />
    </SectionCard>
  );
}
