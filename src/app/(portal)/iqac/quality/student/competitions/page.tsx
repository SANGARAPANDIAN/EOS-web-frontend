"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddCompetitionEntryModal } from "@/modules/iqac/components/studentDevelopment/AddCompetitionEntryModal";
import { useCompetitions, useCompetitionsQuality, type CompetitionRow } from "@/modules/iqac/api/studentDevelopment";
import { useExamFilters, currentAcademicYearShort } from "@/modules/iqac/api/academicQuality";

export default function CompetitionsPage() {
  const [addingEntry, setAddingEntry] = useState(false);

  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("all");

  const competitions = useCompetitions(batchId);
  const quality = useCompetitionsQuality();
  const filters = useExamFilters();

  const allRows = useMemo(() => competitions.data ?? [], [competitions.data]);

  const levelOptions = useMemo(() => Array.from(new Set(allRows.map((r) => r.level).filter((l): l is string => !!l))).sort(), [allRows]);

  const rollupItems = useMemo(() => {
    const byDept = new Map<string, number>();
    for (const r of allRows) {
      const code = r.student.department?.code;
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
      const okQ = !q || `${r.student.name} ${r.event_name} ${r.category ?? ""}`.toLowerCase().includes(q);
      const okD = dept == null || r.student.department?.code === dept;
      const okL = level === "all" || r.level === level;
      return okQ && okD && okL;
    });
  }, [allRows, search, dept, level]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "recent") rows.sort((a, b) => (b.held_on ?? "").localeCompare(a.held_on ?? ""));
    if (sort === "event") rows.sort((a, b) => a.event_name.localeCompare(b.event_name));
    return rows;
  }, [filtered, sort]);

  const columns = useMemo<DataTableColumn<CompetitionRow>[]>(
    () => [
      {
        key: "student",
        header: "Student",
        width: "1.4fr",
        sortValue: (r) => r.student.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.student.name}</div>
            <div className="text-[12px] text-subtle">{r.student.roll_no}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.student.department?.code ?? "", render: (r) => r.student.department?.code ?? "—" },
      { key: "event", header: "Event", width: "1.4fr", sortValue: (r) => r.event_name, render: (r) => <span className="font-bold text-ink">{r.event_name}</span> },
      { key: "category", header: "Category", sortValue: (r) => r.category ?? "", render: (r) => r.category ?? "—" },
      { key: "level", header: "Level", sortValue: (r) => r.level ?? "", render: (r) => r.level ?? "—" },
      { key: "held_on", header: "Held on", align: "right", sortValue: (r) => r.held_on ?? "", render: (r) => (r.held_on ? r.held_on.slice(0, 10) : "—") },
      { key: "result", header: "Result", align: "right", sortValue: (r) => r.result ?? "", render: (r) => r.result ?? "—" },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Student Development · Competitions" />
      <MetricHeader
        name="Competitions"
        blurb="Non-sports competitions students represented the college in — real student_competitions data."
        addLabel="+ Add student entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddCompetitionEntryModal onClose={() => setAddingEntry(false)} onCreated={() => competitions.refetch()} />}

      <MetricCards
        cards={[
          { label: "This year", value: quality.data?.this_year ?? "—", foot: "institution level, all departments" },
          { label: "Last year", value: quality.data?.last_year ?? "—", foot: `AY ${currentAcademicYearShort()} prior term` },
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
        searchPlaceholder="Search student, event or category"
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
            options: [{ value: "all", label: "All departments" }, ...rollupItems.map((d) => ({ value: d.code, label: d.code }))],
          },
          {
            label: "LEVEL",
            value: level,
            onChange: setLevel,
            options: [{ value: "all", label: "All levels" }, ...levelOptions.map((l) => ({ value: l, label: l }))],
          },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Default order" },
              { value: "recent", label: "Most recent" },
              { value: "event", label: "Event name" },
            ],
          },
        ]}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${allRows.length} entries`}
        onClear={() => {
          setSearch("");
          setBatchId(null);
          setDept(null);
          setLevel("all");
          setSort("all");
        }}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="entries on file" />

      <DataTable
        title="Competitions register"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.id}
        loading={competitions.isLoading}
        emptyMessage="No competition entries recorded yet."
      />
    </div>
  );
}
