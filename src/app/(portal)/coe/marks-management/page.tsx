"use client";

import { useState } from "react";
import { Card, StatCard, Button, Badge, Modal } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useDepartmentCompletion, useSetMarksEntryLock, useGradeMatrix, type DepartmentCompletion } from "@/modules/coe/api/marksRoster";

// Real, but at department granularity (marks_entry_locks locks a whole
// department for an exam, not one course) — the design shows a per-course
// row; this shows the real per-department completion + lock control that
// actually exists in the backend, matching /coe/marks-entry's own pattern.
export default function CoeMarksManagementPage() {
  const completion = useDepartmentCompletion();
  const setLock = useSetMarksEntryLock();
  const [viewing, setViewing] = useState<DepartmentCompletion | null>(null);

  const departments = completion.data?.departments ?? [];
  const examId = completion.data?.exam_id ?? null;
  const totalRecorded = departments.reduce((s, d) => s + d.entries_recorded, 0);
  const totalExpected = departments.reduce((s, d) => s + d.entries_expected, 0);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Marks Management" subtitle="Internal, external and practical mark entry, verification, approval and lock." />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Departments tracked" value={departments.length} icon="apartment" />
        <StatCard label="Entries recorded" value={totalRecorded} icon="edit_note" sub={`of ${totalExpected} expected`} />
        <StatCard label="Completion" value={totalExpected > 0 ? `${Math.round((totalRecorded / totalExpected) * 100)}%` : "—"} icon="donut_large" />
        <StatCard label="Exam" value={examId ? `#${examId}` : "—"} icon="fact_check" />
      </div>

      {completion.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Department completion</span>
            <span className="text-[12.5px] text-muted">{departments.length} records</span>
          </div>
          {departments.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No marks recorded yet for the most recent exam.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Department</div>
                <div className="w-[120px]">Entries</div>
                <div className="w-[110px]">Completion</div>
                <div className="w-[150px] text-right">Actions</div>
              </div>
              {departments.map((d) => (
                <div key={d.department_id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{d.department_name}</div>
                    <div className="text-[11.5px] text-muted">{d.department_code}</div>
                  </div>
                  <div className="w-[120px] text-[12.5px] text-ink">
                    {d.entries_recorded}/{d.entries_expected}
                  </div>
                  <div className="w-[110px]">
                    <Badge tone={d.percent >= 100 ? "accentDark" : "accent"}>{d.percent}%</Badge>
                  </div>
                  <div className="flex w-[150px] shrink-0 justify-end gap-2">
                    <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => setViewing(d)}>
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-auto px-3 py-1.5 text-[12px]"
                      disabled={!examId || setLock.isPending}
                      onClick={() => examId && setLock.mutate({ exam_id: examId, department_id: d.department_id, is_locked: true })}
                    >
                      Lock
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {viewing && <DepartmentGradeMatrixModal department={viewing} examId={examId} onClose={() => setViewing(null)} />}
    </div>
  );
}

function DepartmentGradeMatrixModal({ department, examId, onClose }: { department: DepartmentCompletion; examId: number | null; onClose: () => void }) {
  const matrix = useGradeMatrix({ exam_id: examId, department_id: department.department_id });

  return (
    <Modal
      open
      onClose={onClose}
      title={`${department.department_name} · Entered marks`}
      subtitle={matrix.data ? `${matrix.data.papers.length} courses · ${matrix.data.students.length} students` : "Loading…"}
    >
      {matrix.isLoading ? (
        <p className="text-[13px] text-subtle">Loading…</p>
      ) : !matrix.data || matrix.data.students.length === 0 ? (
        <p className="text-[13px] text-subtle">No grades recorded yet for this department.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-divider text-left text-[10.5px] uppercase tracking-[.05em] text-subtle">
                <th className="sticky left-0 bg-surface px-3 py-2">Student</th>
                {matrix.data.papers.map((p) => (
                  <th key={p.subject_id} className="px-3 py-2 text-center" title={p.subject_name}>
                    {p.subject_code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.data.students.map((s) => (
                <tr key={s.student_id} className="border-b border-divider last:border-0">
                  <td className="sticky left-0 bg-surface px-3 py-2 font-bold text-ink">
                    {s.name ?? s.register_no}
                    <div className="text-[10.5px] font-normal text-muted">{s.register_no}</div>
                  </td>
                  {matrix.data!.papers.map((p) => (
                    <td key={p.subject_id} className="px-3 py-2 text-center text-ink">
                      {s.grades[p.subject_id] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
