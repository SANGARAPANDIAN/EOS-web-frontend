"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFeeStudentWorkspace, useFeeCategoryBreakdown, num } from "@/modules/finance/api/fees";
import { money, moneyCompact, statusLabel, formatDate } from "@/modules/finance/api/finance";
import {
  BLUE,
  GREY,
  cardSx,
  monoSx,
  panelTitleSx,
  softBtnSx,
  StatCard,
  Panel,
  Chip,
  Empty,
  Donut,
  Meter,
} from "@/modules/finance/ui";
import { FinanceIcon } from "@/modules/finance/icons";

// One student's fee position, from GET /fee-payments/students/:id/workspace.
//
// Deliberately limited to identity + fee information: Finance reviews money,
// so nothing academic (marks, attendance, personal records) is shown even
// though the student has it. Read-only — there is no action here that can
// change a payment.

export default function FinanceFeeStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params?.id);
  const { data: ws, isLoading, isError, error } = useFeeStudentWorkspace(
    Number.isFinite(studentId) ? studentId : null,
  );

  const [openMapping, setOpenMapping] = useState<number | null>(null);
  const { data: breakdown } = useFeeCategoryBreakdown(openMapping);

  // Straight from the server's own fee_summary rather than re-added here, so
  // the page can never disagree with the backend about what a student owes.
  const totals = useMemo(() => {
    const fs = ws?.fee_summary;
    const concession = (ws?.fee_concessions ?? []).reduce((sum, c) => sum + num(c.amount), 0);
    return {
      demand: num(fs?.total_demand),
      paid: num(fs?.total_paid),
      outstanding: num(fs?.total_outstanding),
      concession,
    };
  }, [ws]);

  if (isLoading) {
    return <div style={{ padding: 70, textAlign: "center", fontSize: 13.1, color: GREY.faint }}>Loading student…</div>;
  }
  if (isError || !ws) {
    return (
      <div style={cardSx}>
        <h2 style={panelTitleSx}>Couldn&apos;t load this student</h2>
        <p style={{ fontSize: 12.6, color: GREY.muted, marginTop: 8 }}>
          {error instanceof Error ? error.message : "Please try again."}
        </p>
        <button onClick={() => router.push("/finance/fees/students")} style={{ ...softBtnSx, marginTop: 14 }}>
          Back to students
        </button>
      </div>
    );
  }

  const p = ws.student_profile;
  const collectedPct = totals.demand > 0 ? (totals.paid / totals.demand) * 100 : 0;

  return (
    <div>
      {/* Identity header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: GREY.muted, marginBottom: 16 }}>
        <button onClick={() => router.push("/finance/fees/students")} style={softBtnSx}>
          ← Back to students
        </button>
        <span style={{ color: GREY.border }}>›</span>
        <span style={monoSx}>{p.register_number ?? p.student_id_no ?? p.student_id}</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 26, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ width: 58, height: 58, borderRadius: 14, background: BLUE.soft, color: BLUE.strong, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 58px" }}>
            <FinanceIcon name="faculty" size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.7 }}>
              {p.student_name ?? "—"}
            </h1>
            <div style={{ ...monoSx, fontSize: 12.6, color: GREY.muted, marginTop: 5 }}>
              {p.register_number ?? "—"}
            </div>
            <div style={{ fontSize: 12.6, color: GREY.text, marginTop: 5 }}>
              {p.programme ?? "—"} · {p.department ?? "—"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
              {p.batch && <Chip variant="soft">{p.batch}</Chip>}
              {p.quota && <Chip variant="outline">{p.quota}</Chip>}
              {p.roll_no && <Chip variant="quiet">Roll {p.roll_no}</Chip>}
            </div>
          </div>
        </div>
        <Chip variant={totals.outstanding > 0 ? "solid" : "outline"}>
          {totals.outstanding > 0 ? `${money(totals.outstanding)} outstanding` : "Fully paid"}
        </Chip>
      </div>

      {/* Fee position */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22 }}>
        <StatCard label="Total demand" value={moneyCompact(totals.demand)} icon="ledger" hi={String(ws.demand_summary.length)} sub={`structure${ws.demand_summary.length === 1 ? "" : "s"}`} pct={100} foot={money(totals.demand)} delay={0} />
        <StatCard label="Paid" value={moneyCompact(totals.paid)} icon="wallet" hi={`${collectedPct.toFixed(1)}%`} sub="of demand" pct={collectedPct} foot={`${ws.payment_summary.payment_count} payment${ws.payment_summary.payment_count === 1 ? "" : "s"}`} delay={55} />
        <StatCard label="Outstanding" value={moneyCompact(totals.outstanding)} icon="approve" hi={totals.outstanding > 0 ? "Due" : "Clear"} sub="" pct={totals.demand > 0 ? (totals.outstanding / totals.demand) * 100 : 0} foot={money(totals.outstanding)} delay={110} />
        <StatCard label="Concessions" value={moneyCompact(totals.concession)} icon="approve" hi={String(ws.fee_concessions.length)} sub="sanctioned" pct={totals.demand > 0 ? (totals.concession / totals.demand) * 100 : 0} foot={`${ws.education_loan_dd.length} loan DD${ws.education_loan_dd.length === 1 ? "" : "s"}`} delay={165} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 22, marginTop: 22 }}>
        <Panel title="Payment progress">
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <Donut pct={collectedPct} label={`${collectedPct.toFixed(0)}%`} caption="paid" />
            <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 13 }}>
              {[
                { label: "Demand", value: totals.demand, strong: true },
                { label: "Paid", value: totals.paid, strong: false },
                { label: "Concession", value: totals.concession, strong: false },
                { label: "Outstanding", value: totals.outstanding, strong: false },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, borderBottom: `1px solid ${GREY.rule}`, paddingBottom: 8 }}>
                  <span style={{ fontSize: 12.2, color: GREY.muted }}>{r.label}</span>
                  <span style={{ ...monoSx, fontSize: r.strong ? 14.5 : 13, fontWeight: 700, color: r.strong ? BLUE.primary : BLUE.ink }}>
                    {money(r.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Demand by fee structure">
          {ws.demand_summary.length === 0 ? (
            <Empty title="No demand raised for this student" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ws.demand_summary.map((d) => {
                const demand = num(d.total_amount);
                const paid = num(d.paid_amount);
                const isOpen = openMapping === d.student_fee_demand_mapping_id;
                return (
                  <div key={d.student_fee_demand_mapping_id} style={{ border: `1px solid ${GREY.border}`, borderRadius: 12, padding: "13px 15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.6, fontWeight: 600, color: BLUE.ink }}>{d.fee_structure_name}</div>
                        <div style={{ fontSize: 11.3, color: GREY.muted, marginTop: 2 }}>
                          {d.academic_year}
                          {d.semester !== null ? ` · Semester ${d.semester}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ ...monoSx, fontSize: 13, fontWeight: 700, color: BLUE.ink }}>{money(demand)}</div>
                        <Chip variant={d.due_status === "paid" ? "outline" : "soft"}>{statusLabel(d.due_status)}</Chip>
                      </div>
                    </div>
                    <div style={{ marginTop: 11 }}>
                      <Meter value={paid} total={demand || 1} caption="Paid" />
                    </div>
                    <button
                      onClick={() => setOpenMapping(isOpen ? null : d.student_fee_demand_mapping_id)}
                      style={{ ...softBtnSx, marginTop: 11 }}
                    >
                      {isOpen ? "Hide category breakdown" : "Category breakdown"}
                    </button>
                    {isOpen && (
                      <div className="fin-rise" style={{ marginTop: 12, borderTop: `1px solid ${GREY.rule}`, paddingTop: 12 }}>
                        {!breakdown ? (
                          <div style={{ fontSize: 11.8, color: GREY.faint }}>Loading breakdown…</div>
                        ) : breakdown.length === 0 ? (
                          <div style={{ fontSize: 11.8, color: GREY.faint }}>No category detail recorded.</div>
                        ) : (
                          /* Each category shows paid against its own demand, so a
                             part-paid fee head is visible rather than being
                             flattened into a single total. */
                          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                            {breakdown.map((b, i) => {
                              const demanded = num(b.original_amount);
                              const paidHere = num(b.already_paid);
                              const pct = demanded > 0 ? Math.min(100, (paidHere / demanded) * 100) : 0;
                              const cleared = num(b.outstanding_amount) <= 0;
                              return (
                                <div
                                  key={b.fee_structure_item_id}
                                  className="fin-rise"
                                  style={{ animationDelay: `${i * 50}ms` }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 5 }}>
                                    <span style={{ fontSize: 12.2, fontWeight: 600, color: BLUE.ink }}>
                                      {b.demand_category_name ?? "Uncategorised"}
                                    </span>
                                    <span style={{ ...monoSx, fontSize: 11.8, fontWeight: 700, color: GREY.text, whiteSpace: "nowrap" }}>
                                      {money(paidHere)}
                                      <span style={{ color: GREY.faint, fontWeight: 500 }}> of {money(demanded)}</span>
                                    </span>
                                  </div>
                                  <div style={{ height: 6, borderRadius: 999, background: GREY.hair, overflow: "hidden" }}>
                                    <div
                                      className="fin-slide"
                                      style={{ height: "100%", borderRadius: 999, background: BLUE.primary, width: `${pct}%` }}
                                    />
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                    <span style={{ fontSize: 10.8, color: GREY.faint }}>
                                      {cleared ? "Cleared" : `${money(num(b.outstanding_amount))} outstanding`}
                                    </span>
                                    <span style={{ fontSize: 10.8, color: GREY.faint }}>{pct.toFixed(0)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 22, marginTop: 22 }}>
        <Panel title="Payment history">
          {ws.payment_history.length === 0 ? (
            <Empty title="No payments recorded" hint="This student has not paid anything yet." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr style={{ background: BLUE.wash }}>
                    {["RECEIPT", "DATE", "MODE"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>{h}</th>
                    ))}
                    <th style={{ textAlign: "right", padding: "11px 14px", fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {ws.payment_history.map((pay) => (
                    <tr key={pay.id} style={{ borderBottom: `1px solid ${GREY.rule}` }}>
                      <td style={{ ...monoSx, padding: "11px 14px", fontSize: 11.8, color: BLUE.strong }}>{pay.receipt_no}</td>
                      <td style={{ padding: "11px 14px", fontSize: 11.8, color: GREY.muted, whiteSpace: "nowrap" }}>{formatDate(pay.payment_date)}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <Chip variant="outline">{pay.payment_mode ? statusLabel(pay.payment_mode) : "—"}</Chip>
                      </td>
                      <td style={{ ...monoSx, padding: "11px 14px", textAlign: "right", fontSize: 12.2, fontWeight: 700, color: BLUE.primary }}>
                        {money(num(pay.amount_paid))}
                        {pay.is_partial && <span style={{ fontFamily: "inherit", fontSize: 10.5, color: GREY.faint, fontWeight: 500 }}> partial</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Panel title="Concessions">
            {ws.fee_concessions.length === 0 ? (
              <Empty title="No concessions" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {ws.fee_concessions.map((c) => (
                  <div key={c.id} data-fin-row="" style={{ padding: "10px 8px", borderBottom: `1px solid ${GREY.rule}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 12.2, fontWeight: 600, color: BLUE.ink }}>
                        {c.concession_type ? statusLabel(c.concession_type) : "Concession"}
                      </span>
                      <span style={{ ...monoSx, fontSize: 12.2, fontWeight: 700, color: BLUE.primary }}>
                        {money(num(c.amount))}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <Chip variant={c.is_settled ? "outline" : "soft"}>{c.is_settled ? "Settled" : "Unsettled"}</Chip>
                      {c.reason && <span style={{ fontSize: 11.3, color: GREY.muted }}>{c.reason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Education loan DDs">
            {ws.education_loan_dd.length === 0 ? (
              <Empty title="No loan DDs recorded" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {ws.education_loan_dd.map((d) => (
                  <div key={d.id} data-fin-row="" style={{ padding: "10px 8px", borderBottom: `1px solid ${GREY.rule}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 12.2, fontWeight: 600, color: BLUE.ink }}>{d.bank_name ?? "—"}</span>
                      <span style={{ ...monoSx, fontSize: 12.2, fontWeight: 700, color: BLUE.primary }}>
                        {money(num(d.amount))}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ ...monoSx, fontSize: 11.3, color: GREY.muted }}>{d.dd_number ?? "—"}</span>
                      {d.dd_date && <span style={{ fontSize: 11.3, color: GREY.faint }}>{formatDate(d.dd_date)}</span>}
                      <Chip variant={d.is_realised ? "outline" : "soft"}>{d.is_realised ? "Realised" : "Pending"}</Chip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
