"use client";

// Pixel-exact port of the `isPayments` sc-if block (History/Ledger sub-tabs)
// from "Billing Module - Web/Billing Admin.dc.html" (lines 627-858).
//
// REAL BACKEND WIRING — no fake data. "Fee Ledger" reads the same real
// `GET /fee-payments/dashboard` (grouped by student) as the Students
// roster page; "Payment History" reads the real, enriched
// `GET /fee-payments` flat receipt list. Both tabs now carry real
// numeric ids, so the real <ReceivePaymentModal> (real
// student_fee_demand_mapping_id[]) is wired directly from the ledger —
// the earlier "route staff to the Students page instead" toast
// workaround (used while this page was still fake-data-only) has been
// removed.
//
// The calendar's "outlined days have receipts issued" affordance from
// the design has no cheap real backing (would need a full receipts-by-
// day aggregation not exposed by any endpoint) — the calendar still
// lets staff pick a date to filter by, it just never outlines days.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, tableWrapSx, thSx, thRightSx, inputSx, selectSx, clearBtnSx } from "@/modules/billing/PageHeader";
import { ReceivePaymentModal, toastSx } from "@/modules/billing/ReceivePaymentModal";
import { useFeePaymentsDashboard, useFeePaymentsList, groupDashboardByStudent, type BillingStudentRow } from "@/modules/billing/api/fees";

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function fmtMoney(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtMoneyStr(s: string): string {
  return fmtMoney(Number(s));
}
function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function calStepBtnSx() {
  return {
    width: 28,
    height: 28,
    flex: "0 0 28px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  } as const;
}

function tabBtnSx(active: boolean) {
  return {
    background: active ? "#1d4ed8" : "#fff",
    color: active ? "#fff" : "#475569",
    border: active ? "1px solid #1d4ed8" : "1px solid #dfe4ec",
    borderRadius: 20,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

function dayCellSx(selected: boolean, isToday: boolean) {
  return {
    padding: "6px 0",
    borderRadius: 8,
    border: selected ? "1.5px solid #1d4ed8" : isToday ? "1px solid #cbd5e1" : "1px solid transparent",
    background: selected ? "#eef3ff" : "#fff",
    color: selected ? "#1d4ed8" : "#0f172a",
    cursor: "pointer",
  } as const;
}

export default function BillingPaymentsPage() {
  const router = useRouter();
  const [payTab, setPayTab] = useState<"history" | "ledger">("ledger");

  const { data: dashboardRows, isLoading: ledgerLoading, error: ledgerError } = useFeePaymentsDashboard();
  const students = useMemo(() => groupDashboardByStudent(dashboardRows ?? []), [dashboardRows]);

  const { data: paymentRows, isLoading: historyLoading, error: historyError } = useFeePaymentsList();

  // ---- History tab state ----
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [histQ, setHistQ] = useState("");
  const [histMode, setHistMode] = useState("All");
  const [histCat, setHistCat] = useState("All");

  // ---- Ledger tab state ----
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [batch, setBatch] = useState("All");
  const [due, setDue] = useState("All");
  const [receiveFor, setReceiveFor] = useState<BillingStudentRow | null>(null);

  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleReceiveSubmitted() {
    setReceiveFor(null);
    showToast("Payment recorded.");
  }

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const calendarDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: { day: number; date: string }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ day: 0, date: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calYear, calMonth, d);
      cells.push({ day: d, date: dateObj.toDateString() });
    }
    return cells;
  }, [calYear, calMonth]);

  function stepMonth(delta: number) {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCalMonth(m);
    setCalYear(y);
  }

  function goToday() {
    const today = new Date();
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setSelectedDate(today.toDateString());
  }

  const modeOptions = useMemo(() => Array.from(new Set((paymentRows ?? []).map((r) => r.payment_mode).filter(Boolean))) as string[], [paymentRows]);
  const catOptions = useMemo(() => Array.from(new Set((paymentRows ?? []).map((r) => r.demand_category_name).filter(Boolean))) as string[], [paymentRows]);

  const historyRows = useMemo(() => {
    const q = histQ.trim().toLowerCase();
    return (paymentRows ?? []).filter((p) => {
      if (selectedDate && new Date(p.payment_date).toDateString() !== selectedDate) return false;
      if (histMode !== "All" && p.payment_mode !== histMode) return false;
      if (histCat !== "All" && p.demand_category_name !== histCat) return false;
      if (q) {
        const name = (p.student_name ?? "").toLowerCase();
        const reg = (p.register_number ?? "").toLowerCase();
        if (!name.includes(q) && !reg.includes(q) && !p.receipt_no.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [paymentRows, selectedDate, histMode, histCat, histQ]);

  const histTotal = historyRows.reduce((a, p) => a + Number(p.amount_paid), 0);
  const histLabel = selectedDate ? new Date(selectedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "All dates";

  // Ledger filtering
  const departments = useMemo(() => Array.from(new Set(students.map((s) => s.department))).sort(), [students]);
  const batches = useMemo(() => Array.from(new Set(students.map((s) => s.batch))).sort(), [students]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (dept !== "All" && s.department !== dept) return false;
      if (batch !== "All" && s.batch !== batch) return false;
      if (due !== "All" && s.due_status !== due) return false;
      if (q && !(s.student_name.toLowerCase().includes(q) || s.register_number.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [students, query, dept, batch, due]);

  const viewCount = filteredStudents.length;
  const viewDemand = filteredStudents.reduce((a, s) => a + s.total_demand, 0);
  const viewPaid = filteredStudents.reduce((a, s) => a + s.paid_amount, 0);
  const viewOut = viewDemand - viewPaid;
  const viewDues = filteredStudents.filter((s) => s.due_status !== "paid").length;

  function clearFilters() {
    setQuery("");
    setDept("All");
    setBatch("All");
    setDue("All");
  }

  return (
    <div>
      <PageHeader title="Fee Payments" sub="Receive payments, review receipts and track the fee ledger." />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button data-bill-tab onClick={() => setPayTab("history")} style={tabBtnSx(payTab === "history")}>Payment History</button>
        <button data-bill-tab onClick={() => setPayTab("ledger")} style={tabBtnSx(payTab === "ledger")}>Fee Ledger</button>
      </div>

      {payTab === "history" && (
        <div>
          {historyLoading && <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Loading payment history…</div>}
          {historyError && <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{historyError instanceof Error ? historyError.message : "Could not load payment history."}</div>}
          {!historyLoading && !historyError && (
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <button data-bill-tab title="Previous month" onClick={() => stepMonth(-1)} style={calStepBtnSx()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 800 }}>{monthLabel}</div>
                <button data-bill-tab title="Next month" onClick={() => stepMonth(1)} style={calStepBtnSx()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <button onClick={goToday} style={{ background: "transparent", border: 0, color: "#64748b", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>This month</button>
                <button onClick={() => setSelectedDate(null)} style={{ background: "transparent", border: 0, color: "#64748b", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>All dates</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
                {WEEK_DAYS.map((w, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", padding: "4px 0" }}>{w}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {calendarDays.map((c, i) =>
                  c.day === 0 ? (
                    <div key={i} />
                  ) : (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(c.date)}
                      style={dayCellSx(selectedDate === c.date, c.date === new Date().toDateString())}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.day}</div>
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <input
                  value={histQ}
                  onChange={(e) => setHistQ(e.target.value)}
                  placeholder="Search student, register no. or receipt"
                  style={{ ...inputSx, flex: "1 1 240px", minWidth: 220 }}
                />
                <select value={histMode} onChange={(e) => setHistMode(e.target.value)} style={{ ...selectSx, minWidth: 150 }}>
                  <option value="All">Mode: All</option>
                  {modeOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select value={histCat} onChange={(e) => setHistCat(e.target.value)} style={{ ...selectSx, minWidth: 170 }}>
                  <option value="All">Category: All</option>
                  {catOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setHistQ(""); setHistMode("All"); setHistCat("All"); }}
                  style={clearBtnSx}
                >
                  Clear
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>{histLabel}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>{historyRows.length} receipts · {fmtMoney(histTotal)} collected</div>
              </div>

              <div style={tableWrapSx}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
                      <th style={thSx}>Receipt</th>
                      <th style={thSx}>Date</th>
                      <th style={thSx}>Student</th>
                      <th style={thSx}>Category</th>
                      <th style={thSx}>Mode</th>
                      <th style={thRightSx}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((p) => (
                      <tr
                        key={p.id}
                        data-bill-rowtable
                        onClick={() => router.push(`/billing/students/${p.student_id}`)}
                        style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                      >
                        <td style={{ padding: "13px 18px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: "#1d4ed8" }}>{p.receipt_no}</td>
                        <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }}>{new Date(p.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td style={{ padding: "13px 10px" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.student_name ?? "—"}</div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                            {p.register_number ?? "—"} <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>· {p.department}</span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 10px", fontSize: 13 }}>{p.demand_category_name ?? "—"}</td>
                        <td style={{ padding: "13px 10px", fontSize: 13 }}>{p.payment_mode ?? "—"}</td>
                        <td style={{ padding: "13px 18px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13.5, fontWeight: 600 }}>{fmtMoneyStr(p.amount_paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {historyRows.length === 0 && (
                  <div style={{ padding: 46, textAlign: "center" }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>No receipts for this selection</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Pick another date or clear the filters.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {payTab === "ledger" && (
        <div>
          {ledgerLoading && <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Loading fee ledger…</div>}
          {ledgerError && <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{ledgerError instanceof Error ? ledgerError.message : "Could not load the fee ledger."}</div>}
          {!ledgerLoading && !ledgerError && (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16 }}>
            <div data-bill-lift style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Records in view</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, fontWeight: 600, marginTop: 6 }}>{viewCount}</div>
            </div>
            <div data-bill-lift style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Total demand</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, fontWeight: 600, marginTop: 6 }}>{fmtMoney(viewDemand)}</div>
            </div>
            <div data-bill-lift style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Total collected</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, fontWeight: 600, marginTop: 6 }}>{fmtMoney(viewPaid)}</div>
            </div>
            <div style={{ background: "#eef3ff", border: "1px solid #dbe4ff", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>Outstanding</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, fontWeight: 600, marginTop: 6, color: "#1d4ed8" }}>{fmtMoney(viewOut)}</div>
            </div>
            <div style={{ background: "#eef3ff", border: "1px solid #dbe4ff", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>Students with dues</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, fontWeight: 600, marginTop: 6, color: "#1d4ed8" }}>{viewDues}</div>
            </div>
          </div>

          <div data-bill-lift style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "18px 20px", marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student name, register no., roll no."
              style={{ ...inputSx, flex: "1 1 300px", minWidth: 260 }}
            />
            <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ ...selectSx, minWidth: 220 }}>
              <option value="All">Department: All</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={batch} onChange={(e) => setBatch(e.target.value)} style={{ ...selectSx, minWidth: 150 }}>
              <option value="All">Batch: All</option>
              {batches.map((b) => (
                <option key={b} value={b}>Batch: {b}</option>
              ))}
            </select>
            <select value={due} onChange={(e) => setDue(e.target.value)} style={{ ...selectSx, minWidth: 170 }}>
              <option value="All">Due Status: All</option>
              <option value="paid">Due Status: Paid</option>
              <option value="partial">Due Status: Partial</option>
              <option value="pending">Due Status: Pending</option>
            </select>
            <button onClick={clearFilters} style={clearBtnSx}>Clear all</button>
          </div>

          {/* No bulk "send due reminder" / "export selection" / row-selection
              actions here — confirmed absent from the old frontend's own
              fee-payments screens (no reminder/CSV/bulk-edit endpoint
              anywhere in the real backend either); a checkbox selection
              with no real action behind it would just be a fake/inert
              control, so it's dropped rather than faked. */}

          <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, marginTop: 16, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
                  <th style={thSx}>Student</th>
                  <th style={thSx}>Register No.</th>
                  <th style={thSx}>Department / Batch</th>
                  <th style={thSx}>Quota</th>
                  <th style={thRightSx}>Total Demand</th>
                  <th style={thRightSx}>Paid Amount</th>
                  <th style={thRightSx}>Outstanding</th>
                  <th style={thSx}>Due Status</th>
                  <th style={thSx}>Last Payment</th>
                  <th style={{ ...thRightSx, padding: "14px 18px 14px 10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((r) => {
                  const status = r.due_status;
                  return (
                    <tr
                      key={r.student_id}
                      data-bill-rowtable
                      onClick={() => router.push(`/billing/students/${r.student_id}`)}
                      style={{ borderTop: "1px solid #f1f5f9", position: "relative", cursor: "pointer" }}
                    >
                      <td style={{ padding: "12px 10px 12px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#eef3ff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flex: "0 0 28px" }}>{initialsOf(r.student_name)}</div>
                          <button onClick={() => router.push(`/billing/students/${r.student_id}`)} style={{ background: "transparent", border: 0, padding: 0, fontSize: 13.5, fontWeight: 700, color: "#0f172a", cursor: "pointer", textAlign: "left" }}>{r.student_name}</button>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: "#475569" }}>{r.register_number}</td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, maxWidth: 250 }}>{r.department}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#64748b" }}>{r.batch}</div>
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 12.5, color: "#475569" }}>{r.quota}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{fmtMoney(r.total_demand)}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{fmtMoney(r.paid_amount)}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600 }}>{fmtMoney(r.outstanding_amount)}</td>
                      <td style={{ padding: "12px 10px" }}>
                        {status === "paid" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1d4ed8", color: "#fff", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />paid
                          </span>
                        )}
                        {status === "partial" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eef3ff", color: "#1d4ed8", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1d4ed8" }} />partial
                          </span>
                        )}
                        {status === "pending" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />pending
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: "#64748b" }}>{r.last_payment_date ? new Date(r.last_payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                      <td style={{ padding: "12px 18px 12px 10px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          {status !== "paid" && r.outstanding_amount > 0 && (
                            <button data-bill-primary onClick={() => setReceiveFor(r)} style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Receive</button>
                          )}
                          <button data-bill-soft onClick={() => router.push(`/billing/students/${r.student_id}`)} style={{ background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <div style={{ padding: 46, textAlign: "center" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>No students match these filters</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Clear the filters to see the full ledger.</div>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      )}

      <ReceivePaymentModal
        open={receiveFor !== null}
        fixedStudentId={receiveFor?.student_id}
        demandMappingIds={receiveFor?.demand_mapping_ids ?? []}
        onClose={() => setReceiveFor(null)}
        onSubmitted={handleReceiveSubmitted}
      />

      {toast && <div style={toastSx}>{toast}</div>}
    </div>
  );
}
