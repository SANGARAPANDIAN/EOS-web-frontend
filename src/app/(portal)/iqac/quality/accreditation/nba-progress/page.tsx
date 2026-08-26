"use client";

import { useMemo, useState } from "react";
import { Badge, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { useNbaOverview, type NbaCriterionRow, type NbaCriterionStatus } from "@/modules/iqac/api/accreditation";
import { useDepartmentsList } from "@/modules/iqac/api/departments";

const STATUS_LABEL: Record<NbaCriterionStatus, string> = {
  complete: "Complete",
  in_progress: "In progress",
  missing: "Missing",
};
const STATUS_TONE: Record<NbaCriterionStatus, BadgeTone> = {
  complete: "accent",
  in_progress: "neutral",
  missing: "danger",
};

export default function NbaProgressPage() {
  const departments = useDepartmentsList();
  const [deptId, setDeptId] = useState<number | null>(null);
  const overview = useNbaOverview(deptId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<NbaCriterionStatus | "all">("all");

  const allCriteria = useMemo(() => overview.data?.criteria ?? [], [overview.data]);

  const meanReadiness = useMemo(() => {
    if (allCriteria.length === 0) return null;
    const sum = allCriteria.reduce((acc, c) => acc + (c.total_count > 0 ? (c.done_count / c.total_count) * 100 : 0), 0);
    return Math.round(sum / allCriteria.length);
  }, [allCriteria]);
  const completeCount = useMemo(() => allCriteria.filter((c) => c.status === "complete").length, [allCriteria]);
  const evidenceTotal = useMemo(() => allCriteria.reduce((sum, c) => sum + c.total_count, 0), [allCriteria]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCriteria.filter((c) => {
      const okQ = !q || `${c.code} ${c.name} ${c.department?.name ?? ""}`.toLowerCase().includes(q);
      const okS = status === "all" || c.status === status;
      return okQ && okS;
    });
  }, [allCriteria, search, status]);

  const columns = useMemo<DataTableColumn<NbaCriterionRow>[]>(
    () => [
      { key: "code", header: "Code", sortValue: (r) => r.code, render: (r) => <span className="font-mono text-[12px] font-bold text-primary">{r.code}</span> },
      { key: "name", header: "Criterion", width: "1.6fr", sortValue: (r) => r.name, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "dept", header: "Department", sortValue: (r) => r.department?.code ?? "Institution-wide", render: (r) => r.department?.code ?? "Institution-wide" },
      { key: "max_marks", header: "Max marks", align: "right", sortValue: (r) => r.max_marks, render: (r) => r.max_marks },
      { key: "evidence", header: "Evidence", align: "right", sortValue: (r) => r.total_count > 0 ? r.done_count / r.total_count : 0, render: (r) => `${r.done_count} / ${r.total_count}` },
      { key: "status", header: "Status", sortValue: (r) => STATUS_LABEL[r.status], render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Accreditation · NBA progress" />
      <MetricHeader
        name="NBA progress"
        blurb="SAR readiness for NBA-eligible programmes — real nba_criteria/nba_evidence_items data, read-only here (Secretary manages edits)."
      />

      <MetricCards
        cards={[
          { label: "Items", value: allCriteria.length, foot: deptId != null ? "this department" : "institution-wide" },
          { label: "Mean readiness", value: meanReadiness != null ? `${meanReadiness}%` : "—", foot: "component mean" },
          { label: "Complete", value: completeCount, foot: "all evidence items done" },
          { label: "Evidence files", value: evidenceTotal, foot: "checklist items across these criteria" },
        ]}
      />

      <MetricFilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search criterion or department"
        selects={[
          {
            label: "DEPARTMENT",
            value: deptId != null ? String(deptId) : "",
            onChange: (v) => setDeptId(v ? Number(v) : null),
            options: [{ value: "", label: "All departments" }, ...(departments.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))],
          },
          {
            label: "STATUS",
            value: status,
            onChange: (v) => setStatus(v as NbaCriterionStatus | "all"),
            options: [
              { value: "all", label: "Any status" },
              { value: "complete", label: "Complete" },
              { value: "in_progress", label: "In progress" },
              { value: "missing", label: "Missing" },
            ],
          },
        ]}
        countLabel={`Showing ${filtered.length} of ${allCriteria.length} criteria`}
        onClear={() => {
          setSearch("");
          setDeptId(null);
          setStatus("all");
        }}
      />

      <DataTable
        title="NBA criterion status"
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        loading={overview.isLoading}
        emptyMessage="No NBA criteria recorded yet."
        hoverableRows
      />
    </div>
  );
}
