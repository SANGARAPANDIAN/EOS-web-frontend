"use client";

// Pixel-exact port of the `isStudents` sc-if block from
// "Billing Module - Web/Billing Admin.dc.html" (lines 490-625).
//
// REAL BACKEND WIRING — no fake data. Reads through EOSbackend1's real
// `GET /fee-payments/dashboard` (ROLES.BILLING added this session),
// grouped client-side into one row per student (see
// groupDashboardByStudent — the real endpoint returns one row per fee
// structure/demand mapping, so a student with tuition+hostel+transport
// appears 3 times in the raw response).

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, filterBarSx, inputSx, selectSx, clearBtnSx, tableWrapSx, thSx, thRightSx } from "@/modules/billing/PageHeader";
import { SkeletonCardGrid, SkeletonFilterBar, SkeletonTable } from "@/components/ui/Skeleton";
import { ReceivePaymentModal, toastSx } from "@/modules/billing/ReceivePaymentModal";
import { useFeePaymentsDashboard, groupDashboardByStudent, type BillingStudentRow } from "@/modules/billing/api/fees";
import { money, initialsOf } from "@/modules/billing/fakeData";

const YEAR_LABELS = ["I Year", "II Year", "III Year", "IV Year"];

const cardSx = {
  transition: "transform .16s ease,border-color .16s ease,box-shadow .16s ease",
  background: "#fff",
  border: "1px solid #e6e9ef",
  borderRadius: 14,
  padding: "20px",
  textAlign: "left" as const,
  cursor: "pointer",
  font: "inherit",
  display: "flex",
  flexDirection: "column" as const,
} as const;

const cardGridSx = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(232px, 1fr))", gap: 14 } as const;

const clampNameSx = {
  fontSize: 13.5,
  fontWeight: 700,
  lineHeight: 1.35,
  color: "#0f172a",
  marginTop: 14,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
  minHeight: "2.7em",
} as const;

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: 9, background: "#eef3ff", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
      {children}
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V7l7-4 7 4v14M3 21h18M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function StatLine({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{value}</span>
      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>Collected</span>
        <span style={{ fontSize: 12.5, color: "#1d4ed8", fontWeight: 800 }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: "#eef2f7", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: "#1d4ed8", borderRadius: 5, transition: "width .3s ease" }} />
      </div>
    </div>
  );
}

