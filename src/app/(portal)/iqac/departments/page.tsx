"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { PageCrumbs, StatTile, FilterSelect, FilterBarFooter } from "@/modules/iqac/components/PageControls";
import { useDepartmentsList, useNaacReadiness, type DepartmentRow } from "@/modules/iqac/api/departments";
import { exportToPdf } from "@/lib/utils/pdf-export";

const EMPTY_FILTERS = { q: "", dept: "", accreditation: "" };

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function IqacDepartmentsPage() {
  const router = useRouter();
  const list = useDepartmentsList();
  const naacReadiness = useNaacReadiness();
  const allRows = useMemo(() => list.data ?? [], [list.data]);
  const naacByDept = useMemo(() => new Map((naacReadiness.data?.by_department ?? []).map((d) => [d.department_id, d.mean_readiness])), [naacReadiness.data]);

  const [f, setF] = useState(EMPTY_FILTERS);

  function update<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return allRows.filter((r) => {
      const okQ = !q || `${r.name} ${r.code} ${r.hod?.name ?? ""} ${r.accreditation_status ?? ""}`.toLowerCase().includes(q);
      const okD = !f.dept || r.code === f.dept;
      const okA = !f.accreditation || r.accreditation_status === f.accreditation;
      return okQ && okD && okA;
    });
  }, [allRows, f]);

  const totalStudents = rows.reduce((sum, r) => sum + r.students_count, 0);
  const totalFaculty = rows.reduce((sum, r) => sum + r.faculty_count, 0);
  const needsAttention = rows.filter((r) => r.hod == null || (r.attendance_percentage != null && r.attendance_percentage < 75)).length;

  const accreditationOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.accreditation_status).filter((v): v is string => !!v))),
    [allRows],
  );

  function handleExportCsv() {
    const header = ["Dept", "Department", "Head of Department", "Students", "Faculty", "Ratio", "Attendance", "Placement", "Accreditation"];
    const body = rows.map((r) => [
      r.code,
      r.name,
      r.hod?.name ?? "Not assigned",
      String(r.students_count),
      String(r.faculty_count),
      r.faculty_count > 0 ? `${Math.round(r.students_count / r.faculty_count)}:1` : "—",
      r.attendance_percentage != null ? `${r.attendance_percentage}%` : "—",
      r.placement_percentage != null ? `${r.placement_percentage}%` : "—",
      r.accreditation_status ?? "—",
    ]);
    downloadCsv("departments.csv", [header, ...body]);
  }

  function handleExportPdf() {
    void exportToPdf({
      title: "Departments & HoDs",
      subtitle: "Every real department on file",
      filename: "departments.pdf",
      sections: [
        {
          type: "table",
          columns: [
            { header: "Dept", key: "code" },
            { header: "Department", key: "name" },
            { header: "Head of Department", key: "hod" },
            { header: "Students", key: "students" },
            { header: "Faculty", key: "faculty" },
            { header: "Ratio", key: "ratio" },
            { header: "Attendance", key: "attendance" },
            { header: "Placement", key: "placement" },
            { header: "Accreditation", key: "accreditation" },
          ],
          rows: rows.map((r) => ({
            code: r.code,
            name: r.name,
            hod: r.hod?.name ?? "Not assigned",
            students: r.students_count,
            faculty: r.faculty_count,
            ratio: r.faculty_count > 0 ? `${Math.round(r.students_count / r.faculty_count)}:1` : "—",
            attendance: r.attendance_percentage != null ? `${r.attendance_percentage}%` : "—",
            placement: r.placement_percentage != null ? `${r.placement_percentage}%` : "—",
            accreditation: r.accreditation_status ?? "—",
          })),
        },
      ],
    });
  }

  const columns = useMemo<DataTableColumn<DepartmentRow>[]>(
    () => [
      { key: "code", header: "Dept", width: "0.7fr", sortValue: (r) => r.code, render: (r) => r.code },
      { key: "name", header: "Department", width: "1.6fr", sortValue: (r) => r.name, render: (r) => r.name },
      { key: "hod", header: "Head of Department", sortValue: (r) => r.hod?.name ?? "", render: (r) => r.hod?.name ?? "Not assigned" },
      { key: "students", header: "Students", align: "right", sortValue: (r) => r.students_count, render: (r) => r.students_count },
      { key: "faculty", header: "Faculty", align: "right", sortValue: (r) => r.faculty_count, render: (r) => r.faculty_count },
      {
        key: "ratio",
        header: "Ratio",
        align: "right",
        sortValue: (r) => (r.faculty_count > 0 ? r.students_count / r.faculty_count : -1),
        render: (r) => (r.faculty_count > 0 ? `${Math.round(r.students_count / r.faculty_count)}:1` : "—"),
      },
      {
        key: "attendance",
        header: "Attendance",
        align: "right",
        sortValue: (r) => r.attendance_percentage ?? -1,
        render: (r) => (r.attendance_percentage != null ? `${r.attendance_percentage}%` : "—"),
      },
      {
        key: "placement",
        header: "Placement",
        align: "right",
        sortValue: (r) => r.placement_percentage ?? -1,
        render: (r) => (r.placement_percentage != null ? `${r.placement_percentage}%` : "—"),
      },
      {
        key: "naac",
        header: "NAAC readiness",
        align: "right",
        sortValue: (r) => naacByDept.get(r.id) ?? -1,
        render: (r) => (naacByDept.has(r.id) ? `${naacByDept.get(r.id)}%` : "—"),
      },
      { key: "accreditation", header: "Accreditation", sortValue: (r) => r.accreditation_status ?? "", render: (r) => r.accreditation_status ?? "Not set" },
    ],
    [naacByDept],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <PageCrumbs items={["IQAC", "Departments"]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Departments &amp; HoDs</h1>
          <p className="mt-1 text-[13.5px] text-muted">Every real department on file — NAAC readiness is IQAC's own self-reported checklist progress, not a certified NAAC score.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Students" value={totalStudents} sub="across all departments" />
        <StatTile label="Teaching faculty" value={totalFaculty} sub="across all departments" />
        <StatTile
          label="NAAC readiness"
          value={naacReadiness.data?.institution_mean_readiness != null ? `${naacReadiness.data.institution_mean_readiness}%` : "—"}
          sub={naacReadiness.data ? `${naacReadiness.data.item_count} checklist items` : "self-reported by IQAC"}
        />
        <StatTile label="Needs attention" value={needsAttention} sub="no HoD, or attendance below 75%" />
      </div>

      <div className="rounded-card border border-border-default bg-surface p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Search</div>
            <input
              value={f.q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search department, head of department or accreditation status"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <FilterSelect
            label="Department"
            value={f.dept}
            onChange={(v) => update("dept", v)}
            options={[{ value: "", label: "All departments" }, ...allRows.map((d) => ({ value: d.code, label: d.code }))]}
          />
          <FilterSelect
            label="Accreditation"
            value={f.accreditation}
            onChange={(v) => update("accreditation", v)}
            options={[{ value: "", label: "Any status" }, ...accreditationOptions.map((a) => ({ value: a, label: a }))]}
          />
        </div>

        <FilterBarFooter rangeStart={rows.length > 0 ? 1 : 0} rangeEnd={rows.length} total={allRows.length} onClear={() => setF(EMPTY_FILTERS)} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        loading={list.isLoading}
        emptyMessage="No departments match these filters."
        onRowClick={(r) => router.push(`/iqac/departments/${r.id}`)}
      />
    </div>
  );
}
