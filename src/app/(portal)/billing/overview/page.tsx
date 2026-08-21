"use client";

// Pixel-exact port of the `isOverview` sc-if block from
// "Billing Module - Web/Billing Admin.dc.html" (lines 364-486).
//
// REAL BACKEND WIRING — no fake data. Every figure comes from the real
// `GET /finance-overview` endpoint (optionally `?batch=`), and the batch
// pills come from the real `GET /finance-overview/batches` list.
//
// Honest gaps vs the design (confirmed absent anywhere in the real
// schema — see fees.ts's KNOWN GAPS comment — dropped rather than
// invented): no "collected today" figure, no active-fee-structure count
// broken out as "unmatched entries"/"pending DD" tiles the way the old
// fake-data draft showed them (pendingEducationLoanDD and
// activeFeeStructures ARE real and are shown below instead), no
// dedicated "review concessions" / "DD register" destinations wired
// (buttons link to the real concessions/loans routes already used
// elsewhere in the module).

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/modules/billing/PageHeader";
import { useFinanceOverview, useFinanceBatches } from "@/modules/billing/api/fees";

const cardSx = {
  transition: "transform .16s ease,border-color .16s ease,box-shadow .16s ease",
  background: "#fff",
  border: "1px solid #e6e9ef",
  borderRadius: 12,
  padding: "16px 18px",
} as const;

const rowSx = {
  transition: "transform .15s ease,box-shadow .15s ease",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderTop: "1px solid #f1f5f9",
  cursor: "pointer",
} as const;

