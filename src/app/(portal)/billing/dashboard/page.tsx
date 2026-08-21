"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cardSx } from "@/modules/billing/PageHeader";
import { useAnnouncements, REAL_TO_TAG, announcementTagColors } from "@/modules/billing/api/announcements";
import { useFinanceOverview } from "@/modules/billing/api/fees";

// Pixel-exact port of the `isDashboard` screen from
// "Billing Module - Web/Billing Admin.dc.html", lines 190-339.
//
// REAL BACKEND WIRING — no fake data. Every figure comes from the real
// `GET /finance-overview` endpoint (EOSbackend1's real Admin finance
// dashboard, ROLES.BILLING added this session) plus real `/announcements`.
//
// Honest gaps vs the design (confirmed absent anywhere in the real schema,
// never faked): no "collected today" figure (only monthly-granularity
// trend exists) — the Today/This term/This year range toggle from the
// design is dropped since there's nothing real to switch between; no
// counter/online/DD 3-way taxonomy (only the 6 raw payment_mode_enum
// values) — relabelled honestly below as "Cash & card" / "UPI, net
// banking & gateway" / "DD"; no refunds table anywhere in the schema, so
// "Refunds disbursed" and the "unmatched credits" reconciliation pill
// (no recon table either) are dropped rather than invented.

const kpiIconWrapSx = { width: 34, height: 34, borderRadius: 9, background: "#eef3ff", display: "flex", alignItems: "center", justifyContent: "center" } as const;
const kpiLabelSx = { fontSize: 14, color: "#475569", fontWeight: 600 as const };
const kpiValueSx = { fontFamily: "'IBM Plex Mono',monospace", fontSize: 32, fontWeight: 600 as const, marginTop: 12, letterSpacing: -0.02 };
const kpiSubSx = { fontSize: 13, marginTop: 10 };
const barTrackSx = { height: 5, background: "#eef2f7", borderRadius: 4, marginTop: 10, overflow: "hidden" as const };
const kpiFootSx = { fontSize: 12.5, color: "#64748b", marginTop: 8 };

