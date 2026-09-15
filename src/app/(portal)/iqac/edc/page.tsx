"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { PageCrumbs, StatTile, FilterSelect, FilterBarFooter } from "@/modules/iqac/components/PageControls";
import { useEdcFilters, useEdcList, type EdcRow } from "@/modules/iqac/api/edc";
import { exportToPdf, formatMoneyForPdf } from "@/lib/utils/pdf-export";

const EMPTY_FILTERS = { q: "", departmentId: "", batchId: "", status: "" };

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function IqacEdcPage() {
  const [f, setF] = useState(EMPTY_FILTERS);

  const filters = useEdcFilters();
  const list = useEdcList({
    q: f.q.trim() || undefined,
    department_id: f.departmentId ? Number(f.departmentId) : undefined,
    batch_id: f.batchId ? Number(f.batchId) : undefined,
  });

  const allRows = useMemo(() => list.data?.records ?? [], [list.data]);

  const statusOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.incubation_status).filter((v): v is string => !!v))).sort(),
    [allRows],
  );

  const rows = useMemo(() => {
    if (!f.status) return allRows;
    return allRows.filter((r) => r.incubation_status === f.status);
  }, [allRows, f.status]);

  const incubatedCount = rows.filter((r) => r.incubation_status != null).length;
  const activeCount = rows.filter((r) => r.incubation_status === "Active").length;
  const distinctDepartments = new Set(rows.map((r) => r.department?.id).filter((v): v is number => v != null)).size;

  function update<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  const columns = useMemo<DataTableColumn<EdcRow>[]>(
    () => [
      {
        key: "venture",
        header: "Venture",
        width: "1.4fr",
        sortValue: (r) => r.venture,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.venture}</div>
            {r.domain && <div className="text-[12px] text-subtle">{r.domain}</div>}
          </div>
        ),
      },
      {
        key: "founder",
        header: "Student founder",
        sortValue: (r) => r.student.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.student.name}</div>
            <div className="text-[12px] text-subtle">{r.student.register_no ?? "—"}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.department?.code ?? "", render: (r) => r.department?.code ?? "—" },
      { key: "stage", header: "Stage", sortValue: (r) => r.stage ?? "", render: (r) => r.stage ?? "—" },
      { key: "funding", header: "Funding required", align: "right", sortValue: (r) => r.funding_required ?? -1, render: (r) => (r.funding_required != null ? `₹${r.funding_required.toLocaleString("en-IN")}` : "—") },
      { key: "registration", header: "Registration", sortValue: (r) => r.registration_type ?? "", render: (r) => r.registration_type ?? "Not tracked" },
      { key: "incubated", header: "Incubated", sortValue: (r) => r.incubation_status ?? "", render: (r) => r.incubation_status ?? "No" },
    ],
    [],
  );

  function handleExportCsv() {
    const header = ["Venture", "Domain", "Student founder", "Register no", "Dept", "Stage", "Funding required", "Registration", "Incubation status"];
    const body = rows.map((r) => [
      r.venture,
      r.domain ?? "—",
      r.student.name,
      r.student.register_no ?? "—",
      r.department?.code ?? "—",
      r.stage ?? "—",
      r.funding_required != null ? `₹${r.funding_required.toLocaleString("en-IN")}` : "—",
      r.registration_type ?? "Not tracked",
      r.incubation_status ?? "No",
    ]);
    downloadCsv("edc.csv", [header, ...body]);
  }

  function handleExportPdf() {
    void exportToPdf({
      title: "EDC",
      subtitle: "Entrepreneurship Development Cell — student ventures",
      filename: "edc.pdf",
      sections: [
        {
          type: "table",
          columns: [
            { header: "Venture", key: "venture" },
            { header: "Domain", key: "domain" },
            { header: "Student founder", key: "founder" },
            { header: "Register no", key: "register_no" },
            { header: "Dept", key: "dept" },
            { header: "Stage", key: "stage" },
            { header: "Funding required", key: "funding" },
            { header: "Registration", key: "registration" },
            { header: "Incubation status", key: "incubation" },
          ],
          rows: rows.map((r) => ({
            venture: r.venture,
            domain: r.domain ?? "—",
            founder: r.student.name,
            register_no: r.student.register_no ?? "—",
            dept: r.department?.code ?? "—",
            stage: r.stage ?? "—",
            funding: r.funding_required != null ? formatMoneyForPdf(r.funding_required) : "—",
            registration: r.registration_type ?? "Not tracked",
            incubation: r.incubation_status ?? "No",
          })),
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <PageCrumbs items={["IQAC", "EDC"]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">EDC</h1>
          <p className="mt-1 text-[13.5px] text-muted">Entrepreneurship Development Cell — student ventures. No faculty-mentor column: mentorship isn&apos;t tracked on this table.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Ventures" value={rows.length} sub="in this view" />
        <StatTile label="Incubated" value={incubatedCount} sub="have a real incubations record" />
        <StatTile label="Active" value={activeCount} sub="incubation status: Active" />
        <StatTile label="Departments" value={distinctDepartments} sub="departments represented" />
      </div>

      <div className="rounded-card border border-border-default bg-surface p-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Search</div>
            <input
              value={f.q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search venture, founder or domain"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <FilterSelect
            label="Department"
            value={f.departmentId}
            onChange={(v) => update("departmentId", v)}
            options={[{ value: "", label: "All departments" }, ...(filters.data?.departments.map((d) => ({ value: String(d.id), label: d.name })) ?? [])]}
          />
          <FilterSelect
            label="Batch"
            value={f.batchId}
            onChange={(v) => update("batchId", v)}
            options={[{ value: "", label: "All batches" }, ...(filters.data?.batches.map((b) => ({ value: String(b.id), label: b.name })) ?? [])]}
          />
          <FilterSelect
            label="Status"
            value={f.status}
            onChange={(v) => update("status", v)}
            options={[{ value: "", label: "Any status" }, ...statusOptions.map((s) => ({ value: s, label: s }))]}
          />
        </div>

        <FilterBarFooter rangeStart={rows.length > 0 ? 1 : 0} rangeEnd={rows.length} total={allRows.length} onClear={() => setF(EMPTY_FILTERS)} clickable={false} />
      </div>

      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} loading={list.isLoading} emptyMessage="No EDC ventures found." hoverableRows />
    </div>
  );
}
