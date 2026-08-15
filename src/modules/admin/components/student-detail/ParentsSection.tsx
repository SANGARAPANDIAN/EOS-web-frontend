"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { useStudentFamily } from "@/modules/admin/api/students";
import { DlGrid, Stub } from "@/modules/admin/components/student-detail/shared";

export function ParentsSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentFamily(studentId, active);
  if (isLoading) return <Stub message="Loading…" />;
  if (!data) return <Stub message="No family details on record." />;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <SectionCard title="Father">
        <DlGrid
          pairs={[
            ["Name", data.father_name],
            ["Qualification", data.father_qualification],
            ["Occupation", data.father_occupation],
            ["Annual income", data.father_annual_income],
            ["Email", data.father_email],
            ["Mobile", data.father_mobile],
          ]}
        />
      </SectionCard>
      <SectionCard title="Mother">
        <DlGrid
          pairs={[
            ["Name", data.mother_name],
            ["Qualification", data.mother_qualification],
            ["Occupation", data.mother_occupation],
            ["Annual income", data.mother_annual_income],
            ["Email", data.mother_email],
            ["Mobile", data.mother_mobile],
          ]}
        />
      </SectionCard>
    </div>
  );
}
