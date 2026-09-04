"use client";

// Pixel-exact port of the `isDemandPage` sc-if block from
// "Billing Module - Web/Billing Admin.dc.html" (lines 1047-1091).
//
// REAL BACKEND WIRING — no fake data. Every row comes from the real
// `GET /demand-categories/summary` endpoint (EOSbackend1, additive, no
// fake numbers). The design's per-category "Regenerate" action and its
// "last regenerated" timestamp have no backing table/field anywhere in
// the real schema (confirmed via demand.service.ts) — dropped rather
// than invented, along with the modal that triggered it.

import { useMemo, useState } from "react";
import {
  PageHeader,
  filterBarSx,
  inputSx,
  selectSx,
  clearBtnSx,
  tableWrapSx,
  thSx,
  thRightSx,
  tdSx,
  monoSx,
} from "@/modules/billing/PageHeader";
import { useDemandCategorySummary } from "@/modules/billing/api/fees";
import { SkeletonFilterBar, SkeletonTable } from "@/components/ui/Skeleton";

function fmtMoney(s: string): string {
  return `₹${Math.round(Number(s)).toLocaleString("en-IN")}`;
}

export default function DemandPage() {
  const { data: rows, isLoading, error } = useDemandCategorySummary();
  const [q, setQ] = useState("");
  const [applies, setApplies] = useState("All");

  const appliesOptions = useMemo(() => Array.from(new Set((rows ?? []).map((d) => d.applies_to))).sort(), [rows]);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((d) => {
      if (applies !== "All" && d.applies_to !== applies) return false;
      if (q && !d.category_name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, q, applies]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SkeletonFilterBar />
        <SkeletonTable rows={6} />
      </div>
    );
  }
  if (error) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load demand categories."}</div>;

  return (
    <div>
      <PageHeader title="Demand" sub="Demand categories raised for the current term" />

      <div style={filterBarSx}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search demand category"
          style={inputSx}
        />
        <select value={applies} onChange={(e) => setApplies(e.target.value)} style={selectSx}>
          <option value="All">Applies to: All</option>
          {appliesOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button
          data-bill-tab
          onClick={() => {
            setQ("");
            setApplies("All");
          }}
          style={clearBtnSx}
        >
          Clear
        </button>
      </div>

      <div style={tableWrapSx}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
              <th style={thSx}>Demand Category</th>
              <th style={thSx}>Applies To</th>
              <th style={thRightSx}>Students</th>
              <th style={thRightSx}>Raised</th>
              <th style={thRightSx}>Collected</th>
              <th style={thRightSx}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.category_id} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={{ ...tdSx, fontWeight: 700 }}>{d.category_name}</td>
                <td style={{ padding: "13px 10px", fontSize: 13, color: "#475569" }}>{d.applies_to}</td>
                <td style={{ padding: "13px 10px", textAlign: "right", ...monoSx, fontSize: 13 }}>{d.students}</td>
                <td style={{ padding: "13px 10px", textAlign: "right", ...monoSx, fontSize: 13 }}>{fmtMoney(d.raised)}</td>
                <td style={{ padding: "13px 10px", textAlign: "right", ...monoSx, fontSize: 13 }}>{fmtMoney(d.collected)}</td>
                <td style={{ padding: "13px 18px", textAlign: "right", ...monoSx, fontSize: 13, fontWeight: 600 }}>{fmtMoney(d.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 46, textAlign: "center" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>No demand categories match these filters</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Clear the filters to see the full list.</div>
          </div>
        )}
      </div>
    </div>
  );
}
