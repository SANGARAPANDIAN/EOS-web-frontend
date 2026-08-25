"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, SearchBar, Select } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useDepartments } from "@/modules/coe/api/reference";
import { useStudentExamRecordList } from "@/modules/coe/api/studentExamRecord";

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CoeStudentExamRecordListPage() {
  const departments = useDepartments();
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const students = useStudentExamRecordList({ department_id: departmentId, semester, search });
  const rows = students.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Student Exam Record" subtitle="Everything the examination section holds on one candidate — registrations, eligibility, marks, arrears, dues and certificates." />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar placeholder="Search name, register or roll number…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[280px]" />
          <Select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[150px]">
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={semester ?? ""} onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[140px]">
            <option value="">All semesters</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {students.isLoading ? (
        <SkeletonTable rows={8} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Students</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No students match the current filter.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[260px]">Programme</div>
                <div className="w-[110px]">Department</div>
                <div className="w-[130px]">Semester</div>
              </div>
              {rows.map((s) => (
                <Link
                  key={s.id}
                  href={`/coe/student-exam-record/${s.id}`}
                  className="flex items-center gap-4 border-b border-divider px-5 py-3.5 last:border-0 hover:bg-surface-subtle"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[13px] font-extrabold text-primary">
                      {(s.name ?? s.register_no).slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[13.5px] font-bold text-ink">{s.name ?? s.register_no}</div>
                      <div className="text-[11.5px] text-muted">{s.register_no}</div>
                    </div>
                  </div>
                  <div className="w-[260px] text-[12.5px] text-ink">{s.programme ?? "—"}</div>
                  <div className="w-[110px] text-[12.5px] text-ink">{s.department?.code ?? "—"}</div>
                  <div className="w-[130px] text-[12.5px] text-ink">{s.semester ? `Semester ${s.semester}${s.section ? ` · ${s.section}` : ""}` : "—"}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
