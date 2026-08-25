"use client";

import { useMemo, useState } from "react";
import { DataTable, EmptyState, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "./MetricPageChrome";
import { useAcademicResults, useExamFilters, type SubjectResultRow } from "@/modules/iqac/api/academicQuality";

const BAND_OPTIONS = ["All", "On track", "Below 75%"];

export function ResultsPage() {
  const filters = useExamFilters();

  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [section, setSection] = useState("all");
  const [sort, setSort] = useState("all");
  const [band, setBand] = useState("All");

  const results = useAcademicResults(batchId, section !== "all" ? section : undefined);

  const subjects = useMemo(() => results.data?.subjects ?? [], [results.data]);
  const deptCodeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of results.data?.departments ?? []) map.set(d.id, d.code ?? "");
    return map;
  }, [results.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      const deptCode = s.department_id != null ? deptCodeById.get(s.department_id) : null;
      const okQ = !q || `${s.name} ${s.subject_code}`.toLowerCase().includes(q);
      const okD = dept == null || deptCode === dept;
      const okB = band === "All" || (band === "On track" ? (s.pass_percentage ?? 0) >= 75 : (s.pass_percentage ?? 0) < 75);
      return okQ && okD && okB;
    });
  }, [subjects, search, dept, band, deptCodeById]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "high") rows.sort((a, b) => (b.pass_percentage ?? 0) - (a.pass_percentage ?? 0));
    if (sort === "low") rows.sort((a, b) => (a.pass_percentage ?? 0) - (b.pass_percentage ?? 0));
    return rows;
  }, [filtered, sort]);

  function clearFilters() {
    setSearch("");
    setBatchId(null);
    setDept(null);
    setSection("all");
    setSort("all");
    setBand("All");
  }

  const columns = useMemo<DataTableColumn<SubjectResultRow>[]>(
    () => [
      { key: "code", header: "Code", render: (r) => <span className="font-mono text-[12px] font-bold text-primary">{r.subject_code}</span> },
      { key: "name", header: "Subject", render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "appeared", header: "Appeared", align: "right", render: (r) => r.appeared },
      { key: "passed", header: "Passed", align: "right", render: (r) => r.passed },
      { key: "failed", header: "Failed", align: "right", render: (r) => <span className="text-danger-fg">{r.failed}</span> },
      { key: "pass_pct", header: "Pass %", align: "right", render: (r) => (r.pass_percentage != null ? <span className="font-extrabold text-ink">{r.pass_percentage}%</span> : "—") },
    ],
    [],
  );

  const rollupItems = (results.data?.departments ?? []).map((d) => ({
    code: d.code ?? "—",
    value: d.pass_percentage != null ? `${d.pass_percentage}%` : "—",
    pct: d.pass_percentage,
  }));

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Academic Quality · Results" />
      <MetricHeader name="Results" blurb="University result declaration and subject-wise pass outcome per department, for one real exam." />

      <MetricCards
        cards={[
          { label: "This year", value: results.data?.overall_pass_percentage != null ? `${results.data.overall_pass_percentage}%` : "—", foot: results.data?.exam ? `${results.data.exam.type ?? ""} · ${results.data.exam.academic_year}` : "no exam recorded yet" },
          { label: "Last year", value: "—", foot: "no reliable exam-to-exam pairing across years" },
          { label: "Target", value: results.data?.target != null ? `${results.data.target}%` : "—", foot: "not yet set by IQAC for this AY" },
          {
            label: "Attainment",
            value: results.data?.attainment != null ? `${results.data.attainment}%` : "—",
            foot: "requires a target to compute",
            hasBar: results.data?.attainment != null,
            barPct: results.data?.attainment ?? 0,
          },
        ]}
      />

      {results.data && !results.data.exam && (
        <div className="rounded-card border border-border-default bg-surface p-10 text-center">
          <EmptyState message="No exam with entered marks found for this batch yet." />
        </div>
      )}

      {results.data?.exam && (
        <>
          <MetricFilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search paper name, code or semester"
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
                options: [{ value: "all", label: "All departments" }, ...(results.data.departments ?? []).map((d) => ({ value: d.code ?? "", label: d.code ?? "—" }))],
              },
              {
                label: "SECTION",
                value: section,
                onChange: setSection,
                options: [{ value: "all", label: "All sections" }, ...(results.data.sections ?? []).map((s) => ({ value: s, label: `Section ${s}` }))],
              },
              {
                label: "SORT BY",
                value: sort,
                onChange: setSort,
                options: [
                  { value: "all", label: "Paper order" },
                  { value: "high", label: "Highest pass %" },
                  { value: "low", label: "Lowest pass %" },
                ],
              },
            ]}
            bandOptions={BAND_OPTIONS}
            band={band}
            onBand={setBand}
            countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${subjects.length} papers`}
            onClear={clearFilters}
          />

          <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="pass %, this exam" />

          <div className="rounded-card border border-border-default bg-surface p-0 overflow-hidden">
            <div className="px-5 pb-3.5 pt-5">
              <h2 className="text-[16px] font-extrabold text-ink">Paper-wise outcome</h2>
              <p className="mt-1 text-[12.5px] text-subtle">
                {results.data.exam.type} · {results.data.exam.academic_year} · Semester {results.data.exam.semester}
              </p>
            </div>
            <DataTable columns={columns} data={ordered} rowKey={(r) => r.subject_code} loading={results.isLoading} emptyMessage="No entered marks found for this exam yet." />
          </div>
        </>
      )}
    </div>
  );
}
