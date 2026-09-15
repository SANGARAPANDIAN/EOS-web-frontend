"use client";

import { useMemo, useState } from "react";
import { Badge, Select, SkeletonTable } from "@/components/ui";
import { gradeTone } from "@/lib/utils/marks";
import { useStudentExamMarks } from "./api";
import { buildSubjectMarksRows } from "./types";

/**
 * Shared "Subject | CIA 1 | CIA 2 | Quiz | Internal | End Sem" pivot table —
 * one row per subject, End Sem always grade-only (never raw marks, and blank
 * until COE publishes it). Self-contained: owns its own semester selector and
 * data fetch (GET /exam-marks?student_id=), so every consumer — Admin's
 * Examinations & results panel, HoD/Faculty/Principal's student profile
 * "Current semester subjects", Principal's exam view — renders the exact
 * same shape from the exact same data source instead of each building its
 * own query/table.
 */
export function SubjectMarksTable({ studentId, active = true }: { studentId: number; active?: boolean }) {
  const marks = useStudentExamMarks(studentId, active);
  const records = useMemo(() => marks.data ?? [], [marks.data]);

  const semesters = useMemo(
    () => Array.from(new Set(records.map((r) => r.exam_subject_mapping.exams.semester))).sort((a, b) => a - b),
    [records],
  );
  const [semOverride, setSemOverride] = useState<number | null>(null);
  const sem = semOverride != null && semesters.includes(semOverride) ? semOverride : (semesters[semesters.length - 1] ?? null);

  const { columns, rows } = useMemo(() => buildSubjectMarksRows(records, sem), [records, sem]);

  if (marks.isLoading) return <SkeletonTable rows={5} />;

  if (marks.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load exam marks — please try again.
      </div>
    );
  }

  if (semesters.length === 0) {
    return <div className="p-8 text-center text-[13.5px] font-semibold text-subtle">No exam marks recorded yet.</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Semester</div>
        <Select value={sem ?? ""} onChange={(e) => setSemOverride(Number(e.target.value))} className="w-auto font-bold">
          {semesters.map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-divider">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-divider bg-surface-tint text-[10.5px] font-extrabold tracking-[.09em] text-subtle uppercase">
              <th className="px-4 py-3 text-left">Subject</th>
              {columns.map((c) => (
                <th key={c.code} className="px-3 py-3 text-center">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center">End Sem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="p-8 text-center text-[13.5px] font-semibold text-subtle">
                  No subjects mapped for this semester.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.subjectId} className="border-b border-divider last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-bold text-ink">{row.subjectName}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-subtle">{row.subjectCode}</div>
                </td>
                {columns.map((c) => {
                  const cell = row.cells[c.code];
                  return (
                    <td key={c.code} className="px-3 py-3 text-center font-semibold text-body">
                      {cell && cell.obtained != null ? `${cell.obtained}/${cell.max}` : "—"}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center">
                  {row.endSemGrade ? (
                    <Badge tone={gradeTone(row.endSemGrade)}>{row.endSemGrade}</Badge>
                  ) : (
                    <span className="text-[12.5px] font-semibold text-subtle">{row.endSemPublished ? "—" : "Pending"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
