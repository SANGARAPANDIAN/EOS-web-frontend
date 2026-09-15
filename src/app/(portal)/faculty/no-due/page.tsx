"use client";

import { useMemo, useState } from "react";
import { useMenteeNoDueStudents, type NoDueStudentRow } from "@/modules/advisor/api/no-due";

// CONNECTED FOR REAL — backed by the new GET /me/mentee-no-due/students
// (added this session; the original /me/no-due/* is HOD-only, so a class
// advisor had no endpoint at all before). Dues are computed live from real
// fee/library data, exactly like the HoD's own No-Due dashboard — no
// separate Transport/Hostel columns exist as fixed backend fields (fee
// categories are whatever demand_categories rows the institution's fee
// structure actually has), so this table lists whatever real categories
// come back instead of forcing them into fixed design columns.

function initialsOf(name: string) {
  const p = name.split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const FILTERS = ["All students", "Cleared", "Pending"] as const;

export default function AdvisorNoDuePage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All students");
  const [search, setSearch] = useState("");

  // Every mentee is always fetched, in both buckets — a student is never
  // just absent from the page. Which bucket they land in (cleared/pending)
  // is computed live by the backend from their real fee/library data, and
  // moves automatically the moment that data changes; "All students" merges
  // both so the roster is always fully visible regardless of dues status.
  const clearedStudents = useMenteeNoDueStudents({ status: "cleared" });
  const pendingStudents = useMenteeNoDueStudents({ status: "pending" });
  const clearedRows = clearedStudents.data ?? [];
  const pendingRows = pendingStudents.data ?? [];
  const isLoading = clearedStudents.isLoading || pendingStudents.isLoading;

  const rows = useMemo(() => {
    const base = filter === "Cleared" ? clearedRows : filter === "Pending" ? pendingRows : [...clearedRows, ...pendingRows];
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter((r) => r.student_id_no.toLowerCase().includes(q) || (r.roll_no ?? "").toLowerCase().includes(q) || (r.register_no ?? "").toLowerCase().includes(q));
  }, [filter, clearedRows, pendingRows, search]);

  const feesPendingCount = useMemo(() => pendingRows.filter((r) => r.fees.some((f) => !f.cleared)).length, [pendingRows]);
  const libraryPendingCount = useMemo(() => pendingRows.filter((r) => !r.library.cleared).length, [pendingRows]);
  const totalDue = useMemo(() => pendingRows.reduce((s, r) => s + r.total_pending, 0), [pendingRows]);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>No Due</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>Clearance status for your mentoring class · fees and library dues, computed live</div>
        </div>
        <div style={{ padding: "7px 13px", background: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: 8, fontSize: 11.5, fontWeight: 800, color: "#1D4ED8", letterSpacing: "0.05em" }}>
          MY CLASS
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16, marginTop: 20 }}>
        {[
          { label: "Fully cleared", value: String(clearedRows.length), sub: `of ${clearedRows.length + pendingRows.length} students` },
          { label: "Fees pending", value: String(feesPendingCount), sub: "students" },
          { label: "Library fines", value: String(libraryPendingCount), sub: "students" },
        ].map((s) => (
          <div key={s.label} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#7C8899", fontWeight: 500, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {pendingRows.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: "#7C8899", fontWeight: 600 }}>Total outstanding across the class: {inr(totalDue)}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <div
                key={f}
                data-advisor-lift=""
                onClick={() => setFilter(f)}
                style={{ padding: "9px 17px", borderRadius: 22, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: active ? "#EFF6FF" : "#fff", border: `1px solid ${active ? "#93C5FD" : "#E2E8F0"}`, color: active ? "#1D4ED8" : "#475569" }}
              >
                {f}
              </div>
            );
          })}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roll no, register no…"
          style={{ height: 40, minWidth: 220, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 13, fontWeight: 500, background: "#F8FAFC" }}
        />
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2.2fr 1fr 1.2fr",
            columnGap: 20,
            padding: "15px 22px",
            borderBottom: "1px solid #EEF1F6",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.09em",
            color: "#94A3B8",
          }}
        >
          <div>STUDENT</div>
          <div>FEES</div>
          <div>LIBRARY</div>
          <div>CLEARANCE</div>
        </div>
        {rows.map((r: NoDueStudentRow) => {
          const feesPending = r.fees.filter((f) => !f.cleared);
          const cleared = r.total_pending <= 0;
          return (
            <div key={r.id} data-advisor-lift="" style={{ display: "grid", gridTemplateColumns: "2fr 2.2fr 1fr 1.2fr", columnGap: 20, padding: "13px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
                  {initialsOf(r.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{r.roll_no ?? r.student_id_no}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {feesPending.length ? (
                  feesPending.map((f) => (
                    <div key={f.category} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>
                      <span>{f.category}</span>
                      <span style={{ whiteSpace: "nowrap" }}>{inr(f.pending_amount)}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Cleared</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: r.library.cleared ? "#475569" : "#DC2626" }}>{r.library.cleared ? "Clear" : inr(r.library.pending_amount)}</div>
              <div>
                <span
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 800,
                    background: cleared ? "#EFF6FF" : "#FEF2F2",
                    border: `1px solid ${cleared ? "#DBEAFE" : "#FECACA"}`,
                    color: cleared ? "#1D4ED8" : "#DC2626",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cleared ? "No due" : `${inr(r.total_pending)} pending`}
                </span>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && !isLoading && (
          <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
            {clearedRows.length + pendingRows.length === 0 ? "You are not the mentor for any class." : "No students match this filter."}
          </div>
        )}
      </div>
    </div>
  );
}
