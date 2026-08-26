"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { PageCrumbs, StatTile, FilterSelect, FilterBarFooter, Pager } from "@/modules/iqac/components/PageControls";
import { useFacultyFilters, useFacultyList, type FacultyRow } from "@/modules/iqac/api/faculty";

const PAGE_SIZE = 10;

const STATUS_TONE: Record<FacultyRow["status"], BadgeTone> = { active: "accent", inactive: "neutral" };

type ExperienceBand = "" | "20plus" | "10_19" | "below_10";
const EXPERIENCE_BANDS: { value: ExperienceBand; label: string }[] = [
  { value: "", label: "Any experience" },
  { value: "20plus", label: "20 yr+" },
  { value: "10_19", label: "10–19 yr" },
  { value: "below_10", label: "Below 10 yr" },
];

const EMPTY_FILTERS = { q: "", departmentId: "", status: "", doctorate: "", designation: "", qualification: "", experience: "" as ExperienceBand };

export default function IqacFacultyPage() {
  const router = useRouter();
  const [f, setF] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);

  const filters = useFacultyFilters();
  const list = useFacultyList({
    q: f.q.trim() || undefined,
    department_id: f.departmentId ? Number(f.departmentId) : undefined,
    status: "all",
  });

  const allRows = useMemo(() => list.data?.faculty ?? [], [list.data]);

  const designationOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.designation).filter(Boolean))).sort(),
    [allRows],
  );
  const qualificationOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.qualification).filter((v): v is string => !!v))).sort(),
    [allRows],
  );

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (f.status && r.status !== f.status) return false;
      if (f.doctorate === "yes" && !r.has_doctorate) return false;
      if (f.doctorate === "no" && r.has_doctorate) return false;
      if (f.designation && r.designation !== f.designation) return false;
      if (f.qualification && r.qualification !== f.qualification) return false;
      if (f.experience) {
        const exp = r.experience_years;
        if (exp == null) return false;
        if (f.experience === "20plus" && !(exp >= 20)) return false;
        if (f.experience === "10_19" && !(exp >= 10 && exp < 20)) return false;
        if (f.experience === "below_10" && !(exp < 10)) return false;
      }
      return true;
    });
  }, [allRows, f.status, f.doctorate, f.designation, f.qualification, f.experience]);

  const doctorateCount = rows.filter((r) => r.has_doctorate).length;
  const totalPublications = rows.reduce((sum, r) => sum + r.publications_count, 0);
  const experienceYears = rows.map((r) => r.experience_years).filter((v): v is number => v != null);
  const meanExperience = experienceYears.length > 0 ? Math.round((experienceYears.reduce((a, b) => a + b, 0) / experienceYears.length) * 10) / 10 : null;

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(rows.length, page * PAGE_SIZE + PAGE_SIZE);

  function update<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  const columns = useMemo<DataTableColumn<FacultyRow>[]>(
    () => [
      { key: "staff_code", header: "Staff ID", sortValue: (r) => r.staff_code ?? "", render: (r) => <span className="font-mono text-[12px] text-subtle">{r.staff_code ?? "—"}</span> },
      {
        key: "faculty",
        header: "Faculty",
        width: "1.6fr",
        sortValue: (r) => r.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.name}</div>
            <div className="text-[12px] text-subtle">{r.designation}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.department?.code ?? "", render: (r) => r.department?.code ?? "—" },
      { key: "qualification", header: "Qualification", sortValue: (r) => r.qualification ?? "", render: (r) => r.qualification ?? "—" },
      { key: "experience", header: "Experience", align: "right", sortValue: (r) => r.experience_years ?? -1, render: (r) => (r.experience_years != null ? `${r.experience_years} yr` : "—") },
      { key: "classes", header: "Classes", align: "right", sortValue: (r) => r.classes_count, render: (r) => r.classes_count },
      { key: "publications", header: "Publications", align: "right", sortValue: (r) => r.publications_count, render: (r) => r.publications_count },
      { key: "doctorate", header: "Doctorate", sortValue: (r) => (r.has_doctorate ? 1 : 0), render: (r) => (r.has_doctorate ? "Yes" : "No") },
      {
        key: "attendance",
        header: "Attendance",
        align: "right",
        sortValue: (r) => r.attendance_percentage ?? -1,
        render: (r) => (r.attendance_percentage != null ? `${r.attendance_percentage}%` : "—"),
      },
      { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status === "active" ? "Active" : "Inactive"}</Badge> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <PageCrumbs items={["IQAC", "Records", "Faculty"]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Faculty &amp; staff</h1>
          <p className="mt-1 text-[13.5px] text-muted">Institution-wide teaching faculty register.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Faculty records" value={rows.length} sub="faculty in this view" />
        <StatTile label="Doctorate" value={doctorateCount} sub={rows.length > 0 ? `${Math.round((doctorateCount / rows.length) * 100)}% of view` : undefined} />
        <StatTile label="Mean experience" value={meanExperience != null ? `${meanExperience} yr` : "—"} sub="across this view" />
        <StatTile label="Publications" value={totalPublications} sub="all time, on file" />
      </div>

      <div className="rounded-card border border-border-default bg-surface p-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Search</div>
            <input
              value={f.q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search name, designation or email"
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
            label="Designation"
            value={f.designation}
            onChange={(v) => update("designation", v)}
            options={[{ value: "", label: "All designations" }, ...designationOptions.map((d) => ({ value: d, label: d }))]}
          />
          <FilterSelect
            label="Qualification"
            value={f.qualification}
            onChange={(v) => update("qualification", v)}
            options={[{ value: "", label: "All qualifications" }, ...qualificationOptions.map((q) => ({ value: q, label: q }))]}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <FilterSelect label="Experience" value={f.experience} onChange={(v) => update("experience", v as ExperienceBand)} options={EXPERIENCE_BANDS} />
          <FilterSelect
            label="Doctorate"
            value={f.doctorate}
            onChange={(v) => update("doctorate", v)}
            options={[
              { value: "", label: "Any qualification" },
              { value: "yes", label: "Doctorate holders" },
              { value: "no", label: "Non-doctorate" },
            ]}
          />
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
        emptyMessage="No faculty match these filters."
        onRowClick={(r) => router.push(`/iqac/faculty/${r.id}`)}
      />

      {rows.length > PAGE_SIZE && <Pager page={page} pageCount={pageCount} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />}
    </div>
  );
}
