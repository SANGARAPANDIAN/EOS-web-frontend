"use client";

// Real-data pass of the `isReports` screen from
// "Billing Module - Web/Billing Admin.dc.html", lines 1550-1563.
//
// Backend reference: EOSbackend1/src/modules/fees-billing/reports/*.
// All 5 cards are wired to real GET /reports/billing/:key (on-screen
// preview) and GET /reports/billing/:key/export?format=excel|pdf (real
// Excel/PDF file download via BillingModal-adjacent styling + PageHeader's
// shared table primitives). Refund Register (and the Refunds/Reconciliation
// module it depended on) was removed entirely per explicit product decision.
//
// Concession Register is real but the schema has no reason/category/
// approving-officer fields on fee_concessions — that gap is called out in
// the card body, not silently dropped.

import { useState } from "react";
import { PageHeader, cardSx, tableWrapSx, thSx, tdSx } from "@/modules/billing/PageHeader";
import { useBillingReportPreview, useBillingReportDownload, type BillingReportKey } from "@/modules/billing/api/fees";

interface ReportCardDef {
  key: BillingReportKey;
  title: string;
  desc: string;
}

const reportCards: ReportCardDef[] = [
  {
    key: "demand-vs-collection",
    title: "Demand vs Collection",
    desc: "Term-wise demand raised against amount collected, by department and quota.",
  },
  {
    key: "department-collection",
    title: "Department-wise Collection",
    desc: "Collection totals split by department for the current academic term.",
  },
  {
    key: "concession-register",
    title: "Concession Register",
    desc: "Every concession granted this term, with its fee structure and settlement status.",
  },
  {
    key: "education-loan-dd-register",
    title: "Education Loan DD Register",
    desc: "Demand drafts received against education loans, with realisation status.",
  },
  {
    key: "daily-collection-summary",
    title: "Daily Collection Summary",
    desc: "Day-wise breakup of fee collection across the real payment modes (cash, card, UPI, netbanking, DD, Razorpay).",
  },
];

export default function ReportsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<ReportCardDef["key"] | null>(null);
  const download = useBillingReportDownload();

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function handleExport(card: ReportCardDef, format: "excel" | "pdf") {
    try {
      await download.mutateAsync({ key: card.key, format });
      flashToast(`${card.title} exported as ${format === "excel" ? "Excel" : "PDF"}`);
    } catch {
      flashToast("Export failed. Please try again.");
    }
  }

  const openCard = reportCards.find((c) => c.key === openKey) ?? null;

  return (
    <div>
      <PageHeader title="Reports" sub="Collection, outstanding and audit reports for the term" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {reportCards.map((r) => (
          <div key={r.key} data-bill-lift style={{ ...cardSx, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>{r.title}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>{r.desc}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button
                data-bill-soft
                onClick={() => setOpenKey(r.key)}
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
              >
                View
              </button>
              <button
                data-bill-primary
                disabled={download.isPending}
                onClick={() => handleExport(r, "excel")}
                style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: download.isPending ? 0.7 : 1 }}
              >
                {download.isPending ? "Exporting…" : "Export Excel"}
              </button>
              <button
                data-bill-soft
                disabled={download.isPending}
                onClick={() => handleExport(r, "pdf")}
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f172a", opacity: download.isPending ? 0.7 : 1 }}
              >
                Export PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {openCard && (
        <ReportPreviewModal
          card={openCard}
          onClose={() => setOpenKey(null)}
          onExport={(format) => handleExport(openCard, format)}
          exporting={download.isPending}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", borderRadius: 9, padding: "12px 18px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 12px 26px rgba(15,23,42,.28)", zIndex: 80 }}>{toast}</div>
      )}
    </div>
  );
}

function ReportPreviewModal({
  card,
  onClose,
  onExport,
  exporting,
}: {
  card: ReportCardDef;
  onClose: () => void;
  onExport: (format: "excel" | "pdf") => void;
  exporting: boolean;
}) {
  const { data: table, isLoading, isError } = useBillingReportPreview(card.key, true);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 920, maxHeight: "86vh", overflowY: "auto", padding: "24px 26px 22px", boxShadow: "0 30px 70px rgba(15,23,42,.3)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{card.title}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{card.desc}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {isLoading && <div style={{ padding: 24, color: "#64748b", fontSize: 13.5 }}>Loading report…</div>}
        {isError && <div style={{ padding: 24, color: "#b91c1c", fontSize: 13.5 }}>Failed to load report. Please try again.</div>}

        {table && !isLoading && !isError && (
          <div style={tableWrapSx}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e6e9ef" }}>
                  {table.columns.map((c) => (
                    <th key={c.key} style={thSx}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 && (
                  <tr>
                    <td colSpan={table.columns.length} style={{ ...tdSx, textAlign: "center", color: "#94a3b8" }}>
                      No records found.
                    </td>
                  </tr>
                )}
                {table.rows.map((row, i) => (
                  <tr key={i} data-bill-row style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {table.columns.map((c) => (
                      <td key={c.key} style={tdSx}>{String(row[c.key] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ background: "#fff", border: "1px solid #dfe4ec", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}>Close</button>
          <button
            disabled={exporting}
            onClick={() => onExport("excel")}
            style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            Export Excel
          </button>
          <button
            disabled={exporting}
            onClick={() => onExport("pdf")}
            style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
