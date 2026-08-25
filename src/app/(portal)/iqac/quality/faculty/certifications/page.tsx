"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddFacultyCertificationEntryModal } from "@/modules/iqac/components/facultyDevelopment/AddFacultyCertificationEntryModal";
import { useFacultyCertifications, useFacultyCertificationsQuality, type FacultyCertificationRow } from "@/modules/iqac/api/facultyDevelopment";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "enrolled", label: "Enrolled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export default function FacultyCertificationsPage() {
  const [addingEntry, setAddingEntry] = useState(false);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("all");

  const certifications = useFacultyCertifications();
  const quality = useFacultyCertificationsQuality();

  const allRows = useMemo(() => certifications.data ?? [], [certifications.data]);

  const rollupItems = useMemo(() => {
    const byDept = new Map<string, number>();
    for (const r of allRows) {
      const code = r.faculty.department?.code;
      if (!code) continue;
      byDept.set(code, (byDept.get(code) ?? 0) + 1);
    }
    const max = Math.max(1, ...byDept.values());
    return [...byDept.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, count]) => ({ code, value: String(count), pct: Math.round((count / max) * 100) }));
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const okQ = !q || `${r.faculty.name} ${r.platform} ${r.track}`.toLowerCase().includes(q);
      const okD = dept == null || r.faculty.department?.code === dept;
      const okS = status === "all" || r.status === status;
      return okQ && okD && okS;
    });
  }, [allRows, search, dept, status]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "recent") rows.sort((a, b) => (b.completed_on ?? "").localeCompare(a.completed_on ?? ""));
    if (sort === "platform") rows.sort((a, b) => a.platform.localeCompare(b.platform));
    return rows;
  }, [filtered, sort]);

  const columns = useMemo<DataTableColumn<FacultyCertificationRow>[]>(
    () => [
      {
        key: "faculty",
        header: "Faculty",
        width: "1.4fr",
        sortValue: (r) => r.faculty.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.faculty.name}</div>
            <div className="text-[12px] text-subtle">{r.faculty.designation}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.faculty.department?.code ?? "", render: (r) => r.faculty.department?.code ?? "—" },
      { key: "platform", header: "Platform", sortValue: (r) => r.platform, render: (r) => <span className="font-bold text-ink">{r.platform}</span> },
      { key: "track", header: "Track", width: "1.4fr", sortValue: (r) => r.track, render: (r) => r.track },
      { key: "score", header: "Score", sortValue: (r) => r.score ?? "", render: (r) => r.score ?? "—" },
      { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => r.status },
      { key: "completed_on", header: "Completed on", align: "right", sortValue: (r) => r.completed_on ?? "", render: (r) => (r.completed_on ? r.completed_on.slice(0, 10) : "—") },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Faculty Development · Certifications" />
      <MetricHeader
        name="Certifications"
        blurb="Skill/course certifications completed by faculty — real faculty_certifications data."
        addLabel="+ Add faculty entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddFacultyCertificationEntryModal onClose={() => setAddingEntry(false)} onCreated={() => certifications.refetch()} />}

      <MetricCards
        cards={[
          { label: "This year", value: quality.data?.this_year ?? "—", foot: "institution level, all departments" },
          { label: "Last year", value: quality.data?.last_year ?? "—", foot: "prior term" },
          { label: "Target", value: quality.data?.target ?? "—", foot: quality.data?.target != null ? "approved by the IQAC for this AY" : "not yet set by IQAC for this AY" },
          {
            label: "Attainment",
            value: quality.data?.attainment != null ? `${quality.data.attainment}%` : "—",
            foot: "requires a target to compute",
            hasBar: quality.data?.attainment != null,
            barPct: quality.data?.attainment ?? 0,
          },
        ]}
      />

      <MetricFilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search faculty, platform or track"
        selects={[
          {
            label: "DEPARTMENT",
            value: dept ?? "all",
            onChange: (v) => setDept(v === "all" ? null : v),
            options: [{ value: "all", label: "All departments" }, ...rollupItems.map((d) => ({ value: d.code, label: d.code }))],
          },
          { label: "STATUS", value: status, onChange: setStatus, options: STATUS_OPTIONS },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Default order" },
              { value: "recent", label: "Most recent" },
              { value: "platform", label: "Platform" },
            ],
          },
        ]}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${allRows.length} entries`}
        onClear={() => {
          setSearch("");
          setDept(null);
          setStatus("all");
          setSort("all");
        }}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="certifications on file" />

      <DataTable
        title="Certifications register"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.id}
        loading={certifications.isLoading}
        emptyMessage="No faculty certifications recorded yet."
      />
    </div>
  );
}
