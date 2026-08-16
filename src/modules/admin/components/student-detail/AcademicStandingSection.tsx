"use client";

import { useStudentSubjects } from "@/modules/admin/api/students";
import { MetricTile } from "@/modules/admin/components/student-detail/shared";

export function AcademicStandingSection({
  currentSemester,
  studentId,
  active,
}: {
  currentSemester: number | null;
  studentId: number;
  active: boolean;
}) {
  const { data: subjects, isLoading } = useStudentSubjects(studentId, active);
  const totalCredits = subjects?.reduce((sum, s) => sum + (s.credits ?? 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricTile
          label="Current semester"
          value={currentSemester ? String(currentSemester) : "—"}
          tone={currentSemester ? "success" : "muted"}
        />
        <MetricTile
          label="Registered subjects"
          value={isLoading ? "…" : String(subjects?.length ?? 0)}
          tone={subjects?.length ? "success" : "muted"}
        />
        <MetricTile
          label="Credits this semester"
          value={isLoading ? "…" : String(totalCredits)}
          note="Sum of registered subjects — not a cumulative earned total"
          tone={totalCredits ? "success" : "muted"}
        />
      </div>
      <MetricTile label="CGPA" value="—" note="No CGPA aggregate endpoint yet" />
    </div>
  );
}