function pillSx(active: boolean) {
  return {
    background: active ? "#1d4ed8" : "#fff",
    color: active ? "#fff" : "#475569",
    border: active ? "1px solid #1d4ed8" : "1px solid #dfe4ec",
    borderRadius: 20,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

function fmtMoney(s: string): string {
  return `₹${Math.round(Number(s)).toLocaleString("en-IN")}`;
}
function fmtCrore(s: string): string {
  const n = Number(s);
  return `₹${(n / 1e7).toFixed(2)} Cr`;
}

export default function BillingOverviewPage() {
  const [batch, setBatch] = useState<string | undefined>(undefined);
  const { data: batches } = useFinanceBatches();
  const { data: overview, isLoading, error } = useFinanceOverview(batch);

  const recentPayments = useMemo(() => overview?.operationalInsights.recentPayments.slice(0, 5) ?? [], [overview]);
  const topOutstanding = useMemo(() => overview?.operationalInsights.topOutstandingStudents.slice(0, 5) ?? [], [overview]);

  if (isLoading) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Loading finance overview…</div>;
  if (error || !overview) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load the finance overview."}</div>;

  const kpi = overview.executiveKPIs;
  const { concessionSummary, educationLoanDDSummary } = overview.operationalInsights;

  return (
    <div>
      <PageHeader title="Finance Overview" sub="Complete financial management and fee collection overview." />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setBatch(undefined)} style={pillSx(batch === undefined)}>All batches</button>
        {(batches ?? []).map((b) => (
          <button key={b} onClick={() => setBatch(b)} style={pillSx(batch === b)}>{b}</button>
        ))}
      </div>

      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 3 }}>Executive Summary</div>
      <div style={{ fontSize: 13.5, color: "#64748b", marginBottom: 14 }}>
        Real-time financial position {batch ? `for batch ${batch}` : "across every enrolled student"}.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderTop: "3px solid #1d4ed8", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Total collection</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 27, fontWeight: 600, color: "#1d4ed8", marginTop: 8 }}>{fmtCrore(kpi.totalCollected)}</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 8 }}>{kpi.collectionPercentage.toFixed(1)}% of {fmtCrore(kpi.totalFeeDemand)} demand</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderTop: "3px solid #1d4ed8", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Outstanding dues</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 27, fontWeight: 600, marginTop: 8 }}>{fmtCrore(kpi.totalOutstanding)}</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 8 }}>{overview.financialAnalytics.paymentStatusDistribution.find((p) => p.status === "pending")?.count ?? 0} demands fully unpaid</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderTop: "3px solid #1d4ed8", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Total demand</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 27, fontWeight: 600, marginTop: 8 }}>{fmtCrore(kpi.totalFeeDemand)}</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 8 }}>Live fee demand this term</div>
        </div>
        <div style={{ background: "#eef3ff", border: "1px solid #dbe4ff", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 600, color: "#1d4ed8" }}>{kpi.collectionPercentage.toFixed(1)}%</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#475569" }}>COLLECTION EFFICIENCY</div>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4 }}>Share of total demand collected so far</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 16 }}>
        <div data-bill-lift style={cardSx}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: "#94a3b8" }}>PENDING EDUCATION LOAN DD</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, marginTop: 7 }}>{kpi.pendingEducationLoanDD}</div>
        </div>
        <div data-bill-lift style={cardSx}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: "#94a3b8" }}>ACTIVE FEE STRUCTURES</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, marginTop: 7 }}>{kpi.activeFeeStructures}</div>
        </div>
        <div data-bill-lift style={cardSx}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: "#94a3b8" }}>CONCESSIONS AWAITING SETTLEMENT</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, marginTop: 7 }}>{concessionSummary.unsettled_count}</div>
        </div>
      </div>

      <div style={{ fontSize: 17, fontWeight: 800, margin: "28px 0 3px" }}>Operational Insights</div>
      <div style={{ fontSize: 13.5, color: "#64748b", marginBottom: 14 }}>
        Recent activity, highest outstanding students and concession / DD status.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Recent Payments</div>
            <Link href="/billing/receipts" style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>View all</Link>
          </div>
          {recentPayments.map((p) => (
            <Link key={p.id} href={`/billing/students/${p.student_id}`} data-bill-row style={{ ...rowSx, textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eef3ff", flex: "0 0 32px" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.student_name ?? "—"}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#94a3b8" }}>
                  {p.receipt_no} <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>· {p.payment_mode ?? "—"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'IBM Plex Mono',monospace" }}>{new Date(p.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600 }}>{fmtMoney(p.amount_paid)}</div>
            </Link>
          ))}
          {recentPayments.length === 0 && <div style={{ padding: "14px 0", fontSize: 12.5, color: "#94a3b8" }}>No payments recorded yet.</div>}
        </div>

        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Top Outstanding Students</div>
            <Link href="/billing/students" style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Open list</Link>
          </div>
          {topOutstanding.map((s, i) => (
            <Link key={s.student_id} href={`/billing/students/${s.student_id}`} data-bill-row style={{ ...rowSx, textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#1e3a8a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 600, flex: "0 0 30px" }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.student_name ?? "—"}</div>
                <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'IBM Plex Mono',monospace" }}>{s.register_number ?? "—"}</div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, background: "#eef3ff", color: "#1d4ed8", borderRadius: 7, padding: "4px 9px" }}>{fmtMoney(s.total_outstanding)}</div>
            </Link>
          ))}
          {topOutstanding.length === 0 && <div style={{ padding: "14px 0", fontSize: 12.5, color: "#94a3b8" }}>No outstanding dues.</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div data-bill-lift style={cardSx}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Concession Summary</div>
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>Total concession amount</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{fmtMoney(concessionSummary.total_concession_amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>Awaiting approval</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{concessionSummary.unsettled_count}</div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>Settled</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{concessionSummary.settled_count}</div>
            </div>
          </div>
          <Link href="/billing/concessions" data-bill-soft style={{ marginTop: 16, display: "inline-block", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#0f172a", textDecoration: "none" }}>Review concessions</Link>
        </div>
        <div data-bill-lift style={cardSx}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Education Loan DD Summary</div>
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>Total DD amount</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{fmtMoney(educationLoanDDSummary.total_amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>DDs on record</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{educationLoanDDSummary.count}</div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>Bounced</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{educationLoanDDSummary.bounced_count}</div>
            </div>
          </div>
          <Link href="/billing/loans" data-bill-soft style={{ marginTop: 16, display: "inline-block", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#0f172a", textDecoration: "none" }}>Open DD register</Link>
        </div>
      </div>
    </div>
  );
}
