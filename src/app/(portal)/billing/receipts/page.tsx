"use client";

// Pixel-exact port of the `isReceipts` sc-if block from
// "Billing Module - Web/Billing Admin.dc.html" (lines 1093-1132).
//
// REAL BACKEND WIRING — no fake data. Rows come from the real
// `GET /fee-payments` endpoint (EOSbackend1, newly enriched this session
// with student_name/register_number/department/demand_category_name/
// fee_structure_name). The real print flow (receipt-number issuance +
// pixel-exact printable receipt) lives on the student detail page's
// Payment History tab — "Print" here navigates there for real rather than
// duplicating that flow or faking a print job.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  filterBarSx,
  inputSx,
  selectSx,
  clearBtnSx,
  tableWrapSx,
  thSx,
  thRightSx,
  monoSx,
} from "@/modules/billing/PageHeader";
import { useFeePaymentsList } from "@/modules/billing/api/fees";
import { SkeletonFilterBar, SkeletonTable } from "@/components/ui/Skeleton";

function fmtMoney(s: string): string {
  return `₹${Math.round(Number(s)).toLocaleString("en-IN")}`;
}
function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReceiptsPage() {
  const router = useRouter();
  const { data: rows, isLoading, error } = useFeePaymentsList();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("All");
  const [toast, setToast] = useState<string | null>(null);

  const modeOptions = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.payment_mode).filter(Boolean))) as string[], [rows]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (mode !== "All" && r.payment_mode !== mode) return false;
      if (q) {
        const s = q.toLowerCase();
        const name = (r.student_name ?? "").toLowerCase();
        const reg = (r.register_number ?? "").toLowerCase();
        if (!r.receipt_no.toLowerCase().includes(s) && !name.includes(s) && !reg.includes(s)) return false;
      }
      return true;
    });
  }, [rows, q, mode]);

  if (isLoading)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SkeletonFilterBar />
        <SkeletonTable rows={8} />
      </div>
    );
  if (error) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load receipts."}</div>;

  return (
    <div>
      <PageHeader title="Receipts" sub="All receipts issued at the billing counter" />

      <div style={filterBarSx}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search receipt no., student or register no."
          style={inputSx}
        />
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={selectSx}>
          <option value="All">Mode: All</option>
          {modeOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          data-bill-tab
          onClick={() => {
            setQ("");
            setMode("All");
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
              <th style={thSx}>Receipt No.</th>
              <th style={thSx}>Date</th>
              <th style={thSx}>Student</th>
              <th style={thSx}>Mode</th>
              <th style={thRightSx}>Amount</th>
              <th style={thRightSx}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                data-bill-rowtable
                onClick={() => router.push(`/billing/students/${r.student_id}`)}
                style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
              >
                <td style={{ padding: "13px 18px", ...monoSx, fontSize: 12.5, color: "#1d4ed8" }}>{r.receipt_no}</td>
                <td style={{ padding: "13px 10px", ...monoSx, fontSize: 12.5 }}>{fmtDate(r.payment_date)}</td>
                <td style={{ padding: "13px 10px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.student_name ?? "—"}</div>
                  <div style={{ ...monoSx, fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                    {r.register_number ?? "—"} <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>· {r.department}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 10px", fontSize: 13 }}>{r.payment_mode ?? "—"}</td>
                <td style={{ padding: "13px 10px", textAlign: "right", ...monoSx, fontSize: 13, fontWeight: 600 }}>{fmtMoney(r.amount_paid)}</td>
                <td style={{ padding: "13px 18px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    data-bill-soft
                    onClick={() => router.push(`/billing/students/${r.student_id}`)}
                    title="Open this student's Payment History to select and print this receipt"
                    style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
                  >
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 46, textAlign: "center" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>No receipts match these filters</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Clear the filters to see every receipt.</div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, boxShadow: "0 10px 24px rgba(15,23,42,.25)", zIndex: 80 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
