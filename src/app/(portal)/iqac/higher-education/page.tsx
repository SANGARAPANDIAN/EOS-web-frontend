"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { PageCrumbs, StatTile, FilterSelect, FilterBarFooter } from "@/modules/iqac/components/PageControls";
import {
  useHigherEducationFilters,
  useHigherEducationList,
  type HigherEducationRow,
  type HigherEducationAdmissionStatus,
} from "@/modules/iqac/api/higherEducation";

const ADMISSION_STATUS_LABEL: Record<HigherEducationAdmissionStatus, string> = {
  interested: "Interested",
  applied: "Applied",
  admitted: "Admitted",
  enrolled: "Enrolled",
};

const EMPTY_FILTERS = {
  q: "",
  departmentId: "",
  batchId: "",
  year: "",
  section: "",
  university: "",
  programme: "",
  admissionStatus: "",
};

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

export default function IqacHigherEducationPage() {
  const [f, setF] = useState(EMPTY_FILTERS);

  const filters = useHigherEducationFilters();
  const list = useHigherEducationList({
    q: f.q.trim() || undefined,
    department_id: f.departmentId ? Number(f.departmentId) : undefined,
    batch_id: f.batchId ? Number(f.batchId) : undefined,
  });

  const allRows = useMemo(() => list.data?.records ?? [], [list.data]);

  const universityOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.university).filter((v): v is string => !!v))).sort(),
    [allRows],
  );
  const programmeOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.programme).filter(Boolean))).sort(),
    [allRows],
  );
  const sectionOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.section).filter((v): v is string => !!v))).sort(),
    [allRows],
  );

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (f.year && String(r.year ?? "") !== f.year) return false;
      if (f.section && r.section !== f.section) return false;
      if (f.university && r.university !== f.university) return false;
      if (f.programme && r.programme !== f.programme) return false;
      if (f.admissionStatus && r.admission_status !== f.admissionStatus) return false;
      return true;
    });
  }, [allRows, f.year, f.section, f.university, f.programme, f.admissionStatus]);

  const distinctDepartments = new Set(rows.map((r) => r.department?.id).filter((v): v is number => v != null)).size;
  const joinedCount = rows.filter((r) => r.admission_status === "enrolled").length;
  const finalYearCount = rows.filter((r) => r.year === 4).length;

  function update<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  const columns = useMemo<DataTableColumn<HigherEducationRow>[]>(
    () => [
      {
        key: "student",
        header: "Student",
        width: "1.5fr",
        sortValue: (r) => r.student.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.student.name}</div>
            <div className="text-[12px] text-subtle">{r.student.roll_no ?? r.student.register_no ?? "—"}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.department?.code ?? "", render: (r) => r.department?.code ?? "—" },
      { key: "batch", header: "Batch", sortValue: (r) => r.batch?.name ?? "", render: (r) => r.batch?.name ?? "—" },
      {
        key: "year_sec",
        header: "Year / Sec",
        sortValue: (r) => r.year ?? 0,
        render: (r) => [r.year ? `Year ${r.year}` : null, r.section].filter(Boolean).join(" · ") || "—",
      },
      { key: "programme", header: "Programme", sortValue: (r) => r.programme, render: (r) => r.programme },
      { key: "university", header: "University", sortValue: (r) => r.university ?? "", render: (r) => r.university ?? "—" },
      { key: "country", header: "Country", sortValue: (r) => r.country, render: (r) => `${r.country}${r.is_abroad ? " (overseas)" : ""}` },
      {
        key: "scholarship",
        header: "Scholarship",
        sortValue: (r) => (r.is_scholarship == null ? -1 : r.is_scholarship ? 1 : 0),
        render: (r) => (r.is_scholarship == null ? "Not tracked" : r.is_scholarship ? r.scholarship_name ?? "Yes" : "No"),
      },
      {
        key: "status",
        header: "Admission status",
        sortValue: (r) => r.admission_status ?? "",
        render: (r) => (r.admission_status ? ADMISSION_STATUS_LABEL[r.admission_status] : "Not tracked"),
      },
    ],
    [],
  );

  function handleExportCsv() {
    const header = ["Student", "Roll no", "Dept", "Batch", "Year", "Section", "Programme", "University", "Country", "Scholarship", "Admission status"];
    const body = rows.map((r) => [
      r.student.name,
      r.student.roll_no ?? r.student.register_no ?? "—",
      r.department?.code ?? "—",
      r.batch?.name ?? "—",
      r.year != null ? String(r.year) : "—",
      r.section ?? "—",
      r.programme,
      r.university ?? "—",
      `${r.country}${r.is_abroad ? " (overseas)" : ""}`,
      r.is_scholarship == null ? "Not tracked" : r.is_scholarship ? r.scholarship_name ?? "Yes" : "No",
      r.admission_status ? ADMISSION_STATUS_LABEL[r.admission_status] : "Not tracked",
    ]);
    downloadCsv("higher-education.csv", [header, ...body]);
  }

  function handleExportPdf() {
    try {
      window.print();
    } catch {
      // print unavailable in this environment — no-op, matching the reference design's own try/catch.
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <PageCrumbs items={["IQAC", "Higher Education"]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Higher education</h1>
          <p className="mt-1 text-[13.5px] text-muted">Students pursuing higher studies after graduation.</p>
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
        <StatTile label="Student" value={rows.length} sub="in this view" />
        <StatTile label="Department" value={distinctDepartments} sub="departments represented" />
        <StatTile label="Joined" value={joinedCount} sub="admission status: enrolled" />
        <StatTile label="Final year" value={finalYearCount} sub="year 4 students" />
      </div>

      <div className="rounded-card border border-border-default bg-surface p-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Search</div>
            <input
              value={f.q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search student name, roll number, programme or university"
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
          <FilterSelect
            label="Batch"
            value={f.batchId}
            onChange={(v) => update("batchId", v)}
            options={[{ value: "", label: "All batches" }, ...(filters.data?.batches.map((b) => ({ value: String(b.id), label: b.name })) ?? [])]}
          />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4">
          <FilterSelect
            label="Section"
            value={f.section}
            onChange={(v) => update("section", v)}
            options={[{ value: "", label: "All sections" }, ...sectionOptions.map((s) => ({ value: s, label: `Section ${s}` }))]}
          />
          <FilterSelect
            label="University"
            value={f.university}
            onChange={(v) => update("university", v)}
            options={[{ value: "", label: "All universities" }, ...universityOptions.map((u) => ({ value: u, label: u }))]}
          />
          <FilterSelect
            label="Programme"
            value={f.programme}
            onChange={(v) => update("programme", v)}
            options={[{ value: "", label: "All programmes" }, ...programmeOptions.map((p) => ({ value: p, label: p }))]}
          />
          <FilterSelect
            label="Admission status"
            value={f.admissionStatus}
            onChange={(v) => update("admissionStatus", v)}
            options={[
              { value: "", label: "Any status" },
              { value: "interested", label: "Interested" },
              { value: "applied", label: "Applied" },
              { value: "admitted", label: "Admitted" },
              { value: "enrolled", label: "Enrolled" },
            ]}
          />
        </div>

        <FilterBarFooter rangeStart={rows.length > 0 ? 1 : 0} rangeEnd={rows.length} total={allRows.length} onClear={() => setF(EMPTY_FILTERS)} clickable={false} />
      </div>

      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} loading={list.isLoading} emptyMessage="No higher-education records found." hoverableRows />
    </div>
  );
}
