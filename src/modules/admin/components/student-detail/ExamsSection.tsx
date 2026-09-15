"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { SubjectMarksTable } from "@/modules/shared/marks/SubjectMarksTable";

export function ExamsSection({ studentId, active }: { studentId: number; active: boolean }) {
  return (
    <SectionCard title="Examinations & results">
      <SubjectMarksTable studentId={studentId} active={active} />
    </SectionCard>
  );
}
