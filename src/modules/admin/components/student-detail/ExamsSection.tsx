"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { useStudentExamMarks } from "@/modules/admin/api/students";
import { SimpleTable, Stub } from "@/modules/admin/components/student-detail/shared";

export function ExamsSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentExamMarks(studentId, active);
  if (isLoading) return <Stub message="Loading…" />;

  return (
    <SectionCard title="Examinations & results">
      <SimpleTable
        headers={["Exam", "Subject", "Marks"]}
        emptyMessage="No exam marks recorded."
        rows={(data ?? []).map((m) => [
          `${m.exam_subject_mapping.exams.exam_types?.name ?? "Exam"} · ${m.exam_subject_mapping.exams.academic_year}`,
          `${m.exam_subject_mapping.subjects.name} (${m.exam_subject_mapping.subjects.subject_code})`,
          `${m.marks_obtained ?? "—"} / ${m.max_marks}`,
        ])}
      />
    </SectionCard>
  );
}
