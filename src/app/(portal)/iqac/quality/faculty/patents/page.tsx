"use client";

import { useMemo, useState } from "react";
import { DataTable, ConfirmDialog, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddPatentEntryModal } from "@/modules/iqac/components/facultyDevelopment/AddPatentEntryModal";
import { usePatents, usePatentsQuality, useDeletePatentEntry, type PatentRow } from "@/modules/iqac/api/facultyDevelopment";

const STAGE_OPTIONS = [
  { value: "all", label: "All stages" },
  { value: "filed", label: "Filed" },
  { value: "published", label: "Published" },
  { value: "granted", label: "Granted" },
];

export default function PatentsPage() {
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PatentRow | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<PatentRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState("all");

  const patents = usePatents();
  const quality = usePatentsQuality();
  const deleteEntry = useDeletePatentEntry();

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

  const allRows = useMemo(() => patents.data ?? [], [patents.data]);

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
      const okQ = !q || `${r.faculty.name} ${r.title}`.toLowerCase().includes(q);
      const okD = dept == null || r.faculty.department?.code === dept;
      const okS = stage === "all" || r.stage === stage;
      return okQ && okD && okS;
    });
  }, [allRows, search, dept, stage]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "recent") rows.sort((a, b) => (b.filed_year ?? 0) - (a.filed_year ?? 0));
    if (sort === "title") rows.sort((a, b) => a.title.localeCompare(b.title));
    return rows;
  }, [filtered, sort]);

  const columns = useMemo<DataTableColumn<PatentRow>[]>(
    () => [
      {
        key: "faculty",
        header: "Faculty",
        width: "1.2fr",
        sortValue: (r) => r.faculty.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.faculty.name}</div>
            <div className="text-[12px] text-subtle">{r.faculty.designation}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.faculty.department?.code ?? "", render: (r) => r.faculty.department?.code ?? "—" },
      { key: "title", header: "Title", width: "1.8fr", sortValue: (r) => r.title, render: (r) => <span className="font-bold text-ink">{r.title}</span> },
      { key: "role", header: "Role", sortValue: (r) => r.role, render: (r) => r.role },
      { key: "stage", header: "Stage", sortValue: (r) => r.stage, render: (r) => r.stage },
      { key: "filed_year", header: "Filed year", align: "right", sortValue: (r) => r.filed_year ?? -1, render: (r) => r.filed_year ?? "—" },
      { key: "stage_date", header: "Stage date", align: "right", sortValue: (r) => r.stage_date ?? "", render: (r) => (r.stage_date ? r.stage_date.slice(0, 10) : "—") },
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
      <MetricBackNav crumb="IQAC · Faculty Development · Patents" />
      <MetricHeader
        name="Patents"
        blurb="Patent filings and inventorship roles — real faculty_patents/faculty_patent_inventors data."
        addLabel="+ Add faculty entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddPatentEntryModal onClose={() => setAddingEntry(false)} onCreated={() => patents.refetch()} />}
      {editingEntry && (
        <AddPatentEntryModal editing={editingEntry} onClose={() => setEditingEntry(null)} onCreated={() => patents.refetch()} />
      )}
      <ConfirmDialog
        open={deletingEntry != null}
        title="Delete this patent inventorship?"
        description={deleteError ?? "This can't be undone. The shared patent itself isn't affected."}
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
          { label: "Last year", value: quality.data?.last_year ?? "—", foot: "prior calendar year" },
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
        searchPlaceholder="Search faculty or patent title"
        selects={[
          {
            label: "DEPARTMENT",
            value: dept ?? "all",
            onChange: (v) => setDept(v === "all" ? null : v),
            options: [{ value: "all", label: "All departments" }, ...rollupItems.map((d) => ({ value: d.code, label: d.code }))],
          },
          { label: "STAGE", value: stage, onChange: setStage, options: STAGE_OPTIONS },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Default order" },
              { value: "recent", label: "Most recent" },
              { value: "title", label: "Title" },
            ],
          },
        ]}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${allRows.length} entries`}
        onClear={() => {
          setSearch("");
          setDept(null);
          setStage("all");
          setSort("all");
        }}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="inventorships on file" />

      <DataTable
        title="Patents register"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.id}
        loading={patents.isLoading}
        emptyMessage="No patents recorded yet."
      />
    </div>
  );
}
