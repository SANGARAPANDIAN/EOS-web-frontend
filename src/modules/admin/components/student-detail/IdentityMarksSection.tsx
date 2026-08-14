"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { useStudentProfileDetails } from "@/modules/admin/api/students";
import { SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

export function IdentityMarksSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentProfileDetails(studentId, active);
  if (isLoading || !data) return <Stub message="Loading…" />;

  return (
    <SectionCard title="Identity marks">
      <SimpleTable
        headers={["#", "Description"]}
        emptyMessage="No identity marks on record."
        rows={data.identity_marks.map((m) => [m.mark_number, m.description])}
      />
    </SectionCard>
  );
}
