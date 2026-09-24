"use client";

import { useState } from "react";
import { PageHeader, Button, Input, KpiCard, SectionCard, HorizontalBarChart, useToast } from "@/modules/admin/components/ui";
import { Icon } from "@/components/ui/Icon";
import { SkeletonStatTiles, SkeletonBlock } from "@/components/ui";
import { useStationeryReports, fetchStationeryReportsForRange, type StationeryReports } from "@/modules/stationery-store/api/reports";
import { CATEGORY_NAME, type StationeryCategory } from "@/modules/stationery-store/api/products";
import { downloadCsv, type CsvColumn } from "@/lib/utils/csv";
import { friendlyError } from "@/lib/utils/errors";
import { ApiError } from "@/types/api";

interface CsvRow {
  section: string;
  label: string;
  value: string | number;
}

const CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { header: "Section", value: (r) => r.section },
  { header: "Label", value: (r) => r.label },
  { header: "Value", value: (r) => r.value },
];

function buildCsvRows(data: StationeryReports): CsvRow[] {
  return [
    { section: "Metrics", label: "Total sales", value: data.metrics.total_sales },
    { section: "Metrics", label: "Total orders", value: data.metrics.total_orders },
    { section: "Metrics", label: "Completed", value: data.metrics.completed },
    { section: "Metrics", label: "Cancelled", value: data.metrics.cancelled },
    ...data.top_products.map((p) => ({ section: "Most purchased products", label: p.name, value: p.units })),
    ...data.category_sales.map((c) => ({
      section: "Category-wise sales",
      label: CATEGORY_NAME[c.category as StationeryCategory] ?? c.category,
      value: c.amount,
    })),
  ];
}

export default function StationeryReportsPage() {
  const { data, isLoading, error } = useStationeryReports();
  const { show } = useToast();

  // Date range affects the CSV export alone - the KPIs/charts below stay
  // all-time always, per explicit decision. Left empty, "Export CSV"
  // exports the same all-time totals shown on screen.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);

  const errorMessage = error instanceof ApiError ? error.message : error ? "Failed to load reports." : null;

  function handleExportCsv() {
    if (fromDate && toDate) {
      setExporting(true);
      fetchStationeryReportsForRange(fromDate, toDate)
        .then((rangeData) => downloadCsv(`stationery-store-report-${fromDate}-to-${toDate}`, CSV_COLUMNS, buildCsvRows(rangeData)))
        .catch((err: unknown) => show(friendlyError(err), "error"))
        .finally(() => setExporting(false));
      return;
    }
    if (!data) return;
    downloadCsv(`stationery-store-report-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, buildCsvRows(data));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Reports" description="All-time sales and inventory summary for the Stationery Store" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-admin-muted">From date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-auto" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-admin-muted">To date</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-auto" />
          </div>
          <Button variant="secondary" onClick={handleExportCsv} disabled={(!data && !(fromDate && toDate)) || exporting}>
            <Icon name="download" size={16} /> {exporting ? "Exporting…" : fromDate && toDate ? "Export CSV for range" : "Export CSV"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <>
          <SkeletonStatTiles count={4} className="sm:grid-cols-2 lg:grid-cols-4" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
        </>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total sales" icon="payments" value={`₹${data.metrics.total_sales}`} />
              <KpiCard label="Total orders" icon="receipt_long" value={data.metrics.total_orders} />
              <KpiCard label="Completed" icon="task_alt" value={data.metrics.completed} />
              <KpiCard label="Cancelled" icon="cancel" value={data.metrics.cancelled} />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <SectionCard title="Most purchased products">
                {data.top_products.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {data.top_products.map((p) => (
                      <div key={p.name} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-admin-ink">{p.name}</span>
                        <span className="shrink-0 text-xs text-admin-muted">{p.units} sold</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-admin-subtle">No sales yet.</p>
                )}
              </SectionCard>

              <SectionCard title="Category-wise sales">
                {data.category_sales.length > 0 ? (
                  <HorizontalBarChart
                    data={data.category_sales.map((c) => ({
                      label: CATEGORY_NAME[c.category as StationeryCategory] ?? c.category,
                      value: c.amount,
                    }))}
                  />
                ) : (
                  <p className="text-[12.5px] text-admin-subtle">No sales yet.</p>
                )}
              </SectionCard>
            </div>
          </>
        )
      )}
    </div>
  );
}
