"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { PageCrumbs, StatTile, FilterSelect, FilterBarFooter, Pager } from "@/modules/iqac/components/PageControls";
import { useStudentFilters, useStudentsList, type StudentRow } from "@/modules/iqac/api/students";

const PAGE_SIZE = 10;

const FEES_TONE: Record<StudentRow["fees_status"], BadgeTone> = {
  paid: "accent",
  partial: "neutral",
  pending: "danger",
  not_billed: "neutral",
};
const FEES_LABEL: Record<StudentRow["fees_status"], string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
  not_billed: "Not billed",
};
const PLACEMENT_LABEL: Record<StudentRow["placement_status"], string> = {
  placed: "Placed",
  applied: "Applied",
  not_registered: "Not registered",
};
const STATUS_TONE: Record<StudentRow["status"], BadgeTone> = { active: "accent", inactive: "neutral" };

type AttendanceBand = "all" | "below_75" | "75_90" | "above_90";
const ATTENDANCE_BANDS: { value: AttendanceBand; label: string }[] = [
  { value: "all", label: "Any attendance" },
  { value: "below_75", label: "Below 75%" },
  { value: "75_90", label: "75% – 90%" },
  { value: "above_90", label: "Above 90%" },
];

function yearOf(semester: number | null): number | null {
  return semester ? Math.ceil(semester / 2) : null;
}

const EMPTY_FILTERS = {
  q: "",
  departmentId: "",
  batchId: "",
  year: "",
  section: "",
  placement: "",
  attendance: "all" as AttendanceBand,
  status: "",
  arrears: "",
};

