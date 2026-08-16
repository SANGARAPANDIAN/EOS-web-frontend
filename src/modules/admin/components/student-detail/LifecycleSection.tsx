"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import { useStudentLifecycle } from "@/modules/admin/api/students";
import { Stub } from "@/modules/admin/components/student-detail/shared";

export function LifecycleSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentLifecycle(studentId, active);
  if (isLoading || !data) return <Stub message="Loading…" />;

  const stages = [
    { label: "Application submitted", date: data.application_submitted_at, detail: data.application_status },
    { label: "Admitted", date: data.admitted_at, detail: null as string | null },
    { label: "Current standing", date: null as string | null, detail: data.current_status },
    ...(data.alumni_status ? [{ label: "Alumni", date: data.alumni_joined_at, detail: data.alumni_status }] : []),
  ];

  return (
    <SectionCard title="Lifecycle">
      <div className="flex flex-col">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex gap-3 pb-5 last:pb-0">
            <div className="flex flex-col items-center">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-admin-primary" />
              {i < stages.length - 1 && <span className="mt-1 w-px flex-1 bg-admin-border" />}
            </div>
            <div className="min-w-0 pb-1">
              <p className="text-sm font-medium text-admin-ink">{stage.label}</p>
              <p className="text-xs text-admin-muted">
                {stage.date ? formatDate(stage.date) : "—"}
                {stage.detail ? ` · ${stage.detail}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
