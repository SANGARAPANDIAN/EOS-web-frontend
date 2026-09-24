"use client";

import { Card, StatCard, EmptyState } from "@/components/ui";
import { SkeletonStatTiles, SkeletonCardGrid } from "@/components/ui/Skeleton";
import { useCanteenDashboard } from "@/modules/canteen-admin/api/dashboard";

function money(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function CanteenAdminDashboardPage() {
  const { data, isLoading, error } = useCanteenDashboard();

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Canteen Dashboard</h1>
        <p className="mt-1.5 text-[14px] font-medium text-muted">{dateStr} · Today&apos;s sales</p>
      </div>

      {isLoading && !data && (
        <div className="flex flex-col gap-5">
          <SkeletonStatTiles count={3} />
          <SkeletonCardGrid count={1} columns={1} />
        </div>
      )}

      {error && !isLoading && (
        <Card>
          <EmptyState message={error instanceof Error ? error.message : "Could not load today's sales."} />
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Sales Today" value={money(data.today_total_sales)} icon="payments" />
            <StatCard
              label="Cash Sales"
              value={money(data.cash_sales.amount)}
              icon="account_balance_wallet"
              sub={`${data.cash_sales.orders} order${data.cash_sales.orders === 1 ? "" : "s"}`}
            />
            <StatCard
              label="UPI Sales"
              value={money(data.upi_sales.amount)}
              icon="qr_code_2"
              sub={`${data.upi_sales.orders} order${data.upi_sales.orders === 1 ? "" : "s"}`}
            />
          </div>

          <Card>
            <h2 className="text-[15px] font-bold text-ink">Sales by Category</h2>
            {data.sales_by_category.length === 0 ? (
              <EmptyState message="No sales recorded yet today." />
            ) : (
              <div className="mt-3 flex flex-col divide-y divide-border-default">
                {data.sales_by_category
                  .slice()
                  .sort((a, b) => b.amount - a.amount)
                  .map((row) => (
                    <div key={row.category} className="flex items-center justify-between py-2.5">
                      <div className="text-[13.5px] font-semibold text-ink">{row.category}</div>
                      <div className="flex items-center gap-4">
                        <span className="text-[12.5px] text-muted">
                          {row.orders} order{row.orders === 1 ? "" : "s"}
                        </span>
                        <span className="text-[13.5px] font-bold text-ink">{money(row.amount)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
