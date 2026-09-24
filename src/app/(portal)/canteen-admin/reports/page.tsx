"use client";

import { useState } from "react";
import { Card, StatCard, SegmentedTabs, DataTable, EmptyState } from "@/components/ui";
import { SkeletonStatTiles, SkeletonTable } from "@/components/ui/Skeleton";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { HoverDownloadButton } from "@/components/ui/HoverDownloadButton";
import { exportToPdf } from "@/lib/utils/pdf-export";
import { useBillingDetailsReport, useAnalyticsReport, type CashierPerformanceRow, type RecentBillRow } from "@/modules/canteen-admin/api/reports";

type ReportTab = "billing" | "analytics";

function money(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CanteenReportsPage() {
  const [tab, setTab] = useState<ReportTab>("billing");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hoverCashier, setHoverCashier] = useState(false);
  const [hoverCategory, setHoverCategory] = useState(false);
  const [hoverBills, setHoverBills] = useState(false);
  const [hoverDaily, setHoverDaily] = useState(false);
  const range = { from: from || undefined, to: to || undefined };
  const rangeSubtitle = from || to ? `${from || "start"} – ${to || "today"}` : "All time";

  const billing = useBillingDetailsReport(range);
  const analytics = useAnalyticsReport(range);

  async function downloadCashierPerformance() {
    if (!billing.data) return;
    await exportToPdf({
      title: "Cashier Performance",
      subtitle: "Canteen billing",
      meta: [["Period", rangeSubtitle]],
      sections: [
        {
          type: "table",
          columns: [
            { header: "Cashier", key: "cashier" },
            { header: "Bills", key: "bills" },
            { header: "Cash", key: "cash" },
            { header: "UPI", key: "upi" },
            { header: "Total", key: "total" },
          ],
          rows: billing.data.cashier_performance.map((r) => ({
            cashier: r.cashier,
            bills: r.bills,
            cash: money(r.cash),
            upi: money(r.upi),
            total: money(r.total),
          })),
        },
      ],
      filename: `cashier-performance-${from || "all"}_${to || "all"}.pdf`,
      footerBrand: true,
    });
  }

  async function downloadSalesByCategory() {
    if (!billing.data) return;
    await exportToPdf({
      title: "Sales by Category",
      subtitle: "Canteen billing",
      meta: [["Period", rangeSubtitle]],
      sections: [
        {
          type: "table",
          columns: [
            { header: "Category", key: "category" },
            { header: "Quantity sold", key: "quantity" },
            { header: "Amount", key: "amount" },
          ],
          rows: billing.data.sales_by_category.map((r) => ({
            category: r.category,
            quantity: r.quantity,
            amount: money(r.amount),
          })),
        },
      ],
      filename: `sales-by-category-${from || "all"}_${to || "all"}.pdf`,
      footerBrand: true,
    });
  }

  async function downloadRecentBills() {
    if (!billing.data) return;
    await exportToPdf({
      title: "Recent Bills",
      subtitle: "Canteen billing",
      meta: [["Period", rangeSubtitle]],
      sections: [
        {
          type: "table",
          columns: [
            { header: "Time", key: "time" },
            { header: "Cashier", key: "cashier" },
            { header: "Items", key: "items" },
            { header: "Payment", key: "payment" },
            { header: "Amount", key: "amount" },
          ],
          rows: billing.data.recent_bills.map((r) => ({
            time: formatDateTime(r.date_time),
            cashier: r.cashier,
            items: r.items.length ? r.items.join(", ") : "—",
            payment: r.payment.toUpperCase(),
            amount: money(r.amount),
          })),
        },
      ],
      filename: `recent-bills-${from || "all"}_${to || "all"}.pdf`,
      footerBrand: true,
    });
  }

  async function downloadDailySalesSummary() {
    if (!analytics.data) return;
    await exportToPdf({
      title: "Daily Sales Summary",
      subtitle: "Canteen analytics",
      meta: [["Period", rangeSubtitle]],
      sections: [
        {
          type: "table",
          columns: [
            { header: "Date", key: "date" },
            { header: "Sales", key: "sales" },
          ],
          rows: analytics.data.daily_sales_summary.map((r) => ({
            date: formatDate(r.date),
            sales: money(r.sales),
          })),
        },
      ],
      filename: `daily-sales-summary-${from || "all"}_${to || "all"}.pdf`,
      footerBrand: true,
    });
  }

  const cashierColumns = [
    { key: "cashier", header: "Cashier", width: "1.5fr", render: (row: CashierPerformanceRow) => row.cashier },
    { key: "bills", header: "Bills", width: "0.8fr", render: (row: CashierPerformanceRow) => row.bills },
    { key: "cash", header: "Cash", width: "1fr", render: (row: CashierPerformanceRow) => money(row.cash) },
    { key: "upi", header: "UPI", width: "1fr", render: (row: CashierPerformanceRow) => money(row.upi) },
    { key: "total", header: "Total", width: "1fr", render: (row: CashierPerformanceRow) => money(row.total), sortValue: (row: CashierPerformanceRow) => row.total },
  ];

  const billColumns = [
    { key: "date_time", header: "Time", width: "1fr", render: (row: RecentBillRow) => formatDateTime(row.date_time) },
    { key: "cashier", header: "Cashier", width: "1.3fr", render: (row: RecentBillRow) => row.cashier },
    { key: "items", header: "Items", width: "2fr", render: (row: RecentBillRow) => (row.items.length ? row.items.join(", ") : "—") },
    { key: "payment", header: "Payment", width: "0.8fr", render: (row: RecentBillRow) => row.payment.toUpperCase() },
    { key: "amount", header: "Amount", width: "0.9fr", render: (row: RecentBillRow) => money(row.amount), sortValue: (row: RecentBillRow) => row.amount },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Reports</h1>
        <p className="mt-1.5 text-[14px] font-medium text-muted">Billing performance and canteen profitability.</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <SegmentedTabs
          options={[
            { key: "billing", label: "Billing Details" },
            { key: "analytics", label: "Reports & Analytics" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { setFrom(""); setTo(""); }} />
      </div>

      {tab === "billing" &&
        (billing.error ? (
          <Card>
            <EmptyState message={billing.error instanceof Error ? billing.error.message : "Could not load billing details."} />
          </Card>
        ) : billing.isLoading && !billing.data ? (
          <div className="flex flex-col gap-5">
            <SkeletonStatTiles count={3} />
            <SkeletonTable rows={5} />
          </div>
        ) : (
          billing.data && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total Bills" value={billing.data.summary.total_bills} icon="receipt_long" />
                <StatCard label="Cash Collected" value={money(billing.data.summary.cash_amount)} icon="payments" />
                <StatCard label="UPI Collected" value={money(billing.data.summary.upi_amount)} icon="qr_code_2" />
              </div>

              <Card
                className="relative p-0"
                onMouseEnter={() => setHoverCashier(true)}
                onMouseLeave={() => setHoverCashier(false)}
              >
                <HoverDownloadButton visible={hoverCashier} onDownload={downloadCashierPerformance} title="Download cashier performance report" />
                <div className="p-4 pb-0">
                  <h2 className="text-[15px] font-bold text-ink">Cashier Performance</h2>
                </div>
                <DataTable columns={cashierColumns} data={billing.data.cashier_performance} rowKey={(row) => row.cashier} emptyMessage="No bills recorded in this range." />
              </Card>

              {billing.data.sales_by_category.length > 0 && (
                <Card
                  className="relative"
                  onMouseEnter={() => setHoverCategory(true)}
                  onMouseLeave={() => setHoverCategory(false)}
                >
                  <HoverDownloadButton visible={hoverCategory} onDownload={downloadSalesByCategory} title="Download sales by category report" />
                  <h2 className="text-[15px] font-bold text-ink">Sales by Category</h2>
                  <div className="mt-3 flex flex-col divide-y divide-border-default">
                    {billing.data.sales_by_category.map((row) => (
                      <div key={row.category} className="flex items-center justify-between py-2.5 text-[13.5px]">
                        <span className="font-semibold text-ink">{row.category}</span>
                        <span className="text-muted">
                          {row.quantity} sold · <span className="font-bold text-ink">{money(row.amount)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card
                className="relative p-0"
                onMouseEnter={() => setHoverBills(true)}
                onMouseLeave={() => setHoverBills(false)}
              >
                <HoverDownloadButton visible={hoverBills} onDownload={downloadRecentBills} title="Download recent bills report" />
                <div className="p-4 pb-0">
                  <h2 className="text-[15px] font-bold text-ink">Recent Bills</h2>
                </div>
                <DataTable columns={billColumns} data={billing.data.recent_bills} rowKey={(row) => row.id} emptyMessage="No bills recorded in this range." />
              </Card>
            </>
          )
        ))}

      {tab === "analytics" &&
        (analytics.error ? (
          <Card>
            <EmptyState message={analytics.error instanceof Error ? analytics.error.message : "Could not load analytics."} />
          </Card>
        ) : analytics.isLoading && !analytics.data ? (
          <div className="flex flex-col gap-5">
            <SkeletonStatTiles count={3} />
          </div>
        ) : (
          analytics.data && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total Sales" value={money(analytics.data.total_sales)} icon="trending_up" />
                <StatCard label="Total Expenses" value={money(analytics.data.total_expenses)} icon="trending_down" />
                <StatCard
                  label="Net Profit"
                  value={money(analytics.data.net_profit)}
                  icon="account_balance"
                  accent={analytics.data.net_profit >= 0}
                />
              </div>

              <Card
                className="relative"
                onMouseEnter={() => setHoverDaily(true)}
                onMouseLeave={() => setHoverDaily(false)}
              >
                <HoverDownloadButton visible={hoverDaily} onDownload={downloadDailySalesSummary} title="Download daily sales summary report" />
                <h2 className="text-[15px] font-bold text-ink">Daily Sales Summary</h2>
                {analytics.data.daily_sales_summary.length === 0 ? (
                  <EmptyState message="No sales recorded in this range." />
                ) : (
                  <div className="mt-3 flex flex-col divide-y divide-border-default">
                    {analytics.data.daily_sales_summary.map((row) => (
                      <div key={row.date} className="flex items-center justify-between py-2.5 text-[13.5px]">
                        <span className="font-semibold text-ink">{formatDate(row.date)}</span>
                        <span className="font-bold text-ink">{money(row.sales)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )
        ))}
    </div>
  );
}
