"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeeStudents, groupFeeStudents } from "@/modules/finance/api/fees";
import { money, moneyCompact } from "@/modules/finance/api/finance";
import {
  BLUE,
  GREY,
  cardSx,
  monoSx,
  filterBarSx,
  inputSx,
  selectSx,
  clearBtnSx,
  softBtnSx,
  PageHead,
  StatCard,
  Chip,
  Empty,
  Meter,
} from "@/modules/finance/ui";

// Every student with a fee demand, from GET /fee-payments/dashboard — the same
// real endpoint the Billing students page uses. Read-only for Finance.

type SortKey = "outstanding" | "name" | "paid" | "demand";

export default function FinanceFeeStudentsPage() {
  const router = useRouter();
  const { data: rows, isLoading, isError, error } = useFeeStudents();

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [batch, setBatch] = useState("");
  const [quota, setQuota] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortKey>("outstanding");

  const students = useMemo(() => groupFeeStudents(rows ?? []), [rows]);

  const departments = useMemo(
    () => [...new Set(students.map((s) => s.department).filter(Boolean))].sort(),
    [students],
  );
  const batches = useMemo(
    () => [...new Set(students.map((s) => s.batch).filter(Boolean))].sort(),
    [students],
  );
  const quotas = useMemo(
    () => [...new Set(students.map((s) => s.quota).filter(Boolean))].sort(),
    [students],
  );

  const filtered = useMemo(() => {
    let list = students;
    if (dept) list = list.filter((s) => s.department === dept);
    if (batch) list = list.filter((s) => s.batch === batch);
    if (quota) list = list.filter((s) => s.quota === quota);
    if (status) list = list.filter((s) => s.due_status === status);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.student_name ?? "").toLowerCase().includes(n) ||
          (s.register_number ?? "").toLowerCase().includes(n) ||
          s.department.toLowerCase().includes(n) ||
          s.programme.toLowerCase().includes(n),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "name") return (a.student_name ?? "").localeCompare(b.student_name ?? "");
      if (sort === "paid") return b.paid_amount - a.paid_amount;
      if (sort === "demand") return b.total_demand - a.total_demand;
      return b.outstanding_amount - a.outstanding_amount;
    });
    return sorted;
  }, [students, dept, batch, quota, status, q, sort]);

  const totals = useMemo(
    () => ({
      demand: filtered.reduce((s, x) => s + x.total_demand, 0),
      paid: filtered.reduce((s, x) => s + x.paid_amount, 0),
      outstanding: filtered.reduce((s, x) => s + x.outstanding_amount, 0),
      owing: filtered.filter((x) => x.outstanding_amount > 0).length,
    }),
    [filtered],
  );

  const activeFilters = [dept, batch, quota, status, q].filter(Boolean).length;

  if (isLoading) {
    return <div style={{ padding: 70, textAlign: "center", fontSize: 13.1, color: GREY.faint }}>Loading students…</div>;
  }
  if (isError) {
    return (
      <div style={cardSx}>
        <h2 style={{ margin: 0, fontSize: 15.7, fontWeight: 700 }}>Couldn&apos;t load the student list</h2>
        <p style={{ fontSize: 12.6, color: GREY.muted, marginTop: 8 }}>
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title="Students"
        sub="Every student with a fee demand — search, filter, and open one to see their full fee position"
        right={
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={selectSx}>
            <option value="outstanding">Highest outstanding</option>
            <option value="demand">Highest demand</option>
            <option value="paid">Highest paid</option>
            <option value="name">Name (A–Z)</option>
          </select>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22 }}>
        <StatCard label="Students in view" value={String(filtered.length)} icon="faculty" hi={String(students.length)} sub="with a demand" pct={students.length > 0 ? (filtered.length / students.length) * 100 : 0} foot={`${totals.owing} still owing`} delay={0} />
        <StatCard label="Demand (in view)" value={moneyCompact(totals.demand)} icon="ledger" hi={String(filtered.length)} sub="students" pct={100} foot={money(totals.demand)} delay={55} />
        <StatCard label="Collected (in view)" value={moneyCompact(totals.paid)} icon="wallet" hi={totals.demand > 0 ? `${((totals.paid / totals.demand) * 100).toFixed(1)}%` : "—"} sub="of demand" pct={totals.demand > 0 ? (totals.paid / totals.demand) * 100 : 0} foot={money(totals.paid)} delay={110} />
        <StatCard label="Outstanding (in view)" value={moneyCompact(totals.outstanding)} icon="approve" hi={String(totals.owing)} sub="students owing" pct={totals.demand > 0 ? (totals.outstanding / totals.demand) * 100 : 0} foot={money(totals.outstanding)} delay={165} />
      </div>

      <div style={{ ...filterBarSx, marginTop: 22 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, register number, department or programme…" style={inputSx} />
        <select value={dept} onChange={(e) => setDept(e.target.value)} style={selectSx}>
          <option value="">All departments</option>
          {departments.map((d) => (<option key={d} value={d}>{d}</option>))}
        </select>
        <select value={batch} onChange={(e) => setBatch(e.target.value)} style={selectSx}>
          <option value="">All batches</option>
          {batches.map((b) => (<option key={b} value={b}>{b}</option>))}
        </select>
        <select value={quota} onChange={(e) => setQuota(e.target.value)} style={selectSx}>
          <option value="">All quotas</option>
          {quotas.map((qt) => (<option key={qt} value={qt}>{qt}</option>))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectSx}>
          <option value="">Any status</option>
          <option value="paid">Fully paid</option>
          <option value="partial">Partly paid</option>
          <option value="pending">Not started</option>
        </select>
        {activeFilters > 0 && (
          <button onClick={() => { setQ(""); setDept(""); setBatch(""); setQuota(""); setStatus(""); }} style={clearBtnSx}>
            Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={cardSx}>
          <Empty
            title="No students match those filters"
            hint={students.length > 0 ? `${students.length} students have a fee demand — try clearing the filters.` : "No fee demand has been raised yet."}
          />
        </div>
      ) : (
        <div style={{ ...cardSx, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", gap: 12 }}>
            <div style={{ fontSize: 12.6, color: GREY.muted }}>
              Showing <strong style={{ color: BLUE.ink }}>{filtered.length}</strong> of {students.length} students
            </div>
            <Chip variant="soft">Read-only</Chip>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: BLUE.wash, borderTop: `1px solid ${GREY.border}`, borderBottom: `1px solid ${GREY.border}` }}>
                  {["STUDENT", "DEPARTMENT", "BATCH", "QUOTA", "STATUS"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 18px", fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>{h}</th>
                  ))}
                  {["DEMAND", "PAID", "OUTSTANDING"].map((h) => (
                    <th key={h} style={{ textAlign: "right", padding: "12px 18px", fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>{h}</th>
                  ))}
                  <th style={{ padding: "12px 18px" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((s) => (
                  <tr
                    key={s.student_id}
                    data-fin-row=""
                    onClick={() => router.push(`/finance/fees/students/${s.student_id}`)}
                    style={{ borderBottom: `1px solid ${GREY.rule}`, cursor: "pointer" }}
                  >
                    <td style={{ padding: "13px 18px" }}>
                      <div style={{ fontSize: 12.6, fontWeight: 600, color: BLUE.ink }}>{s.student_name ?? "—"}</div>
                      <div style={{ ...monoSx, fontSize: 11.3, color: GREY.muted, marginTop: 2 }}>{s.register_number ?? "—"}</div>
                    </td>
                    <td style={{ padding: "13px 18px", fontSize: 11.8, color: GREY.text, maxWidth: 220 }}>{s.department}</td>
                    <td style={{ ...monoSx, padding: "13px 18px", fontSize: 11.8, color: GREY.muted }}>{s.batch}</td>
                    <td style={{ padding: "13px 18px", fontSize: 11.8, color: GREY.muted }}>{s.quota}</td>
                    <td style={{ padding: "13px 18px" }}>
                      <Chip variant={s.due_status === "paid" ? "outline" : s.due_status === "partial" ? "soft" : "solid"}>
                        {s.due_status === "paid" ? "Paid" : s.due_status === "partial" ? "Partial" : "Pending"}
                      </Chip>
                    </td>
                    <td style={{ ...monoSx, padding: "13px 18px", textAlign: "right", fontSize: 12.2, color: GREY.text }}>{money(s.total_demand)}</td>
                    <td style={{ ...monoSx, padding: "13px 18px", textAlign: "right", fontSize: 12.2, color: GREY.text }}>{money(s.paid_amount)}</td>
                    <td style={{ padding: "13px 18px", textAlign: "right", minWidth: 130 }}>
                      <div style={{ ...monoSx, fontSize: 12.6, fontWeight: 700, color: s.outstanding_amount > 0 ? BLUE.primary : GREY.faint }}>
                        {money(s.outstanding_amount)}
                      </div>
                      <div style={{ marginTop: 5 }}>
                        <Meter value={s.paid_amount} total={s.total_demand || 1} />
                      </div>
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right" }}>
                      <span style={{ ...softBtnSx, display: "inline-block" }}>View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <div style={{ padding: "13px 20px", fontSize: 11.8, color: GREY.muted, borderTop: `1px solid ${GREY.rule}` }}>
              Showing the first 200 of {filtered.length}. Narrow the filters to see the rest.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