export default function IqacStudentsPage() {
  const router = useRouter();
  const [f, setF] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);

  const filters = useStudentFilters();
  const list = useStudentsList({
    q: f.q.trim() || undefined,
    department_id: f.departmentId ? Number(f.departmentId) : undefined,
    batch_id: f.batchId ? Number(f.batchId) : undefined,
    section: f.section || undefined,
    status: "all",
  });

  const allRows = useMemo(() => list.data?.students ?? [], [list.data]);

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (f.year && yearOf(r.semester) !== Number(f.year)) return false;
      if (f.placement && r.placement_status !== f.placement) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.arrears === "with" && r.has_arrears !== true) return false;
      if (f.arrears === "without" && r.has_arrears !== false) return false;
      if (f.attendance !== "all") {
        const pct = r.attendance_percentage;
        if (pct == null) return false;
        if (f.attendance === "below_75" && !(pct < 75)) return false;
        if (f.attendance === "75_90" && !(pct >= 75 && pct <= 90)) return false;
        if (f.attendance === "above_90" && !(pct > 90)) return false;
      }
      return true;
    });
  }, [allRows, f.year, f.placement, f.status, f.arrears, f.attendance]);

  const belowThreshold = rows.filter((r) => r.attendance_percentage != null && r.attendance_percentage < 75).length;
  const placedCount = rows.filter((r) => r.placement_status === "placed").length;
  const gradePoints = rows.map((r) => r.mean_grade_point).filter((v): v is number => v != null);
  const meanCgpa = gradePoints.length > 0 ? Math.round((gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length) * 100) / 100 : null;

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(rows.length, page * PAGE_SIZE + PAGE_SIZE);

  function update<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  const columns = useMemo<DataTableColumn<StudentRow>[]>(
    () => [
      {
        key: "student",
        header: "Student",
        width: "1.6fr",
        sortValue: (r) => r.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.name}</div>
            <div className="text-[12px] text-subtle">{r.roll_no ?? r.student_id_no}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.department?.code ?? "", render: (r) => r.department?.code ?? "—" },
      { key: "batch", header: "Batch", sortValue: (r) => r.batch?.name ?? "", render: (r) => r.batch?.name ?? "—" },
      {
        key: "year_sec",
        header: "Year / Sec",
        sortValue: (r) => yearOf(r.semester) ?? 0,
        render: (r) => {
          const y = yearOf(r.semester);
          return [y ? `Year ${y}` : null, r.section].filter(Boolean).join(" · ") || "—";
        },
      },
      { key: "mentor", header: "Mentor", sortValue: (r) => r.mentor?.name ?? "", render: (r) => r.mentor?.name ?? "—" },
      {
        key: "attendance",
        header: "Attendance",
        align: "right",
        sortValue: (r) => r.attendance_percentage ?? -1,
        render: (r) => (r.attendance_percentage != null ? `${r.attendance_percentage}%` : "—"),
      },
      { key: "fees", header: "Fees", sortValue: (r) => FEES_LABEL[r.fees_status], render: (r) => <Badge tone={FEES_TONE[r.fees_status]}>{FEES_LABEL[r.fees_status]}</Badge> },
      { key: "placement", header: "Placement", sortValue: (r) => PLACEMENT_LABEL[r.placement_status], render: (r) => PLACEMENT_LABEL[r.placement_status] },
      {
        key: "arrears",
        header: "Arrears",
        sortValue: (r) => (r.has_arrears == null ? -1 : r.has_arrears ? 1 : 0),
        render: (r) =>
          r.has_arrears == null ? (
            "—"
          ) : (
            <Badge tone={r.has_arrears ? "danger" : "accent"}>{r.has_arrears ? "With arrears" : "No arrears"}</Badge>
          ),
      },
      { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status === "active" ? "Active" : "Inactive"}</Badge> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <PageCrumbs items={["IQAC", "Records", "Students"]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Student records</h1>
          <p className="mt-1 text-[13.5px] text-muted">Institution-wide student register.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Records" value={rows.length} sub="students in this view" />
        <StatTile label="Mean CGPA" value={meanCgpa ?? "—"} sub="mean grade point, real exam_marks on file" />
        <StatTile label="Attendance below 75%" value={belowThreshold} sub="condonation review" />
        <StatTile label="Placed" value={placedCount} sub="offers accepted" />
      </div>

      <div className="rounded-card border border-border-default bg-surface p-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Search</div>
            <input
              value={f.q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search student name, roll number or mentor"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <FilterSelect
            label="Department"
            value={f.departmentId}
            onChange={(v) => update("departmentId", v)}
            options={[{ value: "", label: "All departments" }, ...(filters.data?.departments.map((d) => ({ value: String(d.id), label: d.name })) ?? [])]}
          />
          <FilterSelect
            label="Batch"
            value={f.batchId}
            onChange={(v) => update("batchId", v)}
            options={[{ value: "", label: "All batches" }, ...(filters.data?.batches.map((b) => ({ value: String(b.id), label: b.name })) ?? [])]}
          />
          <FilterSelect
            label="Year"
            value={f.year}
            onChange={(v) => update("year", v)}
            options={[
              { value: "", label: "All years" },
              { value: "1", label: "1st year" },
              { value: "2", label: "2nd year" },
              { value: "3", label: "3rd year" },
              { value: "4", label: "4th year" },
            ]}
          />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4">
          <FilterSelect
            label="Section"
            value={f.section}
            onChange={(v) => update("section", v)}
            options={[{ value: "", label: "All sections" }, ...(filters.data?.sections.map((s) => ({ value: s, label: `Section ${s}` })) ?? [])]}
          />
          <FilterSelect
            label="Placement"
            value={f.placement}
            onChange={(v) => update("placement", v)}
            options={[
              { value: "", label: "Any placement" },
              { value: "placed", label: "Placed" },
              { value: "applied", label: "Applied" },
              { value: "not_registered", label: "Not registered" },
            ]}
          />
          <FilterSelect label="Attendance" value={f.attendance} onChange={(v) => update("attendance", v as AttendanceBand)} options={ATTENDANCE_BANDS} />
          <FilterSelect
            label="Status"
            value={f.status}
            onChange={(v) => update("status", v)}
            options={[
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4">
          <FilterSelect
            label="Arrears"
            value={f.arrears}
            onChange={(v) => update("arrears", v)}
            options={[
              { value: "", label: "Any arrears" },
              { value: "with", label: "With arrears" },
              { value: "without", label: "No arrears" },
            ]}
          />
        </div>

        <FilterBarFooter
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={rows.length}
          onClear={() => {
            setF(EMPTY_FILTERS);
            setPage(0);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={pageRows}
        rowKey={(r) => r.id}
        loading={list.isLoading}
        emptyMessage="No students match these filters."
        onRowClick={(r) => router.push(`/iqac/students/${r.id}`)}
      />

      {rows.length > PAGE_SIZE && <Pager page={page} pageCount={pageCount} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />}
    </div>
  );
}
