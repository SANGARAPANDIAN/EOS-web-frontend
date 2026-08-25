"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddDevelopmentProgramEntryModal } from "@/modules/iqac/components/facultyDevelopment/AddDevelopmentProgramEntryModal";
import { useSttp, useSttpQuality, type DevelopmentProgramRow } from "@/modules/iqac/api/facultyDevelopment";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Attended" },
  { value: "completed", label: "Completed" },
];

export default function SttpPage() {
  const [addingEntry, setAddingEntry] = useState(false);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("all");

  const sttp = useSttp();
  const quality = useSttpQuality();

  const allRows = useMemo(() => sttp.data ?? [], [sttp.data]);

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
      const okQ = !q || `${r.faculty.name} ${r.programme_name} ${r.host_agency ?? ""}`.toLowerCase().includes(q);
      const okD = dept == null || r.faculty.department?.code === dept;
      const okS = status === "all" || r.status === status;
      return okQ && okD && okS;
    });
  }, [allRows, search, dept, status]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "recent") rows.sort((a, b) => (b.attended_on ?? "").localeCompare(a.attended_on ?? ""));
    if (sort === "programme") rows.sort((a, b) => a.programme_name.localeCompare(b.programme_name));
    return rows;
  }, [filtered, sort]);

  const columns = useMemo<DataTableColumn<DevelopmentProgramRow>[]>(
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
      { key: "programme", header: "Programme", width: "1.6fr", sortValue: (r) => r.programme_name, render: (r) => <span className="font-bold text-ink">{r.programme_name}</span> },
      { key: "agency", header: "Agency", sortValue: (r) => r.host_agency ?? "", render: (r) => r.host_agency ?? "—" },
      { key: "duration", header: "Duration", sortValue: (r) => r.duration ?? "", render: (r) => r.duration ?? "—" },
      { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => r.status },
      { key: "attended_on", header: "Attended on", align: "right", sortValue: (r) => r.attended_on ?? "", render: (r) => (r.attended_on ? r.attended_on.slice(0, 10) : "—") },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Faculty Development · STTP" />
      <MetricHeader
        name="STTP"
        blurb="Short Term Training Programme attendance — real faculty_development_programs data."
        addLabel="+ Add faculty entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddDevelopmentProgramEntryModal kind="sttp" onClose={() => setAddingEntry(false)} onCreated={() => sttp.refetch()} />}

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
        searchPlaceholder="Search faculty, programme or agency"
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
              { value: "programme", label: "Programme name" },
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

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="programmes on file" />

      <DataTable
        title="STTP register"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.id}
        loading={sttp.isLoading}
        emptyMessage="No STTP attendance recorded yet."
      />
    </div>
  );
}
