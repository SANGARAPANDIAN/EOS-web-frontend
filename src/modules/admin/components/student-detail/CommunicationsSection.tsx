"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import { useStudentAnnouncements } from "@/modules/admin/api/students";
import { Stub } from "@/modules/admin/components/student-detail/shared";

export function CommunicationsSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentAnnouncements(studentId, active);
  if (isLoading) return <Stub message="Loading…" />;

  if (!data || data.length === 0) {
    return <Stub message="No announcements targeted at this student's class." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((a) => (
        <SectionCard key={a.id} title={a.title} actions={<span className="text-xs text-admin-subtle">{formatDate(a.created_at)}</span>}>
          <p className="text-sm text-admin-body">{a.content}</p>
        </SectionCard>
      ))}
    </div>
  );
}
