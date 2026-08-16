"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { useStudentSubjects } from "@/modules/admin/api/students";
import { SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

export function SubjectsSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentSubjects(studentId, active);
  if (isLoading) return <Stub message="Loading…" />;

  return (
    <SectionCard title="Registered subjects">
      <SimpleTable
        headers={["Subject", "Code", "Credits", "Semester"]}
        emptyMessage="No subjects registered for this class."
        rows={(data ?? []).map((s) => [s.name, s.subject_code, s.credits ?? "—", s.semester])}
      />
    </SectionCard>
  );
}
