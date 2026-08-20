"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, Badge, EmptyState, Icon } from "@/components/ui";
import { useMyLmsSubjects, usePendingLmsTasks } from "@/modules/student/api/lms";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";

export default function LmsPage() {
  const subjects = useMyLmsSubjects();
  const academicCalendar = useMyAcademicCalendar();
  const { pending } = usePendingLmsTasks();

  const dueCountBySubject = useMemo(() => {
    const map = new Map<number, number>();
    for (const task of pending) {
      map.set(task.subject_id, (map.get(task.subject_id) ?? 0) + 1);
    }
    return map;
  }, [pending]);

  const semester = academicCalendar.data?.semester;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Learning management system</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          {semester ? `Semester ${semester} · ` : ""}open a course for its material, assignments and lesson plan
        </p>
      </div>

      {subjects.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !subjects.data || subjects.data.length === 0 ? (
        <Card>
          <EmptyState message="No subjects assigned to your class yet." />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {subjects.data.map((subject) => {
            const dueCount = dueCountBySubject.get(subject.subject_id) ?? 0;
            return (
              <Link key={subject.subject_id} href={`/student/lms/${subject.subject_id}`}>
                <Card className="flex h-full flex-col gap-3 transition-colors hover:bg-nav-hover">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-[10px] bg-icon-chip">
                      <Icon name="menu_book" size={19} className="text-primary" />
                    </div>
                    {dueCount > 0 && <Badge tone="accentDark">{dueCount} due</Badge>}
                  </div>
                  <div>
                    <div className="text-[15px] font-extrabold leading-[1.25] tracking-[-.02em] text-ink">{subject.subject_name}</div>
                    <div className="mt-[3px] font-mono text-[11.5px] text-subtle">{subject.subject_code}</div>
                    {subject.faculty_name && <div className="mt-1 text-[12px] text-muted">{subject.faculty_name}</div>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
