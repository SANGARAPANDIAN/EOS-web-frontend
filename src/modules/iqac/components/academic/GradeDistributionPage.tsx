"use client";

import { useMemo, useState } from "react";
import { DataTable, EmptyState, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "./MetricPageChrome";
import { useGradeDistribution, useExamFilters, type GradeDistributionRegisterRow } from "@/modules/iqac/api/academicQuality";

const BAND_OPTIONS = ["All", "On track", "Below 6.0"];

export function GradeDistributionPage() {
  const filters = useExamFilters();
  const [batchId, setBatchId] = useState<number | null>(null);
  const dist = useGradeDistribution(batchId);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [section, setSection] = useState("all");
  const [semester, setSemester] = useState("all");
  const [sort, setSort] = useState("all");
  const [band, setBand] = useState("All");

  const register = useMemo(() => dist.data?.register ?? [], [dist.data]);

  const options = (values: (string | number)[]) =>
    Array.from(new Set(values)).map((v) => ({ value: String(v), label: String(v) }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return register.filter((r) => {
      const okQ = !q || `${r.department_code} ${r.section} ${r.class_advisor ?? ""}`.toLowerCase().includes(q);
      const okD = dept == null || r.department_code === dept;
      const okS = section === "all" || r.section === section;
      const okSem = semester === "all" || String(r.semester) === semester;
      const okB = band === "All" || (band === "On track" ? (r.mean_grade_point ?? 0) >= 6 : (r.mean_grade_point ?? 0) < 6);
      return okQ && okD && okS && okSem && okB;
    });
  }, [register, search, dept, section, semester, band]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "high") rows.sort((a, b) => (b.mean_grade_point ?? 0) - (a.mean_grade_point ?? 0));
    if (sort === "low") rows.sort((a, b) => (a.mean_grade_point ?? 0) - (b.mean_grade_point ?? 0));
    return rows;
  }, [filtered, sort]);

  function clearFilters() {
    setSearch("");
    setBatchId(null);
    setDept(null);
    setSection("all");
    setSemester("all");
    setSort("all");
    setBand("All");
  }

  const columns = useMemo<DataTableColumn<GradeDistributionRegisterRow>[]>(
    () => [
      { key: "dept", header: "Dept", render: (r) => <span className="font-bold text-ink">{r.department_code}</span> },
      { key: "section", header: "Sec", render: (r) => r.section },
      { key: "batch", header: "Batch", render: (r) => <span className="font-mono text-[12px] text-subtle">{r.batch_label}</span> },
      { key: "sem", header: "Sem", render: (r) => r.semester ?? "—" },
      { key: "advisor", header: "Class advisor", render: (r) => r.class_advisor ?? "Not assigned" },
      { key: "mean_gp", header: "Mean grade point", align: "right", render: (r) => (r.mean_grade_point != null ? <span className="font-extrabold text-ink">{r.mean_grade_point}</span> : "—") },
      { key: "target", header: "Target", align: "right", render: (r) => (r.target != null ? r.target : "—") },
      { key: "attainment", header: "Attainment", align: "right", render: (r) => (r.attainment != null ? `${r.attainment}%` : "—") },
    ],
    [],
  );

  const rollupItems = (dist.data?.departments ?? []).map((d) => ({
    code: d.code,
    value: d.mean_grade_point != null ? String(d.mean_grade_point) : "—",
    pct: d.mean_grade_point != null ? (d.mean_grade_point / 10) * 100 : null,
  }));

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Academic Quality · Grade distribution" />
      <MetricHeader
        name="Grade distribution"
        blurb="Real grade-band spread for one exam — a composite CGPA isn't computable from current exam_marks data."
      />

      <MetricCards
        cards={[
          {
            label: "This year",
            value: dist.data?.mean_grade_point ?? "—",
            foot: dist.data?.exam ? `${dist.data.graded_attempts.toLocaleString("en-IN")} graded attempts · Semester ${dist.data.exam.semester}` : "no exam recorded yet",
          },
          { label: "Last year", value: "—", foot: "no reliable exam-to-exam pairing across years" },
          { label: "Target", value: dist.data?.target != null ? dist.data.target : "—", foot: "not yet set by IQAC for this AY" },
          {
            label: "Attainment",
            value: dist.data?.attainment != null ? `${dist.data.attainment}%` : "—",
            foot: "requires a target to compute",
            hasBar: dist.data?.attainment != null,
            barPct: dist.data?.attainment ?? 0,
          },
        ]}
      />

      {dist.data && !dist.data.exam && (
        <div className="rounded-card border border-border-default bg-surface p-10 text-center">
          <EmptyState message="No exam with graded marks found for this batch yet." />
        </div>
      )}

      {dist.data?.exam && (
        <>
          <MetricFilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search department, section or class advisor"
            selects={[
              {
                label: "BATCH",
                value: batchId != null ? String(batchId) : "all",
                onChange: (v) => setBatchId(v === "all" ? null : Number(v)),
                options: [{ value: "all", label: "All batches" }, ...(filters.data?.batches.map((b) => ({ value: String(b.id), label: b.label })) ?? [])],
              },
              {
                label: "DEPARTMENT",
                value: dept ?? "all",
                onChange: (v) => setDept(v === "all" ? null : v),
                options: [{ value: "all", label: "All departments" }, ...(dist.data?.departments ?? []).map((d) => ({ value: d.code, label: d.name }))],
              },
              { label: "SECTION", value: section, onChange: setSection, options: [{ value: "all", label: "All sections" }, ...options(register.map((r) => r.section))] },
              { label: "SEMESTER", value: semester, onChange: setSemester, options: [{ value: "all", label: "All semesters" }, ...options(register.map((r) => r.semester ?? "—"))] },
              {
                label: "SORT BY",
                value: sort,
                onChange: setSort,
                options: [
                  { value: "all", label: "Department order" },
                  { value: "high", label: "Highest grade point" },
                  { value: "low", label: "Lowest grade point" },
                ],
              },
            ]}
            bandOptions={BAND_OPTIONS}
            band={band}
            onBand={setBand}
            countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${register.length} classes`}
            onClear={clearFilters}
          />

          <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="mean grade point" />

          <div className="rounded-card border border-border-default bg-surface p-6">
            <h2 className="text-[16px] font-extrabold text-ink">{dist.data.exam.title ?? "Exam"}</h2>
            <p className="mt-1 text-[12.5px] text-subtle">Share of graded attempts in each band</p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {dist.data.distribution.map((b) => (
                <div key={b.grade_label} className="flex flex-col gap-2 rounded-[11px] border border-border-default bg-surface p-4">
                  <div className={`font-mono text-[12px] font-extrabold ${b.is_pass ? "text-primary" : "text-danger-fg"}`}>{b.grade_label}</div>
                  <div className="text-[24px] font-extrabold tracking-[-.02em] text-ink">{b.count.toLocaleString("en-IN")}</div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-tint">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, b.share_percentage)}%` }} />
                  </div>
                  <div className="text-[11px] font-semibold text-subtle">{b.share_percentage}% of attempts</div>
                </div>
              ))}
              {dist.data.distribution.length === 0 && <EmptyState message="No graded attempts found for this exam." />}
            </div>
          </div>

          <DataTable
            title="Section-wise mean grade point"
            columns={columns}
            data={ordered}
            rowKey={(r) => r.class_id}
            loading={dist.isLoading}
            emptyMessage="No class matches these filters."
          />
        </>
      )}
    </div>
  );
}
