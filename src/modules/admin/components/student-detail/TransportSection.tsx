"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatCurrency } from "@/modules/admin/lib/students-format";
import { useStudentTransport } from "@/modules/admin/api/students";
import { DlGrid, Stub } from "@/modules/admin/components/student-detail/shared";

export function TransportSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentTransport(studentId, active);
  if (isLoading) return <Stub message="Loading…" />;
  if (!data) return <Stub message="No transport mapping for this student — likely not using college transport." />;

  return (
    <SectionCard title="Transport">
      <DlGrid
        pairs={[
          ["Route", data.route?.name ?? null],
          ["Boarding stage", data.boarding_stage?.stage_name ?? null],
          ["Destination stage", data.destination_stage?.stage_name ?? null],
          ["Stage fee", data.boarding_stage ? formatCurrency(data.boarding_stage.fee_amount) : null],
        ]}
      />
    </SectionCard>
  );
}
