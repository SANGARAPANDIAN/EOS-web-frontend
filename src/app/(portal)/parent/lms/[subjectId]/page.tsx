"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Badge, EmptyState, Icon } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildLmsSubjects, useChildLmsTasks, type LmsTask } from "@/modules/parent/api/lms";
import { formatDisplayDate } from "@/lib/utils/date";

function AssignmentCard({ task }: { task: LmsTask }) {
  const graded = task.marks_obtained !== null;
  const status = graded ? "Evaluated" : task.is_submitted ? "Submitted" : "Pending";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3.5">
        <div>
          <div className="text-[15.5px] font-extrabold tracking-[-.02em] text-ink">{task.title}</div>
          <div className="mt-[3px] text-[12.5px] text-muted">
            {task.due_date ? `Due ${formatDisplayDate(task.due_date)}` : "No due date"}
            {task.max_marks !== null ? ` · ${task.max_marks} marks` : ""}
          </div>
          {task.description && <p className="mt-2 text-[13px] leading-[1.6] text-body">{task.description}</p>}
        </div>
        <Badge tone={status === "Pending" ? "accentDark" : "accent"}>{status}</Badge>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-divider pt-3.5">
        {task.attachment_url && (
          <a
            href={task.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-[9px] border border-border-default bg-surface-muted px-3 py-[7px] text-[12.5px] font-bold text-ink-soft"
          >
            <Icon name="attach_file" size={17} className="text-primary" />
            Task attachment
          </a>
        )}
        <div className="flex-1" />
        {graded ? (
          <span className="text-[12.5px] font-bold text-primary">
            Evaluated · {task.marks_obtained} / {task.max_marks}
          </span>
        ) : task.is_submitted ? (
          <span className="text-[12.5px] font-bold text-primary">
            Submitted {task.submitted_at ? formatDisplayDate(task.submitted_at) : ""} · awaiting evaluation
          </span>
        ) : (
          <span className="text-[12.5px] font-bold text-subtle">Not submitted yet</span>
        )}
      </div>
    </Card>
  );
}

export default function ParentLmsSubjectPage() {
  const params = useParams<{ subjectId: string }>();
  const subjectId = Number(params.subjectId);
  const { selectedChildId } = useSelectedChild();

  const subjects = useChildLmsSubjects(selectedChildId);
  const subject = subjects.data?.find((s) => s.subject_id === subjectId);
  const tasks = useChildLmsTasks(selectedChildId, subjectId);

  const subtitle = [subject?.subject_code, subject?.faculty_name, subject?.credits != null ? `${subject.credits} credits` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/parent/lms" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary">
            <Icon name="arrow_back" size={16} />
            All courses
          </Link>
          <h1 className="text-[24px] font-extrabold tracking-[-.02em] text-ink">{subject?.subject_name ?? "Course"}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        <ChildSwitcher />
      </div>

      {tasks.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !tasks.data || tasks.data.length === 0 ? (
        <Card>
          <EmptyState message="No assignments posted yet." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.data.map((task) => (
            <AssignmentCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
