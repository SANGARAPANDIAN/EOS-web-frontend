"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import { useStudentMedicalVisits } from "@/modules/admin/api/students";
import { SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

export function MedicalSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentMedicalVisits(studentId, active);
  if (isLoading) return <Stub message="Loading…" />;

  return (
    <SectionCard title="Medical visits" actions={<span className="text-xs text-admin-subtle">College health centre</span>}>
      <SimpleTable
        headers={["Date", "Reason", "Diagnosis", "Treatment", "Attended by", "Referred out"]}
        emptyMessage="No medical centre visits on record."
        rows={(data ?? []).map((v) => [
          formatDate(v.visit_date),
          v.reason ?? "—",
          v.diagnosis ?? "—",
          v.treatment_given ?? "—",
          v.attended_by ? `${v.attended_by.name}${v.attended_by.designation ? ` (${v.attended_by.designation})` : ""}` : "—",
          v.referred_to_hospital ? (
            <span key="r" className="font-medium text-admin-warning-fg">
              Yes
            </span>
          ) : (
            "No"
          ),
        ])}
      />
    </SectionCard>
  );
}
