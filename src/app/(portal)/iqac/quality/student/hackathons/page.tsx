"use client";

import { useMemo, useState } from "react";
import { DataTable, ConfirmDialog, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddHackathonEntryModal } from "@/modules/iqac/components/studentDevelopment/AddHackathonEntryModal";
import { useHackathons, useHackathonsQuality, useDeleteHackathonEntry, type HackathonRow } from "@/modules/iqac/api/studentDevelopment";
import { useExamFilters, currentAcademicYearShort } from "@/modules/iqac/api/academicQuality";

export default function HackathonsPage() {
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HackathonRow | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<HackathonRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("all");
  const [sort, setSort] = useState("all");

  const hackathons = useHackathons(batchId);
  const quality = useHackathonsQuality();
  const filters = useExamFilters();
  const deleteEntry = useDeleteHackathonEntry();

  async function confirmDelete() {
    if (!deletingEntry) return;
    setDeleteError(null);
    try {
      await deleteEntry.mutateAsync(deletingEntry.id);
      setDeletingEntry(null);
    } catch (err: unknown) {
      setDeleteError((err as { message?: string })?.message ?? "Could not delete this entry.");
    }
  }

  const allRows = useMemo(() => hackathons.data ?? [], [hackathons.data]);

  const outcomeOptions = useMemo(() => Array.from(new Set(allRows.map((r) => r.outcome).filter((o): o is string => !!o))).sort(), [allRows]);

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
      const okQ = !q || `${r.student.name} ${r.hackathon_name} ${r.team_name ?? ""} ${r.host ?? ""}`.toLowerCase().includes(q);
      const okD = dept == null || r.student.department?.code === dept;
      const okO = outcome === "all" || r.outcome === outcome;
      return okQ && okD && okO;
    });
  }, [allRows, search, dept, outcome]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "recent") rows.sort((a, b) => (b.held_on ?? "").localeCompare(a.held_on ?? ""));
    if (sort === "hackathon") rows.sort((a, b) => a.hackathon_name.localeCompare(b.hackathon_name));
    return rows;
  }, [filtered, sort]);

  const columns = useMemo<DataTableColumn<HackathonRow>[]>(
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
      { key: "hackathon", header: "Hackathon", width: "1.4fr", sortValue: (r) => r.hackathon_name, render: (r) => <span className="font-bold text-ink">{r.hackathon_name}</span> },
      { key: "team", header: "Team", sortValue: (r) => r.team_name ?? "", render: (r) => r.team_name ?? "—" },
      { key: "host", header: "Host", sortValue: (r) => r.host ?? "", render: (r) => r.host ?? "—" },
      { key: "held_on", header: "Held on", align: "right", sortValue: (r) => r.held_on ?? "", render: (r) => (r.held_on ? r.held_on.slice(0, 10) : "—") },
      { key: "outcome", header: "Outcome", align: "right", sortValue: (r) => r.outcome ?? "", render: (r) => r.outcome ?? "—" },
      {
        key: "actions",
        header: "",
        width: "0.9fr",
        render: (r) => (
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditingEntry(r)} className="text-[12.5px] font-bold text-primary hover:underline">
              Edit
            </button>
            <button type="button" onClick={() => setDeletingEntry(r)} className="text-[12.5px] font-bold text-danger-fg hover:underline">
              Delete
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Student Development · Hackathons" />
      <MetricHeader
        name="Hackathons"
        blurb="Hackathon teams and outcomes — real student_hackathon_participations data."
        addLabel="+ Add student entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddHackathonEntryModal onClose={() => setAddingEntry(false)} onCreated={() => hackathons.refetch()} />}
      {editingEntry && (
        <AddHackathonEntryModal editing={editingEntry} onClose={() => setEditingEntry(null)} onCreated={() => hackathons.refetch()} />
      )}
      <ConfirmDialog
        open={deletingEntry != null}
        title="Delete this hackathon entry?"
        description={deleteError ?? "This can't be undone."}
        confirmLabel={deleteEntry.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeletingEntry(null);
          setDeleteError(null);
        }}
      />

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
        searchPlaceholder="Search student, hackathon, team or host"
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
            label: "OUTCOME",
            value: outcome,
            onChange: setOutcome,
            options: [{ value: "all", label: "All outcomes" }, ...outcomeOptions.map((o) => ({ value: o, label: o }))],
          },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Default order" },
              { value: "recent", label: "Most recent" },
              { value: "hackathon", label: "Hackathon name" },
            ],
          },
        ]}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${allRows.length} entries`}
        onClear={() => {
          setSearch("");
          setBatchId(null);
          setDept(null);
          setOutcome("all");
          setSort("all");
        }}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="entries on file" />

      <DataTable
        title="Hackathons register"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.id}
        loading={hackathons.isLoading}
        emptyMessage="No hackathon participation recorded yet."
      />
    </div>
  );
}
