"use client";

import { useMemo, useState } from "react";
import { Card, Select, Input, Button, EmptyState, SkeletonTable } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
import {
  useAdvisorExaminationFilters,
  useAdvisorExaminationGrid,
  downloadAdvisorExaminationGrid,
  type AdvisorExaminationRow,
} from "@/modules/advisor/api/examinations";

// Same class × exam-type marks grid HoD's Examinations & Results page
// shows (built by the shared backend ExamResultsGridService), scoped to
// the advisor's own mentee class(es) instead of a whole department —
// real, published marks for every paper, not just ones the advisor
// personally teaches. Replaces the old subject-records-based screen, which
// could only show subjects the advisor taught themselves (no endpoint
// existed to read a whole class's results across every teacher — see
// AdvisorExaminationsService on the backend for that gap now being closed).
export default function AdvisorExamsPage() {
  const filters = useAdvisorExaminationFilters();
  const dragScrollRef = useDragScroll<HTMLDivElement>();

  const [classId, setClassId] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [examTypeId, setExamTypeId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);

  const classes = filters.data?.classes ?? [];
  const effectiveClassId = classId ?? classes[0]?.class_id ?? null;
  const effectiveExamTypeId = examTypeId ?? filters.data?.exam_types[0]?.id ?? null;
  const selectedClass = classes.find((c) => c.class_id === effectiveClassId) ?? null;

  // Defaults to the selected class's own current semester when that
  // semester actually has exam data, otherwise the most recent semester
  // that does — never silently lands on an empty grid on first load.
  const availableSemesters = filters.data?.semesters ?? [];
  const effectiveSemester =
    semester ??
    (selectedClass && availableSemesters.some((s) => s.semester === selectedClass.semester) ? selectedClass.semester : null) ??
    availableSemesters[availableSemesters.length - 1]?.semester ??
    null;

  const grid = useAdvisorExaminationGrid(effectiveClassId, effectiveExamTypeId, effectiveSemester);

  const filteredRows = useMemo(() => {
    const rows = grid.data?.rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.register_no.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q));
  }, [grid.data, search]);

  const columns: DataTableColumn<AdvisorExaminationRow>[] = useMemo(() => {
    const deptCode = grid.data?.department.code ?? "";
    const sectionLabel = grid.data?.class.section ?? "";
    const isExternal = grid.data?.exam_type.category === "external";
    const subjectCols: DataTableColumn<AdvisorExaminationRow>[] = (grid.data?.subjects ?? []).map((s, i) => ({
      key: `subject-${s.id}`,
      header: (
        <div title={s.name}>
          <div className="font-extrabold text-ink normal-case tracking-normal">{s.code}</div>
          <div className="mt-0.5 whitespace-normal break-words font-medium leading-[1.25] text-subtle normal-case tracking-normal">{s.name}</div>
        </div>
      ),
      width: "130px",
      render: (row) => <span className="text-[13px] text-ink">{(isExternal ? row.grades?.[i] : row.marks[i]) ?? "—"}</span>,
    }));

    return [
      {
        key: "register_no",
        header: "Register No.",
        width: "130px",
        render: (row) => <span className="text-[13.5px] font-extrabold text-ink">{row.register_no}</span>,
      },
      {
        // Fixed px, not a flexible fr unit — DataTable renders every row as
        // its own independent CSS grid, so a flexible column's actual width
        // is computed per-row from that row's own content. A name with one
        // long unbreakable word (no space to wrap at, e.g. a surname like
        // "Balasubramanian") pushed just THAT row's flexible column wider
        // than its siblings, desyncing every column after it row-to-row. A
        // fixed width can't be grown by content — every row gets the exact
        // same track size, so Dept/Sec/marks columns line up regardless of
        // any one candidate's name length.
        key: "name",
        header: "Candidate",
        width: "170px",
        render: (row) => <span className="block break-words text-[13.5px] font-bold text-ink">{row.name ?? "—"}</span>,
      },
      { key: "dept", header: "Dept", width: "60px", render: () => <span className="text-[13px] text-subtle">{deptCode}</span> },
      { key: "sec", header: "Sec", width: "50px", render: () => <span className="text-[13px] text-subtle">{sectionLabel}</span> },
      ...subjectCols,
    ];
  }, [grid.data]);

  async function handleDownload() {
    if (!selectedClass || !effectiveExamTypeId || !effectiveSemester || !grid.data) return;
    setDownloading(true);
    try {
      const filename = `examinations-${grid.data.department.code}-${grid.data.class.year_label}${grid.data.class.section}-${grid.data.exam_type.name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      await downloadAdvisorExaminationGrid(selectedClass.class_id, effectiveExamTypeId, effectiveSemester, `${filename}.xlsx`);
    } finally {
      setDownloading(false);
    }
  }

  const breadcrumb = grid.data
    ? `${grid.data.candidates} candidates · ${grid.data.class.batch_label} · Semester ${grid.data.class.semester} · ${grid.data.department.code} · Section ${grid.data.class.section} · ${grid.data.exam_type.name}`
    : "";

  const anyError = filters.isError || grid.isError;
  const noMenteeClass = !filters.isLoading && classes.length === 0;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {anyError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load examination data — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Examinations &amp; Results</h1>
        <p className="mt-1 text-[13px] text-muted">Paper-wise marks and grades for every candidate in your class</p>
      </div>

      {noMenteeClass ? (
        <Card>
          <EmptyState message="You aren't the class advisor for any class yet — this view only covers your own mentee class(es)." />
        </Card>
      ) : (
        <>
          <Card className="hod-hover-card">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Class</label>
                <Select value={effectiveClassId ?? ""} onChange={(e) => setClassId(Number(e.target.value))}>
                  {classes.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.year_label}-{c.section} · {c.department?.code ?? "—"} · {c.batch_label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Semester</label>
                <Select value={effectiveSemester ?? ""} onChange={(e) => setSemester(Number(e.target.value))}>
                  {availableSemesters.map((s) => (
                    <option key={s.semester} value={s.semester}>
                      Semester {s.semester}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Examination type</label>
                <Select value={effectiveExamTypeId ?? ""} onChange={(e) => setExamTypeId(Number(e.target.value))}>
                  {(filters.data?.exam_types ?? []).map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] text-muted">{breadcrumb}</span>
            <div className="flex items-center gap-3">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search register no. or candidate" className="w-[280px]" />
              <Button variant="primarySmall" onClick={handleDownload} disabled={!grid.data || downloading}>
                {downloading ? "Preparing…" : "Download Excel"}
              </Button>
            </div>
          </div>

          <Card className="p-0">
            <div className="flex items-baseline gap-2 border-b border-divider px-5 py-4">
              <span className="text-[17px] font-extrabold text-ink">{grid.data?.department.code ?? ""}</span>
              <span className="text-[13px] text-muted">{grid.data ? `${grid.data.candidates} candidates · ${grid.data.papers} papers` : ""}</span>
            </div>
            {grid.isLoading || filters.isLoading ? (
              <SkeletonTable rows={8} className="rounded-none border-0 bg-transparent" />
            ) : anyError ? null : !grid.data || grid.data.papers === 0 ? (
              <EmptyState message="No examination found for this selection." />
            ) : (
              <div ref={dragScrollRef} className="cursor-grab overflow-x-auto">
                {/* Every column here is a fixed px width (no flexible `fr`
                    track to absorb a narrow viewport, since Candidate's own
                    column was deliberately made fixed-px too — see its
                    comment below), so the table's real width can exceed the
                    card. `width: max-content` makes DataTable's wrapper (and
                    every row inside it, which fills its parent) genuinely
                    that wide instead of being squeezed to the card and
                    silently clipping the last subject columns — the
                    drag-scrollable div above then makes the excess reachable
                    instead of invisible. `minWidth: 100%` keeps a
                    few-subject exam from looking oddly narrow. */}
                <DataTable
                  columns={columns}
                  data={filteredRows}
                  rowKey={(r) => r.student_id}
                  rowClassName="hod-hover-row"
                  style={{ width: "max-content", minWidth: "100%" }}
                />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
