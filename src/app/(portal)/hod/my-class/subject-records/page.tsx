"use client";

import { useState } from "react";
import { Card, Badge, Select, SkeletonFilterBar, SkeletonStatTiles, SkeletonTable } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useHodSubjectRecords, type HodSubjectRecordsStudentRow } from "@/modules/hod/api/myClassSubjectRecords";
import { MarkEntryPanel } from "@/modules/shared/marks/MarkEntryPanel";
import { yearLabelForSemester } from "@/lib/utils/academic";

function gradeTone(grade: string): "accent" | "accentDark" | "danger" {
  if (grade === "RA") return "danger";
  if (grade === "O" || grade === "A+") return "accentDark";
  return "accent";
}

function GradebookTab() {
  const [classKey, setClassKey] = useState<string | null>(null);
  const [semester, setSemester] = useState<number | null>(null);

  const [classId, subjectId] = classKey ? classKey.split(":").map(Number) : [undefined, undefined];
  const overview = useHodSubjectRecords(classId, subjectId, semester ?? undefined);

  const o = overview.data;
  const handled = o?.handled_classes ?? [];
  const columns = o?.columns ?? [];
  const students = o?.students ?? [];

  const tableColumns: DataTableColumn<HodSubjectRecordsStudentRow & { rowNo: number }>[] = [
    {
      key: "no",
      header: "",
      width: "34px",
      render: (r) => <span className="text-[12.5px] font-bold text-[#080000]">{String(r.rowNo).padStart(2, "0")}</span>,
    },
    {
      key: "student",
      header: "Student",
      width: "2.4fr",
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold text-[#080000]">{r.name}</div>
          <div className="truncate text-[12px] font-bold text-[#080000]">{[r.student_id_no, r.email].filter(Boolean).join(" · ")}</div>
        </div>
      ),
    },
    ...columns.map(
      (col): DataTableColumn<HodSubjectRecordsStudentRow & { rowNo: number }> => ({
        key: `col-${col.mapping_id}`,
        header: <span className="whitespace-nowrap">{col.label}</span>,
        width: "1fr",
        align: "right",
        render: (r) => {
          const cell = r.cells.find((c) => c.mapping_id === col.mapping_id);
          if (!cell) return <span className="text-subtle">—</span>;
          if (cell.is_absent) return <span className="font-bold text-danger-fg">AB</span>;
          if (cell.marks_obtained == null) return <span className="text-subtle">—</span>;
          return (
            <span className="text-[14px]">
              <span className="font-bold text-ink">{cell.marks_obtained}</span>
              {col.max_marks != null && <span className="text-subtle"> / {col.max_marks}</span>}
            </span>
          );
        },
      }),
    ),
    {
      key: "grade",
      header: "Semester Grade",
      width: "1fr",
      align: "right",
      render: (r) => (r.grade ? <Badge tone={gradeTone(r.grade)}>{r.grade}</Badge> : <span className="text-subtle">—</span>),
    },
  ];

  return (
    <>
      {overview.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load subject records — please try again.
        </div>
      )}

      {overview.isLoading ? (
        <div className="flex flex-col gap-5">
          <SkeletonFilterBar />
          <SkeletonStatTiles count={3} />
          <SkeletonTable rows={7} />
        </div>
      ) : overview.isError ? null : handled.length === 0 ? (
        <Card>
          <div className="text-[13px] text-subtle">You are not mapped to teach any class/subject yet.</div>
        </Card>
      ) : (
        <>
          <Card className="hod-hover-card">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
                  Semester
                </label>
                <Select
                  value={semester ?? o?.selected_semester ?? ""}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  disabled={(o?.semesters ?? []).length === 0}
                  className="font-bold text-[#080000]"
                >
                  {(o?.semesters ?? []).length === 0 ? (
                    <option value="">No internal marks recorded yet</option>
                  ) : (
                    o!.semesters.map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))
                  )}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
                  Class &amp; Subject
                </label>
                <Select
                  value={classKey ?? `${handled[0].class_id}:${handled[0].subject_id}`}
                  onChange={(e) => {
                    setClassKey(e.target.value);
                    setSemester(null);
                  }}
                  className="font-bold text-[#080000]"
                >
                  {handled.map((h) => (
                    <option key={`${h.class_id}:${h.subject_id}`} value={`${h.class_id}:${h.subject_id}`}>
                      {yearLabelForSemester(h.semester)}-{h.section} · {h.subject_code} {h.subject_name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {columns.length === 0 ? (
            <Card>
              <div className="text-[13px] text-subtle">No internal marks recorded for this class &amp; subject yet.</div>
            </Card>
          ) : (
            <>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length + 1}, 1fr)` }}>
                <Card className="hod-hover-card">
                  <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Students</div>
                  <div className="mt-1.5 text-[26px] font-extrabold text-ink">{o?.student_count ?? 0}</div>
                </Card>
                {columns.map((col) => (
                  <Card key={col.mapping_id} className="hod-hover-card">
                    <div className="truncate text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">
                      {col.label} Avg
                    </div>
                    <div className="mt-1.5 text-[26px] font-extrabold text-ink">{col.average ?? "—"}</div>
                  </Card>
                ))}
              </div>

              <div className="overflow-x-auto">
                <DataTable
                  columns={tableColumns}
                  data={students.map((s, i) => ({ ...s, rowNo: i + 1 }))}
                  rowKey={(r) => r.student_id}
                  rowClassName="hod-hover-row"
                  className="min-w-[900px]"
                />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export default function HodSubjectRecordsPage() {
  const [tab, setTab] = useState<"gradebook" | "enter">("gradebook");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Subject Records</h1>
          <p className="mt-1 text-[13px] text-muted">
            {tab === "gradebook" ? "Marks for the subjects you handle personally" : "Enter marks · Save keeps a draft, Publish makes it visible"}
          </p>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as "gradebook" | "enter")}
          options={[
            { key: "gradebook", label: "Gradebook" },
            { key: "enter", label: "Enter marks" },
          ]}
        />
      </div>

      {tab === "gradebook" ? <GradebookTab /> : <MarkEntryPanel />}
    </div>
  );
}
