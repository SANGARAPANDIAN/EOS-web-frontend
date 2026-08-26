"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MonthlyBars } from "@/modules/iqac/components/PageControls";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar, AddClassRowForm } from "./MetricPageChrome";
import { useAcademicAttendance, type AttendanceRegisterRow } from "@/modules/iqac/api/academicQuality";

const BAND_OPTIONS = ["All", "On track", "Below 75%"];

export function AttendancePage() {
  const attendance = useAcademicAttendance();
  const [addingClass, setAddingClass] = useState(false);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [section, setSection] = useState("all");
  const [semester, setSemester] = useState("all");
  const [batch, setBatch] = useState("all");
  const [sort, setSort] = useState("all");
  const [band, setBand] = useState("All");

  const register = useMemo(() => attendance.data?.register ?? [], [attendance.data]);

  const options = (values: (string | number)[]) =>
    Array.from(new Set(values)).map((v) => ({ value: String(v), label: String(v) }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return register.filter((r) => {
      const okQ = !q || `${r.department_code} ${r.section} ${r.class_advisor ?? ""}`.toLowerCase().includes(q);
      const okD = dept == null || r.department_code === dept;
      const okS = section === "all" || r.section === section;
      const okSem = semester === "all" || String(r.semester) === semester;
      const okBt = batch === "all" || r.batch_label === batch;
      const okB = band === "All" || (band === "On track" ? (r.this_year ?? 0) >= 75 : (r.this_year ?? 0) < 75);
      return okQ && okD && okS && okSem && okBt && okB;
    });
  }, [register, search, dept, section, semester, batch, band]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "high") rows.sort((a, b) => (b.this_year ?? 0) - (a.this_year ?? 0));
    if (sort === "low") rows.sort((a, b) => (a.this_year ?? 0) - (b.this_year ?? 0));
    return rows;
  }, [filtered, sort]);

  function clearFilters() {
    setSearch("");
    setDept(null);
    setSection("all");
    setSemester("all");
    setBatch("all");
    setSort("all");
    setBand("All");
  }

  const columns = useMemo<DataTableColumn<AttendanceRegisterRow>[]>(
    () => [
      { key: "dept", header: "Dept", render: (r) => <span className="font-bold text-ink">{r.department_code}</span> },
      { key: "section", header: "Sec", render: (r) => r.section },
      { key: "batch", header: "Batch", render: (r) => <span className="font-mono text-[12px] text-subtle">{r.batch_label}</span> },
      { key: "sem", header: "Sem", render: (r) => r.semester ?? "—" },
      { key: "advisor", header: "Class advisor", render: (r) => r.class_advisor ?? "Not assigned" },
      { key: "this_year", header: "This year", align: "right", render: (r) => (r.this_year != null ? `${r.this_year}%` : "—") },
      { key: "last_year", header: "Last year", align: "right", render: (r) => (r.last_year != null ? `${r.last_year}%` : "—") },
      { key: "target", header: "Target", align: "right", render: (r) => (r.target != null ? `${r.target}%` : "—") },
      { key: "attainment", header: "Attainment", align: "right", render: (r) => (r.attainment != null ? `${r.attainment}%` : "—") },
    ],
    [],
  );

  const rollupItems = (attendance.data?.departments ?? [])
    .filter((d) => d.students_count > 0)
    .map((d) => ({ code: d.code, value: d.attendance_percentage != null ? `${d.attendance_percentage}%` : "—", pct: d.attendance_percentage }));

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Academic Quality · Attendance" />
      <MetricHeader
        name="Attendance"
        blurb="Mean class attendance, current term, against the 75% institutional condonation floor."
        addLabel="+ Add class row"
        onAdd={() => setAddingClass(true)}
      />

      {addingClass && (
        <AddClassRowForm crumb="Academic Quality · Attendance" onClose={() => setAddingClass(false)} onCreated={() => attendance.refetch()} />
      )}

      <MetricCards
        cards={[
          { label: "This year", value: attendance.data?.this_year != null ? `${attendance.data.this_year}%` : "—", foot: "current term, all departments" },
          { label: "Last year", value: attendance.data?.last_year != null ? `${attendance.data.last_year}%` : "—", foot: "same term, previous year" },
          { label: "Target", value: attendance.data?.target != null ? `${attendance.data.target}%` : "—", foot: "not yet set by IQAC for this AY" },
          {
            label: "Attainment",
            value: attendance.data?.attainment != null ? `${attendance.data.attainment}%` : "—",
            foot: "requires a target to compute",
            hasBar: attendance.data?.attainment != null,
            barPct: attendance.data?.attainment ?? 0,
          },
        ]}
      />

      <MetricFilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search department, section or class advisor"
        selects={[
          { label: "BATCH", value: batch, onChange: setBatch, options: [{ value: "all", label: "All batches" }, ...options(register.map((r) => r.batch_label))] },
          {
            label: "DEPARTMENT",
            value: dept ?? "all",
            onChange: (v) => setDept(v === "all" ? null : v),
            options: [{ value: "all", label: "All departments" }, ...(attendance.data?.departments ?? []).map((d) => ({ value: d.code, label: d.name }))],
          },
          { label: "SECTION", value: section, onChange: setSection, options: [{ value: "all", label: "All sections" }, ...options(register.map((r) => r.section))] },
          { label: "SEMESTER", value: semester, onChange: setSemester, options: [{ value: "all", label: "All semesters" }, ...options(register.map((r) => r.semester ?? "—"))] },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Department order" },
              { value: "high", label: "Highest attendance" },
              { value: "low", label: "Lowest attendance" },
            ],
          },
        ]}
        bandOptions={BAND_OPTIONS}
        band={band}
        onBand={setBand}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${register.length} classes`}
        onClear={clearFilters}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} />

      <div className="rounded-card border border-border-default bg-surface p-6">
        <h2 className="text-[16px] font-extrabold text-ink">Monthly movement</h2>
        <p className="mt-1 text-[12.5px] text-subtle">Institution mean per month, current term</p>
        <div className="mt-5">
          {(attendance.data?.trend.length ?? 0) > 0 ? (
            <MonthlyBars data={(attendance.data?.trend ?? []).map((t) => ({ month: t.month, value: t.percentage }))} formatValue={(v) => `${v}%`} />
          ) : (
            <p className="text-[13px] text-subtle">No attendance has been marked yet this term.</p>
          )}
        </div>
      </div>

      <DataTable
        title="Section-wise register"
        titleNote={
          <button type="button" onClick={() => setAddingClass(true)} className="text-[12.5px] font-bold text-primary hover:underline">
            + Add row
          </button>
        }
        columns={columns}
        data={ordered}
        rowKey={(r) => r.class_id}
        loading={attendance.isLoading}
        emptyMessage="No class matches these filters."
      />
    </div>
  );
}
