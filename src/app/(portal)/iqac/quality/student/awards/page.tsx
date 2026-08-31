"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddAwardEntryModal } from "@/modules/iqac/components/studentDevelopment/AddAwardEntryModal";
import { useLeadingAwardEvents, useAwardDepartments, useAwardsQuality, type AwardEventRow } from "@/modules/iqac/api/studentDevelopment";
import { useExamFilters, currentAcademicYearShort } from "@/modules/iqac/api/academicQuality";

export default function AwardsPage() {
  const router = useRouter();
  const departments = useAwardDepartments();
  const quality = useAwardsQuality();
  const filters = useExamFilters();
  const [addingEntry, setAddingEntry] = useState(false);

  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [event, setEvent] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("all");

  const events = useLeadingAwardEvents(batchId);
  const allEvents = useMemo(() => events.data ?? [], [events.data]);

  const eventOptions = useMemo(() => Array.from(new Set(allEvents.map((e) => e.event_name))).sort(), [allEvents]);
  const levelOptions = useMemo(() => {
    const levels = new Set<string>();
    for (const e of allEvents) for (const l of e.levels) levels.add(l);
    return Array.from(levels).sort();
  }, [allEvents]);

  const maxByDept = useMemo(() => Math.max(1, ...(departments.data ?? []).map((d) => d.achievements)), [departments.data]);
  const rollupItems = (departments.data ?? []).map((d) => ({
    code: d.department.code,
    value: String(d.achievements),
    pct: Math.round((d.achievements / maxByDept) * 100),
  }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEvents.filter((e) => {
      const okQ = !q || `${e.event_name} ${e.levels.join(" ")}`.toLowerCase().includes(q);
      // Team-based achievements have no department_codes at all — a dept filter
      // honestly excludes them rather than guessing which department they belong to.
      const okD = dept == null || e.department_codes.includes(dept);
      const okE = event === "all" || e.event_name === event;
      const okL = level === "all" || e.levels.includes(level);
      return okQ && okD && okE && okL;
    });
  }, [allEvents, search, dept, event, level]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "high") rows.sort((a, b) => b.participants - a.participants);
    if (sort === "recent") rows.sort((a, b) => b.latest_date.localeCompare(a.latest_date));
    return rows;
  }, [filtered, sort]);

  const columns = useMemo<DataTableColumn<AwardEventRow>[]>(
    () => [
      { key: "event", header: "Event", width: "1.6fr", sortValue: (r) => r.event_name, render: (r) => <span className="font-bold text-ink">{r.event_name}</span> },
      { key: "levels", header: "Level", sortValue: (r) => r.levels.join(", "), render: (r) => r.levels.join(", ") || "—" },
      { key: "participants", header: "Participants", align: "right", sortValue: (r) => r.participants, render: (r) => r.participants },
      { key: "latest", header: "Most recent", align: "right", sortValue: (r) => r.latest_date, render: (r) => r.latest_date },
      {
        key: "view",
        header: "",
        width: "0.7fr",
        render: (r) => (
          <button
            type="button"
            onClick={() => router.push(`/iqac/quality/student/awards/${encodeURIComponent(r.event_name)}`)}
            className="text-[12.5px] font-bold text-primary hover:underline"
          >
            View entries →
          </button>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Student Development · Awards" />
      <MetricHeader
        name="Awards"
        blurb="State, national and international sports awards won by students — real sports_achievements data."
        addLabel="+ Add student entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddAwardEntryModal onClose={() => setAddingEntry(false)} onCreated={() => events.refetch()} />}

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
        searchPlaceholder="Search event or level"
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
            label: "EVENT",
            value: event,
            onChange: setEvent,
            options: [{ value: "all", label: "All event" }, ...eventOptions.map((e) => ({ value: e, label: e }))],
          },
          {
            label: "LEVEL",
            value: level,
            onChange: setLevel,
            options: [{ value: "all", label: "All level" }, ...levelOptions.map((l) => ({ value: l, label: l }))],
          },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Event order" },
              { value: "high", label: "Most participants" },
              { value: "recent", label: "Most recent" },
            ],
          },
        ]}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${allEvents.length} events`}
        onClear={() => {
          setSearch("");
          setBatchId(null);
          setDept(null);
          setEvent("all");
          setLevel("all");
          setSort("all");
        }}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="achievements on file" />

      <DataTable
        title="Leading events"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.event_name}
        loading={events.isLoading}
        emptyMessage="No sports achievements found."
      />
    </div>
  );
}