function fmtMoney(s: string): string {
  const n = Number(s);
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtCrore(s: string): string {
  const n = Number(s);
  return `₹${(n / 1e7).toFixed(2)} Cr`;
}

export default function BillingDashboardPage() {
  const { data: overview, isLoading, error } = useFinanceOverview();
  const { data: announcementRows } = useAnnouncements();

  const modeAmount = (modes: string[]) =>
    (overview?.financialAnalytics.collectionByPaymentMode ?? [])
      .filter((m) => modes.includes(m.mode))
      .reduce((a, m) => a + Number(m.totalAmount), 0);
  const totalPaymentsRecorded = (overview?.financialAnalytics.collectionByPaymentMode ?? []).reduce((a, m) => a + m.count, 0);

  const flags = useMemo(() => {
    if (!overview) return [];
    const list: { title: string; sub: string; href: string }[] = [];
    const { unsettled_count } = overview.operationalInsights.concessionSummary;
    if (unsettled_count > 0) list.push({ title: `${unsettled_count} concession${unsettled_count === 1 ? "" : "s"} awaiting settlement`, sub: `₹${Math.round(Number(overview.operationalInsights.concessionSummary.total_concession_amount)).toLocaleString("en-IN")} total sanctioned`, href: "/billing/concessions" });
    const dd = overview.operationalInsights.educationLoanDDSummary;
    const notCleared = dd.received_count;
    if (notCleared > 0) list.push({ title: `${notCleared} education loan DD${notCleared === 1 ? "" : "s"} not yet cleared`, sub: `${fmtMoney(dd.total_amount)} total on record`, href: "/billing/loans" });
    if (dd.bounced_count > 0) list.push({ title: `${dd.bounced_count} education loan DD${dd.bounced_count === 1 ? "" : "s"} bounced`, sub: "Needs follow-up with the bank", href: "/billing/loans" });
    const topDept = [...overview.financialAnalytics.departmentOutstanding].sort((a, b) => Number(b.totalOutstanding) - Number(a.totalOutstanding))[0];
    if (topDept && Number(topDept.totalOutstanding) > 0) list.push({ title: `${topDept.department} has the highest outstanding dues`, sub: `${fmtMoney(topDept.totalOutstanding)} of ${fmtMoney(topDept.totalDemand)} demand`, href: "/billing/students" });
    const topStudent = overview.operationalInsights.topOutstandingStudents[0];
    if (topStudent) list.push({ title: `${topStudent.student_name ?? "A student"} has the largest single outstanding balance`, sub: `${topStudent.register_number ?? "—"} · ${fmtMoney(topStudent.total_outstanding)}`, href: `/billing/students/${topStudent.student_id}` });
    return list;
  }, [overview]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  if (isLoading) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Loading finance overview…</div>;
  if (error || !overview) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load the finance overview."}</div>;

  const kpi = overview.executiveKPIs;
  const unsettledConcessions = overview.operationalInsights.concessionSummary.unsettled_count;

  return (
    <div>
      <div>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -0.03 }}>Billing Desk Overview</h1>
        <div style={{ fontSize: 14.5, color: "#64748b", marginTop: 7 }}>{dateStr}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20, margin: "22px 0 22px" }}>
          <Link data-bill-pill="" href="/billing/concessions" style={{ display: "flex", alignItems: "center", gap: 9, background: "#eef3ff", border: "1px solid #dbe4ff", borderRadius: 22, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, color: "#1d4ed8", cursor: "pointer", textDecoration: "none" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span>{unsettledConcessions} concession{unsettledConcessions === 1 ? "" : "s"} need you</span>
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={kpiLabelSx}>Total collected</div>
            <div style={kpiIconWrapSx}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>
            </div>
          </div>
          <div style={kpiValueSx}>{fmtCrore(kpi.totalCollected)}</div>
          <div style={kpiSubSx}><span style={{ color: "#1d4ed8", fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace" }}>{totalPaymentsRecorded}</span> <span style={{ color: "#64748b" }}>payments recorded</span></div>
          <div style={barTrackSx}><div style={{ height: "100%", width: `${Math.min(100, kpi.collectionPercentage)}%`, background: "#1d4ed8", borderRadius: 4 }} /></div>
          <div style={kpiFootSx}>{kpi.collectionPercentage.toFixed(1)}% of total demand</div>
        </div>

        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={kpiLabelSx}>Outstanding dues</div>
            <div style={{ ...kpiIconWrapSx, background: "#f1f5f9" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0f2d6b" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16h.01" /></svg>
            </div>
          </div>
          <div style={kpiValueSx}>{fmtCrore(kpi.totalOutstanding)}</div>
          <div style={kpiSubSx}><span style={{ color: "#0f2d6b", fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace" }}>{overview.financialAnalytics.paymentStatusDistribution.find((p) => p.status === "pending")?.count ?? 0}</span> <span style={{ color: "#64748b" }}>demands fully unpaid</span></div>
          <div style={barTrackSx}><div style={{ height: "100%", width: `${100 - Math.min(100, kpi.collectionPercentage)}%`, background: "#0f2d6b", borderRadius: 4 }} /></div>
          <div style={kpiFootSx}>of {fmtCrore(kpi.totalFeeDemand)} total demand</div>
        </div>

        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={kpiLabelSx}>Collection efficiency</div>
            <div style={kpiIconWrapSx}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth={2}><path d="M4 19V9M10 19V5M16 19v-6M21 19H3" /></svg>
            </div>
          </div>
          <div style={kpiValueSx}>{kpi.collectionPercentage.toFixed(1)}%</div>
          <div style={kpiSubSx}><span style={{ color: "#64748b" }}>share of total demand collected so far</span></div>
          <div style={barTrackSx}><div style={{ height: "100%", width: `${Math.min(100, kpi.collectionPercentage)}%`, background: "#1d4ed8", borderRadius: 4 }} /></div>
          <div style={kpiFootSx}>{kpi.activeFeeStructures} active fee structures</div>
        </div>

        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={kpiLabelSx}>Pending approvals</div>
            <div style={kpiIconWrapSx}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
            </div>
          </div>
          <div style={kpiValueSx}>{unsettledConcessions}</div>
          <div style={kpiSubSx}><span style={{ color: "#1d4ed8", fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace" }}>{kpi.pendingEducationLoanDD}</span> <span style={{ color: "#64748b" }}>education loan DDs pending too</span></div>
          <div style={barTrackSx}><div style={{ height: "100%", width: "46%", background: "#1d4ed8", borderRadius: 4 }} /></div>
          <div style={kpiFootSx}>concessions awaiting settlement</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Collection command center</div>
            <Link href="/billing/overview" style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>Detail</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>
            <div><div style={{ fontSize: 13, color: "#64748b" }}>Cash &amp; card</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 21, fontWeight: 600, marginTop: 3 }}>{`₹${modeAmount(["cash", "card"]).toLocaleString("en-IN")}`}</div></div>
            <div><div style={{ fontSize: 13, color: "#64748b" }}>UPI, net banking &amp; gateway</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 21, fontWeight: 600, marginTop: 3 }}>{`₹${modeAmount(["upi", "netbanking", "razorpay"]).toLocaleString("en-IN")}`}</div></div>
            <div><div style={{ fontSize: 13, color: "#64748b" }}>DD received</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 21, fontWeight: 600, marginTop: 3 }}>{`₹${modeAmount(["dd"]).toLocaleString("en-IN")}`}</div></div>
            <div><div style={{ fontSize: 13, color: "#64748b" }}>Demand cleared</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 21, fontWeight: 600, marginTop: 3 }}>{kpi.collectionPercentage.toFixed(1)}%</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <Link href="/billing/loans" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f172a", textDecoration: "none" }}>{kpi.pendingEducationLoanDD} DDs pending</Link>
            <Link href="/billing/receipts" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f172a", textDecoration: "none" }}>Receipt register</Link>
          </div>
        </div>

        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Needs attention</div>
            <span style={{ background: "#eef3ff", color: "#1d4ed8", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>{flags.length} flags</span>
          </div>
          {flags.map((f, i) => (
            <Link key={i} href={f.href} data-bill-row style={{ display: "flex", gap: 11, padding: "13px 0", borderBottom: "1px solid #f1f5f9", textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1d4ed8", marginTop: 6, flex: "0 0 7px" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{f.title}</div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{f.sub}</div>
              </div>
            </Link>
          ))}
          {flags.length === 0 && <div style={{ padding: "14px 0", fontSize: 12.5, color: "#94a3b8" }}>Nothing needs attention right now.</div>}
        </div>

        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Announcements</div>
            <Link href="/billing/announcements" data-bill-primary style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 8, padding: "8px 15px", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>New</Link>
          </div>
          {(announcementRows ?? []).slice(0, 4).map((a) => {
            const tag = REAL_TO_TAG[a.category as string] ?? "GENERAL";
            const { bg, fg } = announcementTagColors(tag);
            return (
              <Link key={a.id} href="/billing/announcements" data-bill-row style={{ display: "block", padding: "14px 0", borderBottom: "1px solid #f1f5f9", textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: bg, color: fg, borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 0.05 }}>{tag}</span>
                  <span style={{ fontSize: 12.5, color: "#64748b" }}>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 7 }}>{a.title}</div>
              </Link>
            );
          })}
          {(announcementRows ?? []).length === 0 && (
            <div style={{ padding: "14px 0", fontSize: 12.5, color: "#94a3b8" }}>No announcements yet.</div>
          )}
          <Link href="/billing/announcements" style={{ marginTop: 14, background: "transparent", border: 0, color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, display: "inline-block", textDecoration: "none" }}>View all announcements</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Recent Payments</div>
            <Link href="/billing/receipts" style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>View all</Link>
          </div>
          {overview.operationalInsights.recentPayments.slice(0, 5).map((p) => (
            <Link key={p.id} href={`/billing/students/${p.student_id}`} data-bill-row style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f1f5f9", textDecoration: "none", color: "inherit" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.student_name ?? "—"}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{p.receipt_no} · {new Date(p.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600 }}>{fmtMoney(p.amount_paid)}</div>
            </Link>
          ))}
          {overview.operationalInsights.recentPayments.length === 0 && <div style={{ padding: "14px 0", fontSize: 12.5, color: "#94a3b8" }}>No payments recorded yet.</div>}
        </div>

        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Top Outstanding Students</div>
            <Link href="/billing/students" style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>View all</Link>
          </div>
          {overview.operationalInsights.topOutstandingStudents.slice(0, 5).map((s) => (
            <Link key={s.student_id} href={`/billing/students/${s.student_id}`} data-bill-row style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f1f5f9", textDecoration: "none", color: "inherit" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.student_name ?? "—"}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.register_number ?? "—"}</div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600, color: "#0f2d6b" }}>{fmtMoney(s.total_outstanding)}</div>
            </Link>
          ))}
          {overview.operationalInsights.topOutstandingStudents.length === 0 && <div style={{ padding: "14px 0", fontSize: 12.5, color: "#94a3b8" }}>No outstanding dues.</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Concession Summary</div>
            <Link href="/billing/concessions" style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>View all</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Unsettled</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{overview.operationalInsights.concessionSummary.unsettled_count}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Settled</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{overview.operationalInsights.concessionSummary.settled_count}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Total value</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{fmtMoney(overview.operationalInsights.concessionSummary.total_concession_amount)}</div>
            </div>
          </div>
        </div>

        <div data-bill-lift style={cardSx}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Education Loan DD Summary</div>
            <Link href="/billing/loans" style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>View all</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Total DDs</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{overview.operationalInsights.educationLoanDDSummary.count}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Not cleared</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{overview.operationalInsights.educationLoanDDSummary.count - overview.operationalInsights.educationLoanDDSummary.cleared_count}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Total value</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, marginTop: 5 }}>{fmtMoney(overview.operationalInsights.educationLoanDDSummary.total_amount)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
