"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Select, DatePicker, DataTable, useToast, type DataTableColumn } from "@/modules/admin/components/ui";
import { cn } from "@/lib/utils/cn";
import { friendlyError } from "@/lib/utils/errors";
import { ADMIN_REPORT_CATALOG, type AdminReportEntry } from "@/modules/admin/types/reports";
import { REPORT_DEFS, useReportPreview, useReportDownload, useHostelOptions, type ReportFilters } from "@/modules/admin/api/reports";
import { useDepartments } from "@/modules/admin/api/refData";

const DEFAULT_ENTRY = ADMIN_REPORT_CATALOG[0].entries[0];

/**
 * Hostel/Library/IQAC's report controllers are all real, already permit
 * ADMIN, and already export PDF/Excel — this page just needed to call
 * them. Filter controls are driven by REPORT_DEFS.supports per report, so
 * the UI never offers a department/hostel/date filter a given report's
 * backend method silently ignores.
 */
export default function AdminReportsPage() {
  const { show } = useToast();
  const [selected, setSelected] = useState<AdminReportEntry>(DEFAULT_ENTRY);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [hostelId, setHostelId] = useState<number | undefined>(undefined);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const def = REPORT_DEFS[`${selected.module}:${selected.key}`];
  const departments = useDepartments();
  const hostels = useHostelOptions();
  const download = useReportDownload();

  const filters: ReportFilters = {
    department_id: def?.supports.department ? departmentId : undefined,
    hostel_id: def?.supports.hostel ? hostelId : undefined,
    from: def?.supports.dateRange && from ? from : undefined,
    to: def?.supports.dateRange && to ? to : undefined,
  };

  const preview = useReportPreview(selected.module, selected.key, filters);

  function selectEntry(entry: AdminReportEntry) {
    setSelected(entry);
    setDepartmentId(undefined);
    setHostelId(undefined);
    setFrom("");
    setTo("");
  }

  async function handleDownload(format: "pdf" | "excel") {
    try {
      await download.mutateAsync({ module: selected.module, key: selected.key, format, filters });
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  const table = preview.data;
  const columns: DataTableColumn<Record<string, unknown>>[] =
    table?.columns.map((c) => ({
      key: c.key,
      header: c.header,
      render: (row) => <span>{String(row[c.key] ?? "—")}</span>,
    })) ?? [];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Every exportable report across Hostel, Library and IQAC, in one place — PDF or Excel."
      />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-4">
          {ADMIN_REPORT_CATALOG.map((group) => (
            <div key={group.module} className="flex flex-col gap-2">
              <p className="px-1 text-[11px] font-bold tracking-[.09em] text-admin-subtle uppercase">{group.label}</p>
              {group.entries.map((entry) => {
                const active = entry.module === selected.module && entry.key === selected.key;
                return (
                  <button
                    key={`${entry.module}:${entry.key}`}
                    onClick={() => selectEntry(entry)}
                    className={cn(
                      "rounded-admin-lg border px-4 py-3 text-left transition-colors",
                      active ? "border-admin-primary bg-admin-tint-strong" : "border-admin-border bg-admin-canvas hover:border-admin-border-hover",
                    )}
                  >
                    <p className="text-sm font-semibold text-admin-ink">{entry.label}</p>
                    <p className="mt-0.5 text-xs text-admin-muted">{entry.description}</p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <Card hoverable={false} className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-sans text-base font-bold text-admin-ink">{selected.label}</h3>
              <span className="mt-0.5 block text-xs text-admin-muted">
                {table ? `${table.rows.length} row${table.rows.length === 1 ? "" : "s"}` : "—"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleDownload("pdf")} disabled={download.isPending}>
                {download.isPending ? "Preparing…" : "Download PDF"}
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleDownload("excel")} disabled={download.isPending}>
                {download.isPending ? "Preparing…" : "Download Excel"}
              </Button>
            </div>
          </div>

          {def && (def.supports.department || def.supports.hostel || def.supports.dateRange) && (
            <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-admin-divider pb-4">
              {def.supports.department && (
                <Select
                  className="w-auto"
                  value={departmentId ?? ""}
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">All departments</option>
                  {departments.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
              {def.supports.hostel && (
                <Select
                  className="w-auto"
                  value={hostelId ?? ""}
                  onChange={(e) => setHostelId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">All hostels</option>
                  {hostels.data?.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              )}
              {def.supports.dateRange && (
                <>
                  <DatePicker value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
                  <span className="text-xs text-admin-subtle">to</span>
                  <DatePicker value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
                </>
              )}
            </div>
          )}

          <DataTable
            columns={columns}
            rows={table?.rows ?? []}
            rowKey={(row) => JSON.stringify(row)}
            isLoading={preview.isLoading}
            error={preview.isError ? "Couldn't load this report. Try again." : null}
            emptyTitle="No records for the selected filters"
          />
        </Card>
      </div>
    </div>
  );
}
