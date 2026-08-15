"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import { useStudentPlacementHistory } from "@/modules/admin/api/students";
import { SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

export function PlacementsSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentPlacementHistory(studentId, active);
  if (isLoading) return <Stub message="Loading…" />;

  return (
    <SectionCard title="Placement drive history">
      <SimpleTable
        headers={["Company", "Scheduled", "Drive status", "Application status"]}
        emptyMessage="No placement drive applications on record."
        rows={(data ?? []).map((p) => [
          p.company_name,
          formatDate(p.scheduled_date),
          <span key="d" className="capitalize">
            {p.drive_status}
          </span>,
          <span key="a" className="capitalize">
            {p.application_status}
          </span>,
        ])}
      />
    </SectionCard>
  );
}
