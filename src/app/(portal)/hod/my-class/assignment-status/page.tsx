"use client";

import { useState } from "react";
import { Card, Avatar, Button, Select, ProgressBar, SkeletonFilterBar, SkeletonRows } from "@/components/ui";
import {
  useHodAssignmentStatus,
  useMarkHodAssignmentStatus,
  type HodAssignmentStudentRow,
} from "@/modules/hod/api/myClassAssignmentStatus";
import { formatDisplayDate, formatDayAndTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

function assignmentLabel(a: { sequence_no: number; title: string | null }): string {
  return a.title ? `Assignment ${a.sequence_no} · ${a.title}` : `Assignment ${a.sequence_no}`;
}

function formatDueDate(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  return `${formatDisplayDate(iso)} · ${time}`;
}

export default function HodAssignmentStatusPage() {
  const [classKey, setClassKey] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<number | null>(null);

  const [classId, subjectId] = classKey ? classKey.split(":").map(Number) : [undefined, undefined];
  const overview = useHodAssignmentStatus(classId, subjectId, assignmentId ?? undefined);
  const mark = useMarkHodAssignmentStatus();

  const o = overview.data;
  const handled = o?.handled_classes ?? [];
  const assignments = o?.assignments ?? [];
  const students = o?.students ?? [];
  const submittedCount = students.filter((s) => s.is_submitted).length;

  function markStudent(row: HodAssignmentStudentRow, isSubmitted: boolean) {
    if (!o?.assignment) return;
    mark.mutate({
      assignment_id: o.assignment.id,
      student_id: row.student_id,
      status_id: row.status_id,
      is_submitted: isSubmitted,
    });
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Assignment Status</h1>
        <p className="mt-1 text-[13px] text-muted">Submission tracking across the classes you teach</p>
      </div>

      {overview.isLoading ? (
        <div className="flex flex-col gap-5">
          <SkeletonFilterBar />
          <SkeletonRows count={5} />
        </div>
      ) : handled.length === 0 ? (
        <Card>
          <div className="text-[13px] text-subtle">You are not mapped to teach any class/subject yet.</div>
        </Card>
      ) : (
        <>
          <Card className="hod-hover-card">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
                  Class &amp; Subject
                </label>
                <Select
                  value={classKey ?? `${handled[0].class_id}:${handled[0].subject_id}`}
                  onChange={(e) => {
                    setClassKey(e.target.value);
                    setAssignmentId(null);
                  }}
                  className="bg-surface-tint text-[15px] font-bold"
                >
                  {handled.map((h) => (
                    <option key={`${h.class_id}:${h.subject_id}`} value={`${h.class_id}:${h.subject_id}`}>
                      {[h.section, h.subject_code, h.subject_name].filter(Boolean).join(" · ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
                  Assignment
                </label>
                <Select
                  value={assignmentId ?? o?.assignment?.id ?? ""}
                  onChange={(e) => setAssignmentId(Number(e.target.value))}
                  disabled={assignments.length === 0}
                  className="text-[15px] font-bold"
                >
                  {assignments.length === 0 ? (
                    <option value="">No assignments yet</option>
                  ) : (
                    assignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {assignmentLabel(a)}
                      </option>
                    ))
                  )}
                </Select>
              </div>
            </div>
          </Card>

          {!o?.assignment ? (
            <Card>
              <div className="text-[13px] text-subtle">No assignments created for this class &amp; subject yet.</div>
            </Card>
          ) : (
            <>
              <Card className="hod-hover-card">
                <div className="flex items-center gap-5">
                  <span className="shrink-0 text-[15px] font-extrabold text-primary">
                    {submittedCount} of {students.length} submitted
                  </span>
                  <ProgressBar percent={students.length > 0 ? (submittedCount / students.length) * 100 : 0} className="flex-1" />
                  {o.assignment.due_date && (
                    <span className="shrink-0 text-[13px] text-muted">Due {formatDueDate(o.assignment.due_date)}</span>
                  )}
                </div>
              </Card>

              <div className="flex flex-col gap-3">
                {students.map((s) => (
                  <Card key={s.student_id} className="hod-hover-card">
                    <div className="flex items-center gap-3.5">
                      <Avatar name={s.name} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-bold text-ink">{s.name}</div>
                        <div className="truncate text-[12.5px] text-subtle">
                          {[s.student_id_no, s.email].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <span className="w-[92px] shrink-0 text-right text-[12.5px] text-subtle">
                        {s.is_submitted && s.marked_at ? formatDayAndTime(s.marked_at) : "—"}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-[11px] px-[18px] py-[10px] text-center text-[13px] font-bold",
                          s.is_submitted ? "bg-primary text-white" : "bg-surface-tint text-subtle",
                        )}
                      >
                        {s.is_submitted ? "Submitted" : "Not submitted"}
                      </span>
                      <Button variant="secondary" onClick={() => markStudent(s, !s.is_submitted)} disabled={mark.isPending}>
                        {s.is_submitted ? "Mark not submitted" : "Mark submitted"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
