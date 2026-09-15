"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeeOverview, useFeeBatches, useFeeStudents, groupFeeStudents, num } from "@/modules/finance/api/fees";
import { money, moneyCompact, statusLabel, formatDate } from "@/modules/finance/api/finance";
import {
  BLUE,
  GREY,
  cardSx,
  monoSx,
  panelTitleSx,
  selectSx,
  PageHead,
  StatCard,
  Panel,
  Chip,
  Empty,
  Donut,
  BarChart,
  RankedBars,
  Funnel,
} from "@/modules/finance/ui";
import { FinanceIcon } from "@/modules/finance/icons";

// The institution's fee position, for Finance.
//
// Every figure comes from GET /finance-overview — the same real endpoint the
// Billing portal's own overview reads. Finance has read-only access to it, so
// this screen can never alter a payment or a demand. Nothing here is sampled.

export default function FinanceFeesOverviewPage() {
  const router = useRouter();
  const [batch, setBatch] = useState("");
  const { data: batches } = useFeeBatches();
  const { data, isLoading, isError, error } = useFeeOverview(batch || undefined);
  const { data: feeRows } = useFeeStudents();

  if (isLoading) {
    return <div style={{ padding: 70, textAlign: "center", fontSize: 13.1, color: GREY.faint }}>Loading fee position…</div>;
  }
  if (isError) {
    return (
      <div style={cardSx}>
        <h2 style={panelTitleSx}>Couldn&apos;t load the fee overview</h2>
        <p style={{ fontSize: 12.6, color: GREY.muted, marginTop: 8 }}>
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </div>
    );
  }
  if (!data) return null;

  const k = data.executiveKPIs;
  const fa = data.financialAnalytics;
  const oi = data.operationalInsights;

  // Money arrives as decimal strings; parse once here.
  const demand = num(k.totalFeeDemand);
  const collected = num(k.totalCollected);
  const outstanding = num(k.totalOutstanding);
  const collectionPct = k.collectionPercentage;

  // The endpoint reports payment-status counts but no student totals, so the
  // student figures come from the real student list rather than being invented.
  const students = groupFeeStudents(feeRows ?? []);
  const fullyPaid = students.filter((s) => s.due_status === "paid").length;
  const partial = students.filter((s) => s.due_status === "partial").length;
  const notStarted = students.filter((s) => s.due_status === "pending").length;

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return mo ? `${names[Number(mo) - 1] ?? mo} ${(y ?? "").slice(2)}` : m;
  };

  return (
    <div>
      <PageHead
        title="Fees Overview"
        sub="The institution's whole fee position — demand raised, money collected and what is still outstanding"
        right={
          <select value={batch} onChange={(e) => setBatch(e.target.value)} style={selectSx}>
            <option value="">All batches</option>
            {(batches ?? []).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        }
      />

      {/* Headline position */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22 }}>
        <StatCard
          label="Total demand raised"
          value={moneyCompact(demand)}
          icon="ledger"
          hi={String(students.length)}
          sub="students billed"
          pct={100}
          foot={`${k.activeFeeStructures} active fee structures`}
          delay={0}
        />
        <StatCard
          label="Collected"
          value={moneyCompact(collected)}
          icon="wallet"
          hi={`${collectionPct.toFixed(1)}%`}
          sub="collection efficiency"
          pct={collectionPct}
          foot={`${money(collected)} received`}
          delay={55}
        />
        <StatCard
          label="Outstanding"
          value={moneyCompact(outstanding)}
          icon="approve"
          hi={String(partial + notStarted)}
          sub="students still owing"
          pct={demand > 0 ? (outstanding / demand) * 100 : 0}
          foot={`${money(outstanding)} to recover`}
          delay={110}
          onClick={() => router.push("/finance/fees/students")}
        />
        <StatCard
          label="Fully paid"
          value={String(fullyPaid)}
          icon="faculty"
          hi={students.length > 0 ? `${((fullyPaid / students.length) * 100).toFixed(1)}%` : "—"}
          sub="of all students"
          pct={students.length > 0 ? (fullyPaid / students.length) * 100 : 0}
          foot={`${partial} partial · ${notStarted} not started`}
          delay={165}
          onClick={() => router.push("/finance/fees/students")}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: 22, marginTop: 22 }}>
        {/* Collection gauge + the money split */}
        <Panel
          title="Collection against demand"
          action={<Chip variant="soft">{batch || "All batches"}</Chip>}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <Donut pct={collectionPct} label={`${collectionPct.toFixed(0)}%`} caption="collected" />
            <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 13 }}>
              {[
                { label: "Demand raised", value: demand, strong: true },
                { label: "Collected", value: collected, strong: false },
                { label: "Outstanding", value: outstanding, strong: false },
              ].map((r) => (
                <div
                  key={r.label}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, borderBottom: `1px solid ${GREY.rule}`, paddingBottom: 9 }}
                >
                  <span style={{ fontSize: 12.2, color: GREY.muted }}>{r.label}</span>
                  <span style={{ ...monoSx, fontSize: r.strong ? 15 : 13.5, fontWeight: 700, color: r.strong ? BLUE.primary : BLUE.ink }}>
                    {money(r.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Who has paid — a funnel, not five coloured boxes */}
        <Panel
          title="Students by payment status"
          action={
            <span
              data-fin-soft=""
              onClick={() => router.push("/finance/fees/students")}
              style={{ border: 0, background: "transparent", color: BLUE.primary, fontSize: 12.2, fontWeight: 600, cursor: "pointer" }}
            >
              Student list
            </span>
          }
        >
          {fa.paymentStatusDistribution.length === 0 ? (
            <Empty title="No demand raised yet" />
          ) : (
            <Funnel
              steps={fa.paymentStatusDistribution.map((d) => {
                const totalCount = fa.paymentStatusDistribution.reduce((sum, x) => sum + x.count, 0);
                const pct = totalCount > 0 ? (d.count / totalCount) * 100 : 0;
                return {
                  key: d.status,
                  label: `${statusLabel(d.status)} · ${pct.toFixed(0)}%`,
                  value: d.count,
                };
              })}
              onStep={() => router.push("/finance/fees/students")}
            />
          )}
        </Panel>

        {/* Concessions and loan DDs — the two things that move the net figure */}
        <Panel title="Concessions & loan DDs">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                icon: "approve",
                title: "Fee concessions",
                figure: money(num(oi.concessionSummary.total_concession_amount)),
                line: `${oi.concessionSummary.count} sanctioned · ${oi.concessionSummary.unsettled_count} unsettled`,
              },
              {
                icon: "ledger",
                title: "Education loan DDs",
                figure: money(num(oi.educationLoanDDSummary.total_amount)),
                line: `${oi.educationLoanDDSummary.count} recorded · ${k.pendingEducationLoanDD} pending realisation`,
              },
            ].map((r) => (
              <div key={r.title} data-fin-row="" style={{ display: "flex", gap: 12, padding: "10px 8px" }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: BLUE.soft, color: BLUE.primary, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 32px" }}>
                  <FinanceIcon name={r.icon} size={16} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.6, fontWeight: 600, color: BLUE.ink }}>{r.title}</div>
                  <div style={{ ...monoSx, fontSize: 15, fontWeight: 700, color: BLUE.primary, marginTop: 3 }}>
                    {r.figure}
                  </div>
                  <div style={{ fontSize: 11.3, color: GREY.muted, marginTop: 2 }}>{r.line}</div>
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${GREY.rule}`, paddingTop: 12, fontSize: 11.6, color: GREY.muted, lineHeight: 1.6 }}>
              Finance has read-only sight of fee data. Recording payments, issuing receipts and editing demand stay
              with the Billing desk.
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: 22, marginTop: 22 }}>
        {/* Monthly collection */}
        <Panel
          title="Collection trend"
          action={
            <span style={{ fontSize: 11.8, fontWeight: 600, background: BLUE.soft, color: BLUE.strong, borderRadius: 999, padding: "5px 11px" }}>
              {oi.recentPayments.length} recent payments
            </span>
          }
        >
          {fa.monthlyCollectionTrend.length === 0 ? (
            <Empty title="No payments recorded yet" />
          ) : (
            <BarChart
              data={fa.monthlyCollectionTrend.slice(-6).map((m) => ({
                key: m.month,
                label: monthLabel(m.month),
                value: num(m.totalCollected),
              }))}
              format={moneyCompact}
            />
          )}
        </Panel>

        {/* Where the outstanding sits */}
        <Panel title="Outstanding by department">
          {fa.departmentOutstanding.length === 0 ? (
            <Empty title="Nothing outstanding" />
          ) : (
            <RankedBars
              data={fa.departmentOutstanding.slice(0, 6).map((d) => ({
                key: d.department,
                label: d.department,
                value: num(d.totalOutstanding),
                meta: `of ${moneyCompact(num(d.totalDemand))} demand`,
              }))}
              format={moneyCompact}
            />
          )}
        </Panel>

        {/* How students actually pay */}
        <Panel title="Collection by payment mode">
          {fa.collectionByPaymentMode.length === 0 ? (
            <Empty title="No payments recorded yet" />
          ) : (
            <RankedBars
              data={fa.collectionByPaymentMode.map((m) => ({
                key: m.mode,
                label: statusLabel(m.mode),
                value: num(m.totalAmount),
                meta: `${m.count} payment${m.count === 1 ? "" : "s"}`,
              }))}
              format={moneyCompact}
            />
          )}
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
        {/* Demand vs collection per structure */}
        <Panel title="Demand vs collection">
          {demand === 0 ? (
            <Empty title="No fee demand raised yet" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { label: "Collected", value: collected, of: demand },
                { label: "Outstanding", value: outstanding, of: demand },
              ].map((r, i) => {
                const pct = r.of > 0 ? (r.value / r.of) * 100 : 0;
                return (
                  <div key={r.label} className="fin-rise" style={{ animationDelay: `${i * 60}ms` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 7 }}>
                      <span style={{ fontSize: 12.6, fontWeight: 600, color: BLUE.ink }}>{r.label}</span>
                      <span style={{ ...monoSx, fontSize: 12.6, fontWeight: 700, color: GREY.text }}>
                        {money(r.value)}
                        <span style={{ color: GREY.faint, fontWeight: 500 }}> of {moneyCompact(r.of)}</span>
                      </span>
                    </div>
                    <div style={{ height: 9, borderRadius: 999, background: GREY.hair, overflow: "hidden" }}>
                      <div className="fin-slide" style={{ height: "100%", borderRadius: 999, background: BLUE.primary, width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 10.8, color: GREY.faint, marginTop: 5 }}>{pct.toFixed(1)}% of total demand</div>
                  </div>
                );
              })}
              <div style={{ borderTop: `1px solid ${GREY.rule}`, paddingTop: 13, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.2, color: GREY.muted }}>Total demand raised</span>
                <span style={{ ...monoSx, fontSize: 15, fontWeight: 700, color: BLUE.primary }}>{money(demand)}</span>
              </div>
            </div>
          )}
        </Panel>

        {/* Largest balances — the actionable list */}
        <Panel
          title="Largest outstanding balances"
          action={
            <span
              data-fin-soft=""
              onClick={() => router.push("/finance/fees/students")}
              style={{ border: 0, background: "transparent", color: BLUE.primary, fontSize: 12.2, fontWeight: 600, cursor: "pointer" }}
            >
              All students
            </span>
          }
        >
          {oi.topOutstandingStudents.length === 0 ? (
            <Empty title="Nothing outstanding" hint="Every student has cleared their demand." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {oi.topOutstandingStudents.slice(0, 7).map((s) => (
                <div
                  key={s.student_id}
                  data-fin-row=""
                  onClick={() => router.push(`/finance/fees/students/${s.student_id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 9px", borderBottom: `1px solid ${GREY.rule}`, cursor: "pointer" }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.6, fontWeight: 600, color: BLUE.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.student_name ?? "—"}
                    </div>
                    <div style={{ ...monoSx, fontSize: 11.3, color: GREY.muted, marginTop: 2 }}>
                      {s.register_number ?? "—"}
                    </div>
                  </div>
                  <span style={{ ...monoSx, fontSize: 12.6, fontWeight: 700, color: BLUE.primary, whiteSpace: "nowrap" }}>
                    {money(num(s.total_outstanding))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Latest receipts */}
      <div style={{ marginTop: 22 }}>
        <Panel title="Recent payments">
          {oi.recentPayments.length === 0 ? (
            <Empty title="No payments recorded yet" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ background: BLUE.wash }}>
                    {["RECEIPT", "STUDENT", "STUDENT ID", "MODE", "DATE"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>
                        {h}
                      </th>
                    ))}
                    <th style={{ textAlign: "right", padding: "11px 16px", fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>
                      AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {oi.recentPayments.slice(0, 10).map((p) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${GREY.rule}` }}>
                      <td style={{ ...monoSx, padding: "11px 16px", fontSize: 11.8, color: BLUE.strong }}>{p.receipt_no}</td>
                      <td style={{ padding: "11px 16px", fontSize: 12.2, fontWeight: 600, color: BLUE.ink }}>{p.student_name ?? "—"}</td>
                      <td style={{ ...monoSx, padding: "11px 16px", fontSize: 11.8, color: GREY.muted }}>#{p.student_id}</td>
                      <td style={{ padding: "11px 16px", fontSize: 11.8 }}>
                        <Chip variant="outline">{p.payment_mode ? statusLabel(p.payment_mode) : "—"}</Chip>
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 11.8, color: GREY.muted, whiteSpace: "nowrap" }}>{formatDate(p.payment_date)}</td>
                      <td style={{ ...monoSx, padding: "11px 16px", textAlign: "right", fontSize: 12.6, fontWeight: 700, color: BLUE.primary }}>
                        {money(num(p.amount_paid))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