export default function BillingStudentsPage() {
  const router = useRouter();
  const { data: rawRows, isLoading, error } = useFeePaymentsDashboard();
  const students = useMemo(() => groupDashboardByStudent(rawRows ?? []), [rawRows]);

  const [deptPicked, setDeptPicked] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [batch, setBatch] = useState("All");
  const [due, setDue] = useState("All");
  const [receiveFor, setReceiveFor] = useState<BillingStudentRow | null>(null);
  const [toast, setToast] = useState("");

  const departments = useMemo(() => Array.from(new Set(students.map((s) => s.department))).sort(), [students]);
  const batches = useMemo(() => Array.from(new Set(students.map((s) => s.batch))).sort(), [students]);

  const deptSummary = useMemo(() => {
    return departments.map((d) => {
      const rows = students.filter((s) => s.department === d);
      const demand = rows.reduce((a, s) => a + s.total_demand, 0);
      const paid = rows.reduce((a, s) => a + s.paid_amount, 0);
      const pct = demand > 0 ? (paid / demand) * 100 : 0;
      return { dept: d, students: rows.length, pct };
    });
  }, [departments, students]);

  const yearBoxes = useMemo(() => {
    if (!deptPicked) return [];
    return batches.map((b, i) => {
      const rows = students.filter((s) => s.department === deptPicked && s.batch === b);
      const demand = rows.reduce((a, s) => a + s.total_demand, 0);
      const paid = rows.reduce((a, s) => a + s.paid_amount, 0);
      const pct = demand > 0 ? (paid / demand) * 100 : 0;
      const fullyPaid = rows.filter((s) => s.due_status === "paid").length;
      return { label: YEAR_LABELS[i] ?? b, batch: b, students: fullyPaid, pct };
    });
  }, [deptPicked, batches, students]);

  const deptTotalRoll = deptPicked ? students.filter((s) => s.department === deptPicked).length : 0;

  const filteredStudents = useMemo(() => {
    return students.filter((s: BillingStudentRow) => {
      if (query && !(s.student_name.toLowerCase().includes(query.toLowerCase()) || s.register_number.toLowerCase().includes(query.toLowerCase()))) return false;
      if (dept !== "All" && s.department !== dept) return false;
      if (batch !== "All" && s.batch !== batch) return false;
      if (due !== "All" && s.due_status !== due) return false;
      return true;
    });
  }, [students, query, dept, batch, due]);

  function pickDept(d: string) {
    setDeptPicked(d);
    setDept(d);
  }
  function clearDept() {
    setDeptPicked(null);
    setDept("All");
  }
  function pickYear(b: string) {
    setBatch(b);
  }
  function clearFilters() {
    setQuery("");
    setDept("All");
    setBatch("All");
    setDue("All");
    setDeptPicked(null);
  }
  /** Real client-side CSV export of exactly the currently-filtered rows —
   * no fake "Exporting…" toast with no file, this genuinely downloads a
   * real .csv built from the real data already loaded on this page. */
  function exportList() {
    if (filteredStudents.length === 0) {
      setToast("No students to export for the current filters.");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    const headers = ["Student", "Register No.", "Department", "Batch", "Quota", "Fee Structures", "Demand", "Paid", "Outstanding", "Status", "Last Payment"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      headers.join(","),
      ...filteredStudents.map((r) =>
        [
          r.student_name,
          r.register_number,
          r.department,
          r.batch,
          r.quota,
          r.fee_structures.join("; "),
          r.total_demand.toFixed(2),
          r.paid_amount.toFixed(2),
          r.outstanding_amount.toFixed(2),
          r.due_status,
          r.last_payment_date ?? "",
        ]
          .map((v) => escape(String(v)))
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `billing-students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"}.`);
    window.setTimeout(() => setToast(""), 2400);
  }
  function handleReceiveSubmitted() {
    setReceiveFor(null);
    setToast("Payment recorded.");
    window.setTimeout(() => setToast(""), 2400);
  }

  if (isLoading)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SkeletonCardGrid count={6} columns={3} />
        <SkeletonFilterBar />
        <SkeletonTable rows={8} />
      </div>
    );
  if (error) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load students."}</div>;

  return (
    <div>
      <PageHeader title="Students" sub="Fee details for every student on the roll." />

      {!deptPicked && (
        <div style={cardGridSx}>
          {deptSummary.map((d) => (
            <button key={d.dept} data-bill-lift onClick={() => pickDept(d.dept)} style={cardSx} title={d.dept}>
              <IconChip><BuildingIcon /></IconChip>
              <div style={clampNameSx}>{d.dept}</div>
              <StatLine value={d.students} label="students" />
              <ProgressBar pct={d.pct} />
            </button>
          ))}
        </div>
      )}

      {deptPicked && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <button
              data-bill-tab
              onClick={clearDept}
              style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M15 19l-7-7 7-7" /></svg>
              All departments
            </button>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.015em" }}>{deptPicked}</div>
              <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{deptTotalRoll} students on the roll</div>
            </div>
          </div>
          <div style={cardGridSx}>
            {yearBoxes.map((y) => (
              <button key={y.batch} data-bill-lift onClick={() => pickYear(y.batch)} style={cardSx}>
                <IconChip><CalendarIcon /></IconChip>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{y.label}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{y.batch}</div>
                </div>
                <StatLine value={y.students} label="fully paid" />
                <ProgressBar pct={y.pct} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div data-bill-lift style={{ ...filterBarSx, marginTop: 16, marginBottom: 0 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by student name or register no." style={inputSx} />
        <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ ...selectSx, minWidth: 220 }}>
          <option value="All">Department: All</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={batch} onChange={(e) => setBatch(e.target.value)} style={selectSx}>
          <option value="All">Batch: All</option>
          {batches.map((b) => (
            <option key={b} value={b}>Batch: {b}</option>
          ))}
        </select>
        <select value={due} onChange={(e) => setDue(e.target.value)} style={selectSx}>
          <option value="All">Fee Status: All</option>
          <option value="paid">Fee Status: Paid</option>
          <option value="partial">Fee Status: Partial</option>
          <option value="pending">Fee Status: Pending</option>
        </select>
        <button data-bill-tab onClick={clearFilters} style={clearBtnSx}>Clear all</button>
        <button data-bill-primary onClick={exportList} style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Export list</button>
      </div>

      <div style={{ ...tableWrapSx, marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
              <th style={thSx}>Student</th>
              <th style={thSx}>Register No.</th>
              <th style={thSx}>Department / Batch</th>
              <th style={thSx}>Quota</th>
              <th style={thSx}>Fee Structure</th>
              <th style={thRightSx}>Demand</th>
              <th style={thRightSx}>Paid</th>
              <th style={thRightSx}>Outstanding</th>
              <th style={thSx}>Status</th>
              <th style={thRightSx}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((r) => (
              <tr
                key={r.student_id}
                data-bill-rowtable
                onClick={() => router.push(`/billing/students/${r.student_id}`)}
                style={{ borderTop: "1px solid #f1f5f9", transition: "transform .15s ease,box-shadow .15s ease", position: "relative", cursor: "pointer" }}
              >
                <td style={{ padding: "12px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#eef3ff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flex: "0 0 30px" }}>{initialsOf(r.student_name)}</div>
                    <Link href={`/billing/students/${r.student_id}`} data-bill-tab style={{ background: "transparent", border: 0, padding: 0, fontSize: 13.5, fontWeight: 700, color: "#0f172a", cursor: "pointer", textAlign: "left", textDecoration: "none" }}>{r.student_name}</Link>
                  </div>
                </td>
                <td style={{ padding: "12px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: "#475569" }}>{r.register_number}</td>
                <td style={{ padding: "12px 10px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.department}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#64748b" }}>{r.batch}</div>
                </td>
                <td style={{ padding: "12px 10px", fontSize: 12.5, color: "#475569" }}>{r.quota}</td>
                <td style={{ padding: "12px 10px", fontSize: 12.5, color: "#475569", maxWidth: 200 }}>{r.fee_structures.join(", ")}</td>
                <td style={{ padding: "12px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{money(r.total_demand)}</td>
                <td style={{ padding: "12px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{money(r.paid_amount)}</td>
                <td style={{ padding: "12px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600 }}>{money(r.outstanding_amount)}</td>
                <td style={{ padding: "12px 10px" }}>
                  {r.due_status === "paid" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1d4ed8", color: "#fff", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />paid
                    </span>
                  )}
                  {r.due_status === "partial" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eef3ff", color: "#1d4ed8", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1d4ed8" }} />partial
                    </span>
                  )}
                  {r.due_status === "pending" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />pending
                    </span>
                  )}
                </td>
                <td style={{ padding: "12px 18px" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link href={`/billing/students/${r.student_id}`} data-bill-soft style={{ background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>Fee details</Link>
                    {r.due_status !== "paid" && r.outstanding_amount > 0 && (
                      <button data-bill-primary onClick={() => setReceiveFor(r)} style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Receive</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <div style={{ padding: 46, textAlign: "center" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>No students match these filters</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Clear the filters to see the full roll.</div>
          </div>
        )}
      </div>

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
