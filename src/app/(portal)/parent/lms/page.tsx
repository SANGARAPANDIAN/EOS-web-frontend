"use client";

import Link from "next/link";
import { Card, EmptyState, Icon } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildLmsSubjects } from "@/modules/parent/api/lms";
import { useChildAcademicCalendar } from "@/modules/parent/api/calendar";

export default function ParentLmsPage() {
  const { selectedChildId } = useSelectedChild();
  const subjects = useChildLmsSubjects(selectedChildId);
  const academicCalendar = useChildAcademicCalendar(selectedChildId);
  const semester = academicCalendar.data?.semester;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Learning management system</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {semester ? `Semester ${semester} · ` : ""}open a course to see its assignments
          </p>
        </div>
        <ChildSwitcher />
      </div>

      {subjects.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !subjects.data || subjects.data.length === 0 ? (
        <Card>
          <EmptyState message="No subjects assigned to this class yet." />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {subjects.data.map((subject) => (
            <Link key={subject.subject_id} href={`/parent/lms/${subject.subject_id}`}>
              <Card className="flex h-full flex-col gap-3 transition-colors hover:bg-nav-hover">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-icon-chip">
                  <Icon name="menu_book" size={19} className="text-primary" />
                </div>
                <div>
                  <div className="text-[15px] font-extrabold leading-[1.25] tracking-[-.02em] text-ink">{subject.subject_name}</div>
                  <div className="mt-[3px] font-mono text-[11.5px] text-subtle">{subject.subject_code}</div>
                  {subject.faculty_name && <div className="mt-1 text-[12px] text-muted">{subject.faculty_name}</div>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
