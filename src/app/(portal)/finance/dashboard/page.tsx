"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFinanceDashboard, money, moneyCompact, formatDateTime } from "@/modules/finance/api/finance";
import {
  BLUE,
  GREY,
  cardSx,
  monoSx,
  panelTitleSx,
  primaryBtnSx,
  softBtnSx,
  StatCard,
  ActionCard,
  Panel,
  Chip,
  Empty,
  Donut,
  BarChart,
  RankedBars,
  Funnel,
} from "@/modules/finance/ui";
import { FinanceIcon } from "@/modules/finance/icons";
import { SkeletonStatTiles, SkeletonCardGrid } from "@/components/ui";

// Every figure comes from GET /finance/dashboard, derived from real rows.
// Presentation follows the Secretary dashboard exactly: same card, same type
// scale, same 22px gutters, and a single blue hue throughout — state is shown
// by fill and weight rather than by red/amber/green.

export default function FinanceDashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useFinanceDashboard();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <SkeletonStatTiles count={4} />
        <SkeletonCardGrid count={6} columns={3} />
        <SkeletonCardGrid count={3} columns={3} />
      </div>
    );
  }
  if (isError) {
    return (
      <div style={cardSx}>
        <h2 style={panelTitleSx}>Couldn&apos;t load the dashboard</h2>
        <p style={{ fontSize: 12.6, color: GREY.muted, marginTop: 8 }}>
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </div>
    );
  }
  if (!data) return null;

  const { fund, fund_years, queues, delivery, spend, recent_movements, top_departments } = data;
  const actionable = queues.pop_pending + queues.sop_pending + delivery.pending_allotment;

  const stats = [
    {
      label: "Total fund",
      value: fund ? moneyCompact(fund.total_amount) : "Not set",
      icon: "wallet",
      // The total spans every fund year, so say how many it covers rather than
      // implying it belongs to a single year.
      hi: fund ? (fund.year_count > 1 ? `${fund.year_count} years` : fund.academic_year ?? "—") : "—",
      sub: fund ? "combined" : "set it to begin",
      pct: 100,
      foot: fund ? `${money(fund.total_amount)} sanctioned in total` : "No fund created yet",
      href: "/finance/overview",
    },
    {
      label: "Available now",
      value: fund ? moneyCompact(fund.available_amount) : "—",
      icon: "overview",
      hi: fund ? `${(100 - fund.utilisation_pct).toFixed(1)}%` : "—",
      sub: "of the fund unspent",
      pct: fund ? 100 - fund.utilisation_pct : 0,
      foot: fund ? `${money(fund.committed_amount)} already committed` : "—",
      href: "/finance/overview",
    },
    {
      label: "Awaiting decision",
      value: String(queues.pop_pending + queues.sop_pending),
      icon: "approve",
      hi: String(queues.pop_pending),
      sub: `POP · ${queues.sop_pending} SOP`,
      pct:
        queues.pop_pending + queues.sop_pending + queues.pop_approved + queues.sop_approved > 0
          ? ((queues.pop_pending + queues.sop_pending) /
              (queues.pop_pending + queues.sop_pending + queues.pop_approved + queues.sop_approved)) *
            100
          : 0,
      foot: `${queues.pop_approved + queues.sop_approved} approved · ${queues.rejected} rejected`,
      href: "/finance/pop-approval",
    },
    {
      label: "Pending allotment",
      value: String(delivery.pending_allotment),
      icon: "faculty",
      hi: String(delivery.delivered),
      sub: "delivered in total",
      pct: delivery.delivered > 0 ? (delivery.pending_allotment / delivery.delivered) * 100 : 0,
      foot: `${delivery.in_transit} in flight · ${delivery.awaiting_dispatch} not dispatched`,
      href: "/finance/pop-tracking",
    },
  ];

  // Each card carries its own real figure and a share bar, so the grid is a
  // set of small visualisations rather than a list of links.
  const totalProposals =
    queues.pop_pending + queues.sop_pending + queues.pop_approved + queues.sop_approved + queues.rejected;
  const trackedTotal =
    delivery.awaiting_dispatch + delivery.in_transit + delivery.delivered + delivery.cancelled;

  const actions = [
    {
      label: fund ? "Fund & ledger" : "Set total amount",
      metric: fund ? moneyCompact(fund.available_amount) : "Not set",
      metricCaption: fund ? "available" : undefined,
      hint: fund ? `${fund.utilisation_pct}% of ${moneyCompact(fund.total_amount)} committed` : "Create the fund to begin",
      icon: "wallet",
      share: fund ? 100 - fund.utilisation_pct : 0,
      urgent: !fund,
      href: "/finance/overview",
    },
    {
      label: "POP approval",
      metric: String(queues.pop_pending),
      metricCaption: "waiting",
      hint: `${queues.pop_approved} approved · ${totalProposals} total`,
      icon: "approve",
      share: totalProposals > 0 ? (queues.pop_pending / totalProposals) * 100 : 0,
      urgent: queues.pop_pending > 0,
      href: "/finance/pop-approval",
    },
    {
      label: "SOP approval",
      metric: String(queues.sop_pending),
      metricCaption: "waiting",
      hint: `${queues.sop_approved} approved · service orders`,
      icon: "service",
      share: totalProposals > 0 ? (queues.sop_pending / totalProposals) * 100 : 0,
      urgent: queues.sop_pending > 0,
      href: "/finance/sop-approval",
    },
    {
      label: "POP tracking",
      metric: String(delivery.in_transit),
      metricCaption: "in flight",
      hint: `${delivery.delivered} delivered · ${delivery.awaiting_dispatch} not dispatched`,
      icon: "truck",
      share: trackedTotal > 0 ? (delivery.in_transit / trackedTotal) * 100 : 0,
      href: "/finance/pop-tracking",
    },
    {
      label: "Faculty allotment",
      metric: String(delivery.pending_allotment),
      metricCaption: "to hand over",
      hint: delivery.pending_allotment > 0 ? "Delivered but not allotted" : "Everything delivered is allotted",
      icon: "faculty",
      share: delivery.delivered > 0 ? (delivery.pending_allotment / delivery.delivered) * 100 : 0,
      urgent: delivery.pending_allotment > 0,
      href: "/finance/pop-tracking",
    },
    {
      label: "Committed this year",
      metric: moneyCompact(spend.committed_this_year),
      metricCaption: "outflow",
      hint: `${money(spend.last_30_days)} in the last 30 days`,
      icon: "ledger",
      share: fund && fund.total_amount > 0 ? (spend.committed_this_year / fund.total_amount) * 100 : 0,
      href: "/finance/overview",
    },
  ];

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(mo) - 1] ?? mo} ${y.slice(2)}`;
  };

  return (
    <div>
      <div>
        <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>{greeting}</h1>
        <p style={{ margin: "9px 0 0", fontSize: 13.5, color: GREY.muted }}>
          {actionable > 0
            ? `${actionable} item${actionable === 1 ? "" : "s"} on your desk`
            : "Nothing is waiting on you"}{" "}
          · live from EOSbackend1
        </p>
      </div>

      {!fund && (
        <div data-fin-lift="" style={{ ...cardSx, marginTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div>
            <h2 style={panelTitleSx}>No finance fund has been set up</h2>
            <p style={{ fontSize: 12.6, color: GREY.muted, margin: "6px 0 0" }}>
              Approvals are paid out of the fund, so nothing can be approved until a total amount exists.
            </p>
          </div>
          <button onClick={() => router.push("/finance/overview")} style={{ ...primaryBtnSx, fontSize: 12.6, padding: "12px 20px" }}>
            Set total amount
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22, marginTop: 26 }}>
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 55} onClick={() => router.push(s.href)} />
        ))}
      </div>

      {/* Each card is both a summary and the way in to that area. */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={panelTitleSx}>Where things stand</h2>
          <span style={{ fontSize: 11.8, color: GREY.faint }}>Select a card to open that area</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(216px, 1fr))", gap: 14 }}>
          {actions.map((a, i) => (
            <ActionCard
              key={a.label}
              label={a.label}
              metric={a.metric}
              metricCaption={a.metricCaption}
              hint={a.hint}
              icon={a.icon}
              share={a.share}
              urgent={a.urgent}
              delay={i * 45}
              onClick={() => router.push(a.href)}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: 22, marginTop: 22 }}>
        {/* Fund utilisation gauge — across every year, with the per-year
            breakdown underneath so no year's money is hidden. */}
        <Panel
          title={fund && fund.year_count > 1 ? "Fund utilisation · all years" : "Fund utilisation"}
          action={
            fund ? (
              <Chip variant="soft">
                {fund.year_count > 1 ? `${fund.year_count} fund years` : fund.academic_year}
              </Chip>
            ) : undefined
          }
        >
          {!fund ? (
            <Empty title="No fund yet" hint="Set a total amount to see utilisation." />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
              <Donut pct={fund.utilisation_pct} label={`${fund.utilisation_pct}%`} caption="committed" />
              <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Total", value: fund.total_amount, strong: true },
                  { label: "Committed", value: fund.committed_amount, strong: false },
                  { label: "Available", value: fund.available_amount, strong: false },
                ].map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, borderBottom: `1px solid ${GREY.rule}`, paddingBottom: 9 }}>
                    <span style={{ fontSize: 12.2, color: GREY.muted, fontWeight: 500 }}>{r.label}</span>
                    <span style={{ ...monoSx, fontSize: r.strong ? 15 : 13.5, fontWeight: 700, color: r.strong ? BLUE.primary : BLUE.ink }}>
                      {money(r.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Every fund year listed explicitly — a second year's money must
              never be invisible just because it is not the current one. */}
          {fund_years.length > 1 && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${GREY.rule}`, paddingTop: 14 }}>
              <div style={{ fontSize: 10.8, fontWeight: 600, color: GREY.faint, letterSpacing: 0.3, marginBottom: 10 }}>
                BY FUND YEAR
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {fund_years.map((y) => (
                  <div
                    key={y.id}
                    data-fin-row=""
                    onClick={() => router.push("/finance/overview")}
                    style={{ cursor: "pointer", padding: "6px 8px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 5 }}>
                      <span style={{ ...monoSx, fontSize: 12.2, fontWeight: 600, color: BLUE.ink }}>
                        {y.academic_year}
                        {y.is_locked && (
                          <span style={{ fontFamily: "inherit", color: GREY.faint, fontWeight: 500 }}> · locked</span>
                        )}
                      </span>
                      <span style={{ ...monoSx, fontSize: 12.2, fontWeight: 700, color: GREY.text }}>
                        {money(y.available_amount)}
                        <span style={{ color: GREY.faint, fontWeight: 500 }}> of {money(y.total_amount)}</span>
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: GREY.hair, overflow: "hidden" }}>
                      <div
                        className="fin-slide"
                        style={{ height: "100%", borderRadius: 999, background: BLUE.primary, width: `${Math.min(100, y.utilisation_pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Delivery funnel */}
        <Panel
          title="Delivery pipeline"
          action={
            <span data-fin-soft="" onClick={() => router.push("/finance/pop-tracking")} style={{ ...softBtnSx, border: 0, background: "transparent", color: BLUE.primary, fontSize: 12.2, padding: 0 }}>
              Detail
            </span>
          }
        >
          <Funnel
            steps={[
              { key: "awaiting", label: "Awaiting dispatch", value: delivery.awaiting_dispatch },
              { key: "transit", label: "In flight", value: delivery.in_transit },
              { key: "delivered", label: "Delivered", value: delivery.delivered },
              { key: "allot", label: "Pending allotment", value: delivery.pending_allotment },
              { key: "cancelled", label: "Cancelled", value: delivery.cancelled },
            ]}
            onStep={() => router.push("/finance/pop-tracking")}
          />
        </Panel>

        {/* Approval mix */}
        <Panel title="Approval summary">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { label: "POP pending", value: queues.pop_pending, href: "/finance/pop-approval" },
              { label: "SOP pending", value: queues.sop_pending, href: "/finance/sop-approval" },
              { label: "POP approved", value: queues.pop_approved, href: "/finance/pop-approval" },
              { label: "SOP approved", value: queues.sop_approved, href: "/finance/sop-approval" },
              { label: "Rejected", value: queues.rejected, href: "/finance/pop-approval" },
            ].map((r) => (
              <div
                key={r.label}
                data-fin-row=""
                onClick={() => router.push(r.href)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 10px", borderBottom: `1px solid ${GREY.rule}`, cursor: "pointer" }}
              >
                <span style={{ fontSize: 12.6, fontWeight: 500, color: GREY.text }}>{r.label}</span>
                <Chip variant={r.value > 0 ? "soft" : "quiet"}>{r.value}</Chip>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: 22, marginTop: 22 }}>
        {/* Monthly committed spend */}
        <Panel
          title="Committed spend"
          action={
            <span style={{ fontSize: 11.8, fontWeight: 600, background: BLUE.soft, color: BLUE.strong, borderRadius: 999, padding: "5px 11px" }}>
              {money(spend.last_30_days)} in 30 days
            </span>
          }
        >
          {spend.by_month.length === 0 ? (
            <Empty title="No spend recorded yet" hint="Approving a POP or SOP will appear here." />
          ) : (
            <BarChart
              data={spend.by_month.map((m) => ({ key: m.month, label: monthLabel(m.month), value: m.amount }))}
              format={moneyCompact}
            />
          )}
        </Panel>

        {/* Departments */}
        <Panel title="Top departments">
          {top_departments.length === 0 ? (
            <Empty title="Nothing committed yet" />
          ) : (
            <RankedBars
              data={top_departments.map((d) => ({
                key: d.department,
                label: d.department,
                value: d.amount,
                meta: `${d.orders} order${d.orders === 1 ? "" : "s"}`,
              }))}
              format={moneyCompact}
            />
          )}
        </Panel>

        {/* Ledger tail */}
        <Panel
          title="Recent movements"
          action={
            <span data-fin-soft="" onClick={() => router.push("/finance/overview")} style={{ border: 0, background: "transparent", color: BLUE.primary, fontSize: 12.2, fontWeight: 600, cursor: "pointer" }}>
              Ledger
            </span>
          }
        >
          {recent_movements.length === 0 ? (
            <Empty title="No movements yet" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recent_movements.slice(0, 6).map((m) => {
                const outflow = m.entry_type === "debit" || m.entry_type === "adjustment_decrease";
                return (
                  <div key={m.id} data-fin-row="" style={{ display: "flex", gap: 11, padding: "11px 10px", borderBottom: `1px solid ${GREY.rule}` }}>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: BLUE.soft,
                        color: BLUE.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 26px",
                        marginTop: 1,
                      }}
                    >
                      <FinanceIcon name={outflow ? "ledger" : "overview"} size={13} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 12.2, fontWeight: 600, color: BLUE.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.narration}
                        </span>
                        <span style={{ ...monoSx, fontSize: 12.2, fontWeight: 700, color: outflow ? BLUE.ink : BLUE.primary, whiteSpace: "nowrap" }}>
                          {outflow ? "−" : "+"}
                          {moneyCompact(m.amount)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: GREY.faint, marginTop: 2 }}>{formatDateTime(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
