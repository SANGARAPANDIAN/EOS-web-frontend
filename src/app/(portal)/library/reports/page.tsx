"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { friendlyError } from "@/lib/utils/errors";
import {
  Button,
  Card,
  DataTable,
  DatePicker,
  PageHeader,
  Select,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useDepartments } from "@/modules/admin/api/refData";
import {
  REPORT_DEFS,
  REPORT_KEYS,
  useReportDownload,
  useReportPreview,
  type ReportFilters,
  type ReportKey,
} from "@/modules/library/api/reports";

type ReportRow = Record<string, unknown>;

export default function LibraryReportsPage() {
  const [selectedKey, setSelectedKey] = useState<ReportKey>(REPORT_KEYS[0]);
  const [filters, setFilters] = useState<ReportFilters>({});
  const { show } = useToast();

  const { data: departments } = useDepartments();
  const def = REPORT_DEFS[selectedKey];
  const { data: table, isLoading, error } = useReportPreview(selectedKey, filters);
  // Two independent mutation instances so a PDF download in flight doesn't
  // disable the Excel button (and vice versa) — each tracks its own isPending.
  const pdfDownload = useReportDownload();
  const excelDownload = useReportDownload();

  const rows: ReportRow[] = table?.rows ?? [];
  // DataTable's rowKey only receives the row, not an index, and report rows
  // have no guaranteed unique field across every report — stamping an index
  // on before handing rows to the table keeps keys stable and unique.
  const keyedRows = rows.map((row, index) => ({ ...row, __rowKey: index }));

  const columns: DataTableColumn<ReportRow>[] =
    table?.columns.map((col) => ({
      key: col.key,
      header: col.header,
      render: (row: ReportRow) => {
        const value = row[col.key];
        return value === null || value === undefined ? "—" : String(value);
      },
    })) ?? [];

  function selectReport(key: ReportKey) {
    setSelectedKey(key);
    setFilters({});
  }

  function handleDownload(format: "pdf" | "excel") {
    const mutation = format === "pdf" ? pdfDownload : excelDownload;
    mutation.mutate(
      { key: selectedKey, format, filters },
      { onError: (err: unknown) => show(friendlyError(err), "error") },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reports" description="Statutory and management reports, exportable as PDF or Excel." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-2">
          {REPORT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => selectReport(key)}
              className={cn(
                "rounded-admin-lg border px-4 py-3 text-left transition-colors",
                key === selectedKey
                  ? "border-admin-primary bg-admin-tint-strong"
                  : "border-admin-border bg-admin-canvas hover:border-admin-border-hover",
              )}
            >
              <p className="text-sm font-semibold text-admin-ink">{REPORT_DEFS[key].label}</p>
              <p className="mt-0.5 text-xs text-admin-muted">{REPORT_DEFS[key].description}</p>
            </button>
          ))}
        </div>

        <Card hoverable={false} className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-admin-ink">{table?.title ?? def.label}</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={rows.length === 0 || pdfDownload.isPending}
                onClick={() => handleDownload("pdf")}
              >
                <Icon name="download" size={16} /> {pdfDownload.isPending ? "Preparing…" : "PDF"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={rows.length === 0 || excelDownload.isPending}
                onClick={() => handleDownload("excel")}
              >
                <Icon name="download" size={16} /> {excelDownload.isPending ? "Preparing…" : "Excel"}
              </Button>
            </div>
          </div>

          {(def.supports.department || def.supports.dateRange) && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {def.supports.department && (
                <Select
                  className="w-auto"
                  value={filters.department_id ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      department_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                >
                  <option value="">All departments</option>
                  {departments?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
              {def.supports.dateRange && (
                <>
                  <DatePicker
                    value={filters.from ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
                  />
                  <span className="text-sm text-admin-muted">to</span>
                  <DatePicker
                    value={filters.to ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
                  />
                </>
              )}
            </div>
          )}

          <DataTable
            columns={columns}
            rows={keyedRows}
            rowKey={(row) => row.__rowKey as number}
            isLoading={isLoading}
            error={error ? friendlyError(error) : null}
            emptyTitle="No records for this report."
          />
        </Card>
      </div>
    </div>
  );
}
