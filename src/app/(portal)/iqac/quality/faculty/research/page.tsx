"use client";

import { useMemo, useState } from "react";
import { DataTable, ConfirmDialog, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddResearchEntryModal } from "@/modules/iqac/components/facultyDevelopment/AddResearchEntryModal";
import { useResearch, useResearchQuality, useDeleteResearchEntry, type ResearchRow } from "@/modules/iqac/api/facultyDevelopment";

export default function ResearchPage() {
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ResearchRow | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ResearchRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("all");

  const research = useResearch();
  const quality = useResearchQuality();
  const deleteEntry = useDeleteResearchEntry();

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

  const allRows = useMemo(() => research.data ?? [], [research.data]);

  const statusOptions = useMemo(() => Array.from(new Set(allRows.map((r) => r.project_status))).sort(), [allRows]);

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
      const okQ = !q || `${r.faculty.name} ${r.centre_name} ${r.focus_area ?? ""}`.toLowerCase().includes(q);
      const okD = dept == null || r.faculty.department?.code === dept;
      const okS = status === "all" || r.project_status === status;
      return okQ && okD && okS;
    });
  }, [allRows, search, dept, status]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "recent") rows.sort((a, b) => (b.joined_on ?? "").localeCompare(a.joined_on ?? ""));
    if (sort === "centre") rows.sort((a, b) => a.centre_name.localeCompare(b.centre_name));
    return rows;
  }, [filtered, sort]);

  const columns = useMemo<DataTableColumn<ResearchRow>[]>(
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
      { key: "centre", header: "Centre / Project", width: "1.6fr", sortValue: (r) => r.centre_name, render: (r) => <span className="font-bold text-ink">{r.centre_name}</span> },
      { key: "focus", header: "Focus area", sortValue: (r) => r.focus_area ?? "", render: (r) => r.focus_area ?? "—" },
      { key: "role", header: "Role", sortValue: (r) => r.role, render: (r) => r.role },
      { key: "project_status", header: "Status", sortValue: (r) => r.project_status, render: (r) => r.project_status },
      { key: "joined_on", header: "Joined on", align: "right", sortValue: (r) => r.joined_on ?? "", render: (r) => (r.joined_on ? r.joined_on.slice(0, 10) : "—") },
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
      <MetricBackNav crumb="IQAC · Faculty Development · Research" />
      <MetricHeader
        name="Research"
        blurb="Faculty research centres, projects and investigator roles — real faculty_research_projects/faculty_research_project_members data."
        addLabel="+ Add faculty entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddResearchEntryModal onClose={() => setAddingEntry(false)} onCreated={() => research.refetch()} />}
      {editingEntry && (
        <AddResearchEntryModal editing={editingEntry} onClose={() => setEditingEntry(null)} onCreated={() => research.refetch()} />
      )}
      <ConfirmDialog
        open={deletingEntry != null}
        title="Delete this research membership?"
        description={deleteError ?? "This can't be undone. The shared project itself isn't affected."}
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
        searchPlaceholder="Search faculty, centre or focus area"
        selects={[
          {
            label: "DEPARTMENT",
            value: dept ?? "all",
            onChange: (v) => setDept(v === "all" ? null : v),
            options: [{ value: "all", label: "All departments" }, ...rollupItems.map((d) => ({ value: d.code, label: d.code }))],
          },
          {
            label: "STATUS",
            value: status,
            onChange: setStatus,
            options: [{ value: "all", label: "All statuses" }, ...statusOptions.map((s) => ({ value: s, label: s }))],
          },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Default order" },
              { value: "recent", label: "Most recent" },
              { value: "centre", label: "Centre name" },
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

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="memberships on file" />

      <DataTable
        title="Research register"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.id}
        loading={research.isLoading}
        emptyMessage="No research memberships recorded yet."
      />
    </div>
  );
}
