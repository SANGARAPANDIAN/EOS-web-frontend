"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "./MetricPageChrome";
import type { OutcomeAttainment, OutcomeRow } from "@/modules/iqac/api/academicQuality";

export function OutcomesPage({
  crumb,
  name,
  blurb,
  attainment,
  isLoading,
  showSubjectColumn,
  batchId,
  onBatchChange,
  batchOptions,
}: {
  crumb: string;
  name: string;
  blurb: string;
  attainment: OutcomeAttainment | undefined;
  isLoading: boolean;
  showSubjectColumn: boolean;
  batchId: number | null;
  onBatchChange: (v: number | null) => void;
  batchOptions: { id: number; label: string }[];
}) {
  const [deptCode, setDeptCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const outcomes = useMemo(() => attainment?.outcomes ?? [], [attainment]);

  // Real mean of every tracked outcome's own target_value — this domain has
  // no institution-wide iqac_metric_targets entry (each CO/PO carries its
  // own real target instead), so "Target" here is a mean over those real
  // per-outcome values, never a fabricated single number.
  const meanTarget = useMemo(() => {
    const targets = outcomes.map((o) => o.target).filter((v): v is number => v != null);
    return targets.length > 0 ? targets.reduce((a, b) => a + b, 0) / targets.length : null;
  }, [outcomes]);
  const meanAttained = attainment?.mean_attained ?? null;
  const outcomesAttainment = meanTarget != null && meanAttained != null ? Math.round((meanAttained / meanTarget) * 1000) / 10 : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outcomes.filter((o) => {
      const okQ = !q || `${o.code} ${o.description} ${o.subject_name ?? ""}`.toLowerCase().includes(q);
      const okD = deptCode == null || o.department?.code === deptCode;
      return okQ && okD;
    });
  }, [outcomes, search, deptCode]);

  // Department rollup — grouped client-side from the same outcomes already on the
  // page (each row carries its own `department`), same as the design's per-metric
  // rollup cards. No extra request: this is the one full, unfiltered fetch.
  const rollupItems = useMemo(() => {
    const byDept = new Map<string, { sum: number; count: number }>();
    for (const o of outcomes) {
      const code = o.department?.code;
      if (!code) continue;
      const entry = byDept.get(code) ?? { sum: 0, count: 0 };
      if (o.attained != null) {
        entry.sum += o.attained;
        entry.count += 1;
      }
      byDept.set(code, entry);
    }
    return [...byDept.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, v]) => ({
        code,
        value: v.count > 0 ? (v.sum / v.count).toFixed(2) : "—",
        pct: v.count > 0 ? (v.sum / v.count / 3) * 100 : null,
      }));
  }, [outcomes]);

  const columns = useMemo<DataTableColumn<OutcomeRow>[]>(
    () => [
      { key: "code", header: "Outcome", render: (r) => <span className="font-mono text-[12px] font-bold text-primary">{r.code}</span> },
      { key: "description", header: "Description", width: "1.8fr", render: (r) => r.description },
      ...(showSubjectColumn
        ? [{ key: "subject", header: "Subject", render: (r: OutcomeRow) => (r.subject_code ? `${r.subject_code} · ${r.subject_name}` : "—") }]
        : []),
      { key: "dept", header: "Department", render: (r) => r.department?.code ?? "—" },
      { key: "direct", header: "Direct", align: "right", render: (r) => (r.direct != null ? r.direct.toFixed(2) : "—") },
      { key: "indirect", header: "Indirect", align: "right", render: (r) => (r.indirect != null ? r.indirect.toFixed(2) : "—") },
      { key: "target", header: "Target", align: "right", render: (r) => (r.target != null ? r.target.toFixed(2) : "—") },
      {
        key: "attained",
        header: "Attained",
        align: "right",
        render: (r) => (
          <div className="flex items-center justify-end gap-2.5">
            <div className="h-1.5 w-[70px] overflow-hidden rounded-full bg-surface-tint">
              <div className="h-full rounded-full bg-primary" style={{ width: `${r.attained != null ? Math.max(2, (r.attained / 3) * 100) : 0}%` }} />
            </div>
            <span className="w-10 text-right font-mono text-[13px] font-bold">{r.attained != null ? r.attained.toFixed(2) : "—"}</span>
          </div>
        ),
      },
    ],
    [showSubjectColumn],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb={crumb} />
      <MetricHeader name={name} blurb={blurb} />

      <MetricCards
        cards={[
          {
            label: "This year",
            value: meanAttained ?? "—",
            foot: `${attainment?.recorded_count ?? 0} of ${attainment?.tracked_count ?? 0} ${showSubjectColumn ? "course" : "programme"} outcomes recorded`,
          },
          { label: "Last year", value: "—", foot: "no historical attainment tracked" },
          { label: "Target", value: meanTarget != null ? meanTarget.toFixed(2) : "—", foot: "mean of each outcome's own real target" },
          {
            label: "Attainment",
            value: outcomesAttainment != null ? `${outcomesAttainment}%` : "—",
            foot: "requires a target to compute",
            hasBar: outcomesAttainment != null,
            barPct: outcomesAttainment ?? 0,
          },
        ]}
      />

      <MetricFilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search outcome code, description or subject"
        selects={[
          {
            label: "BATCH",
            value: batchId != null ? String(batchId) : "all",
            onChange: (v) => onBatchChange(v === "all" ? null : Number(v)),
            options: [{ value: "all", label: "All batches" }, ...batchOptions.map((b) => ({ value: String(b.id), label: b.label }))],
          },
          {
            label: "DEPARTMENT",
            value: deptCode ?? "all",
            onChange: (v) => setDeptCode(v === "all" ? null : v),
            options: [{ value: "all", label: "All departments" }, ...rollupItems.map((r) => ({ value: r.code, label: r.code }))],
          },
        ]}
        countLabel={`${filtered.length} ${showSubjectColumn ? "course" : "programme"} outcomes${deptCode ? ` · ${deptCode}` : ""}`}
        onClear={() => {
          setSearch("");
          setDeptCode(null);
          onBatchChange(null);
        }}
      />

      <DepartmentRollup items={rollupItems} selected={deptCode} onSelect={setDeptCode} footLabel="mean attained" />

      <DataTable columns={columns} data={filtered} rowKey={(r) => r.id} loading={isLoading} emptyMessage="No outcomes recorded yet." />
    </div>
  );
}
