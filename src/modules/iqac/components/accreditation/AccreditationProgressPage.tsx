"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddAccreditationItemModal } from "./AddAccreditationItemModal";
import { useAccreditationItems, type AccreditationCycle, type AccreditationItemRow } from "@/modules/iqac/api/accreditation";

const STATUS_OPTIONS = [
  { value: "all", label: "Any status" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
];

const READINESS_OPTIONS = [
  { value: "all", label: "Any readiness" },
  { value: "below50", label: "Below 50%" },
  { value: "50to99", label: "50–99%" },
  { value: "complete", label: "100%" },
];

function inReadinessBucket(pct: number, bucket: string): boolean {
  if (bucket === "all") return true;
  if (bucket === "below50") return pct < 50;
  if (bucket === "50to99") return pct >= 50 && pct < 100;
  return pct >= 100;
}

const CYCLE_LABELS: Record<AccreditationCycle, string> = {
  naac: "NAAC progress",
  aqar: "AQAR progress",
  ssr: "SSR progress",
};

export function AccreditationProgressPage({ cycle }: { cycle: AccreditationCycle }) {
  const [addingEntry, setAddingEntry] = useState(false);

  const [search, setSearch] = useState("");
  const [criterion, setCriterion] = useState("all");
  const [owner, setOwner] = useState("all");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [readiness, setReadiness] = useState("all");

  const items = useAccreditationItems(cycle);
  const allRows = useMemo(() => items.data ?? [], [items.data]);

  const criterionOptions = useMemo(
    () => [...allRows].sort((a, b) => a.criterion_number - b.criterion_number).map((r) => ({ value: r.code, label: `Criterion ${r.criterion_number}` })),
    [allRows],
  );
  const ownerOptions = useMemo(() => {
    const names = new Set(allRows.map((r) => r.owner?.name).filter((n): n is string => !!n));
    return Array.from(names).sort();
  }, [allRows]);
  const deptOptions = useMemo(() => {
    const codes = new Map<string, string>();
    for (const r of allRows) if (r.department) codes.set(r.department.code, r.department.name);
    return Array.from(codes.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const okQ = !q || `${r.name} ${r.code} ${r.owner?.name ?? ""} ${r.note ?? ""}`.toLowerCase().includes(q);
      const okC = criterion === "all" || r.code === criterion;
      const okO = owner === "all" || r.owner?.name === owner;
      const okD = dept === "all" || r.department?.code === dept;
      const okS = status === "all" || r.status === status;
      const okR = inReadinessBucket(r.readiness_percent, readiness);
      return okQ && okC && okO && okD && okS && okR;
    });
  }, [allRows, search, criterion, owner, dept, status, readiness]);

  const meanReadiness = useMemo(() => {
    if (allRows.length === 0) return null;
    return Math.round(allRows.reduce((sum, r) => sum + r.readiness_percent, 0) / allRows.length);
  }, [allRows]);
  const completeCount = useMemo(() => allRows.filter((r) => r.status === "complete").length, [allRows]);
  const evidenceTotal = useMemo(() => allRows.reduce((sum, r) => sum + r.evidence_count, 0), [allRows]);

  const columns = useMemo<DataTableColumn<AccreditationItemRow>[]>(
    () => [
      { key: "code", header: "Item ID", sortValue: (r) => r.code, render: (r) => <span className="font-mono text-[12px] font-bold text-primary">{r.code}</span> },
      { key: "name", header: "Item", width: "1.6fr", sortValue: (r) => r.name, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "owner", header: "Owner", sortValue: (r) => r.owner?.name ?? "", render: (r) => r.owner?.name ?? "Not assigned" },
      { key: "dept", header: "Scope", sortValue: (r) => r.department?.code ?? "", render: (r) => r.department?.code ?? "All" },
      {
        key: "readiness",
        header: "Readiness",
        align: "right",
        sortValue: (r) => r.readiness_percent,
        render: (r) => (
          <div className="flex items-center justify-end gap-2.5">
            <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-surface-tint">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, r.readiness_percent)}%` }} />
            </div>
            <span className="w-9 text-right font-mono text-[13px] font-bold">{r.readiness_percent}%</span>
          </div>
        ),
      },
      { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => r.status.replace("_", " ") },
      { key: "due_date", header: "Due date", align: "right", sortValue: (r) => r.due_date ?? "", render: (r) => (r.due_date ? r.due_date.slice(0, 10) : "—") },
      { key: "evidence", header: "Evidence", align: "right", sortValue: (r) => r.evidence_count, render: (r) => r.evidence_count },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb={`IQAC · Accreditation · ${CYCLE_LABELS[cycle]}`} />
      <MetricHeader
        name={CYCLE_LABELS[cycle]}
        blurb="Item-wise readiness, owner and evidence — real iqac_accreditation_criteria/iqac_accreditation_evidence_items data, owned directly by IQAC."
        addLabel="+ Add item"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddAccreditationItemModal cycle={cycle} onClose={() => setAddingEntry(false)} onCreated={() => items.refetch()} />}

      <MetricCards
        cards={[
          { label: "Items", value: allRows.length, foot: "matching these filters" },
          { label: "Mean readiness", value: meanReadiness != null ? `${meanReadiness}%` : "—", foot: "component mean" },
          { label: "Complete", value: completeCount, foot: "signed off by IQAC" },
          { label: "Evidence files", value: evidenceTotal, foot: "checklist items across these criteria" },
        ]}
      />

      <MetricFilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search item, criterion, owner or note"
        selects={[
          {
            label: "CRITERION",
            value: criterion,
            onChange: setCriterion,
            options: [{ value: "all", label: "All criteria" }, ...criterionOptions],
          },
          {
            label: "OWNER",
            value: owner,
            onChange: setOwner,
            options: [{ value: "all", label: "All owners" }, ...ownerOptions.map((o) => ({ value: o, label: o }))],
          },
          {
            label: "DEPARTMENT",
            value: dept,
            onChange: setDept,
            options: [{ value: "all", label: "All departments" }, ...deptOptions.map(([code]) => ({ value: code, label: code }))],
          },
          { label: "STATUS", value: status, onChange: setStatus, options: STATUS_OPTIONS },
          { label: "READINESS", value: readiness, onChange: setReadiness, options: READINESS_OPTIONS },
        ]}
        countLabel={`Showing ${filtered.length} of ${allRows.length} records · Select an item for its detail, or Edit to change it`}
        onClear={() => {
          setSearch("");
          setCriterion("all");
          setOwner("all");
          setDept("all");
          setStatus("all");
          setReadiness("all");
        }}
      />

      <DataTable
        title="Progress register"
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        loading={items.isLoading}
        emptyMessage="No accreditation items recorded yet."
      />
    </div>
  );
}
