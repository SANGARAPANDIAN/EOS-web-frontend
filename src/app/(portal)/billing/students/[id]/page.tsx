"use client";

// Pixel-exact port of the `isStudent` sc-if block (5 tabs: Receive/Demand/
// History/Concession/DD) from "Billing Module - Web/Billing Admin.dc.html"
// (lines 860-1044).
//
// REAL BACKEND WIRING — no fake data. Reads through EOSbackend1's real
// `GET /fee-payments/students/:studentId/workspace` (ROLES.BILLING added
// this session) — real profile, real fee_summary, real demand_summary
// (one row per fee structure, no fake per-category split), real
// payment_history, real fee_concessions, real education_loan_dd.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import {
  useStudentWorkspace,
  useFeePaymentsList,
  useIssueReceiptNumber,
  useDeleteConcession,
  useDeleteEducationLoanDD,
  type StudentWorkspace,
} from "@/modules/billing/api/fees";

type WorkspaceConcessionRow = StudentWorkspace["fee_concessions"][number];
type WorkspaceEducationLoanDdRow = StudentWorkspace["education_loan_dd"][number];
import { ReceivePaymentModal, toastSx } from "@/modules/billing/ReceivePaymentModal";
import { ConcessionModal } from "@/modules/billing/ConcessionModal";
import { EducationLoanDDModal } from "@/modules/billing/EducationLoanDDModal";
import { RECEIPT_LOGO_SRC, ReceiptDocument, type ReceiptPaymentRow, type ReceiptStudentInfo } from "@/modules/billing/ReceiptDocument";

type TabKey = "receive" | "demand" | "history" | "concession" | "dd";

function tabBtnSx(active: boolean) {
  return {
    background: "transparent",
    border: 0,
    borderBottom: active ? "2px solid #1d4ed8" : "2px solid transparent",
    color: active ? "#1d4ed8" : "#64748b",
    fontSize: 13.5,
    fontWeight: 700,
    padding: "0 0 12px",
    cursor: "pointer",
  } as const;
}
function initialsOf(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function money(s: string | number): string {
  return `₹${Math.round(Number(s)).toLocaleString("en-IN")}`;
}
// Local device date in YYYY-MM-DD (not toISOString, which shifts to UTC and
// can land on the wrong calendar day depending on timezone) — this is what
// pre-fills the editable print-date field before every print.
const inputSxSmall = {
  height: 34,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  padding: "0 10px",
  fontSize: 12.5,
  color: "#0f172a",
  outline: "none",
} as const;
function todayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BillingStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = Number(params.id);
  const { data: ws, isLoading, error } = useStudentWorkspace(studentId);
  // /fee-payments is the same real, enriched flat receipt list the Fee
  // Payments "History" tab and Receipts page use — filtered client-side to
  // this student to get each payment's real demand_category_name, which
  // the workspace's payment_history rows don't carry.
  const { data: allPayments } = useFeePaymentsList();
  const issueReceiptNumber = useIssueReceiptNumber();
  const deleteConcession = useDeleteConcession();
  const deleteEducationLoanDD = useDeleteEducationLoanDD();

  const [tab, setTab] = useState<TabKey>("receive");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [concessionModal, setConcessionModal] = useState<{ editing: WorkspaceConcessionRow | null } | null>(null);
  const [ddModal, setDdModal] = useState<{ editing: WorkspaceEducationLoanDdRow | null } | null>(null);

  // ---- Print Receipt state (Payment History tab) ----
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);
  /**
   * Anchor for shift-click range selection. Holding shift and clicking a
   * second row selects everything between the two, which is how people
   * expect to pick a run of receipts to print together.
   */
  const lastClickedPaymentId = useRef<number | null>(null);

  const [printDate, setPrintDate] = useState(todayLocalDateString());
  const [isEducationLoanReceipt, setIsEducationLoanReceipt] = useState(false);
  const [ddReferenceNumber, setDdReferenceNumber] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<number | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrinting) return;
    function handleAfterPrint() {
      setIsPrinting(false);
      setIsEducationLoanReceipt(false);
      setDdReferenceNumber("");
      setReceiptNumber(null);
      setSelectedPaymentIds([]);
    }
    window.addEventListener("afterprint", handleAfterPrint);
    // The receipt lives in a display:none container until the print
    // stylesheet activates, and browsers do not reliably fetch images inside
    // a display:none subtree — firing print() straight away left the
    // letterhead crest blank on the printout. So decode the logo first and
    // only then open the print dialog (and still open it if the image fails,
    // so a missing asset can never block printing).
    let cancelled = false;
    let timer = 0;
    const openPrintDialog = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => window.print(), 50);
    };
    const logo = new window.Image();
    logo.src = RECEIPT_LOGO_SRC;
    if (logo.complete) {
      openPrintDialog();
    } else {
      logo.onload = openPrintDialog;
      logo.onerror = openPrintDialog;
    }
    return () => {
      cancelled = true;
      logo.onload = null;
      logo.onerror = null;
      window.removeEventListener("afterprint", handleAfterPrint);
      window.clearTimeout(timer);
    };
  }, [isPrinting]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleDeleteConcession(c: WorkspaceConcessionRow) {
    if (!window.confirm("Delete this fee concession? This cannot be undone.")) return;
    deleteConcession.mutate(
      { id: c.id, feeStructureId: c.fee_structure_id },
      {
        onSuccess: () => showToast("Concession deleted"),
        onError: (err) => showToast(err instanceof Error ? err.message : "Could not delete the concession."),
      },
    );
  }

  function handleDeleteDD(d: WorkspaceEducationLoanDdRow) {
    if (!window.confirm("Delete this education loan DD? This cannot be undone.")) return;
    deleteEducationLoanDD.mutate(
      { id: d.id, demandMappingId: d.student_fee_demand_mapping_id },
      {
        onSuccess: () => showToast("Education loan DD deleted"),
        onError: (err) => showToast(err instanceof Error ? err.message : "Could not delete the DD."),
      },
    );
  }

  if (isLoading) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Loading student…</div>;

  if (error || !ws) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: "#64748b", marginBottom: 16 }}>
          <button
            onClick={() => router.push("/billing/students")}
            data-bill-tab
            style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M15 19l-7-7 7-7" /></svg>
            Back to Students
          </button>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: 46, textAlign: "center" }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>Student not found</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>{error instanceof Error ? error.message : "This student record doesn't exist or the link is invalid."}</div>
        </div>
      </div>
    );
  }

  const p = ws.student_profile;
  const fs = ws.fee_summary;
  const pct = Number(fs.total_demand) > 0 ? (Number(fs.total_paid) / Number(fs.total_demand)) * 100 : 0;
  const demandMappingIds = ws.demand_summary.map((d) => d.student_fee_demand_mapping_id);

  // Real demand_category_name per payment, keyed by fee_payments.id — sourced
  // from /fee-payments (the flat receipt list), filtered to this student.
  const categoryByPaymentId = new Map<number, string | null>();
  for (const row of allPayments ?? []) {
    if (row.student_id === studentId) categoryByPaymentId.set(row.id, row.demand_category_name);
  }
  const demandById = new Map(ws.demand_summary.map((d) => [d.student_fee_demand_mapping_id, d]));

  const sortedHistory = [...ws.payment_history].sort((a, b) => (b.payment_date ?? "").localeCompare(a.payment_date ?? ""));
  const selectablePaymentIds = sortedHistory.map((pmt) => pmt.id);
  const allPaymentsSelected = selectablePaymentIds.length > 0 && selectablePaymentIds.every((id) => selectedPaymentIds.includes(id));
  const somePaymentsSelected = selectedPaymentIds.length > 0 && !allPaymentsSelected;

  /**
   * Selects from a click anywhere on the row, not just the checkbox — the
   * whole row is the target. Clicks that land on a control inside the row
   * (the receipt link, a button) are ignored so they keep their own
   * behaviour instead of toggling selection underneath the user.
   */
  function handleRowClick(event: React.MouseEvent<HTMLTableRowElement>, id: number) {
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea,label")) return;

    if (event.shiftKey && lastClickedPaymentId.current !== null) {
      const ids = selectablePaymentIds;
      const from = ids.indexOf(lastClickedPaymentId.current);
      const to = ids.indexOf(id);
      if (from !== -1 && to !== -1) {
        const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
        // Extend rather than replace, so an existing selection is kept.
        setSelectedPaymentIds((prev) => Array.from(new Set([...prev, ...range])));
        return;
      }
    }

    lastClickedPaymentId.current = id;
    togglePayment(id);
  }

  function togglePayment(id: number) {
    setSelectedPaymentIds((prev) => (prev.includes(id) ? prev.filter((selId) => selId !== id) : [...prev, id]));
  }
  function toggleAllPayments() {
    setSelectedPaymentIds(allPaymentsSelected ? [] : selectablePaymentIds);
  }

  const selectedForReceipt = sortedHistory.filter((pmt) => selectedPaymentIds.includes(pmt.id));
  const receiptPayments: ReceiptPaymentRow[] = selectedForReceipt.map((pmt) => ({
    id: pmt.id,
    demandCategoryName: categoryByPaymentId.get(pmt.id) ?? null,
    amountPaid: Number(pmt.amount_paid),
    paymentMode: pmt.payment_mode,
  }));
  // Academic year / semester come from the real demand_summary row(s) behind
  // the selected payments — joined on all selected mappings; distinct real
  // values are shown together rather than arbitrarily picking one.
  const selectedMappingIds = Array.from(new Set(selectedForReceipt.map((pmt) => pmt.student_fee_demand_mapping_id)));
  const selectedDemands = selectedMappingIds.map((id) => demandById.get(id)).filter((d): d is NonNullable<typeof d> => !!d);
  const academicYears = Array.from(new Set(selectedDemands.map((d) => d.academic_year)));
  const semesters = Array.from(new Set(selectedDemands.map((d) => d.semester ?? "—")));
  const receiptStudent: ReceiptStudentInfo = {
    name: p.student_name ?? "—",
    registerNumber: p.register_number ?? "—",
    rollNo: p.roll_no ?? "—",
    programme: p.programme,
    academicYear: academicYears.join(", ") || "—",
    semester: semesters.join(", ") || "—",
  };

  const canPrint =
    selectedPaymentIds.length > 0 && printDate.trim() !== "" && (!isEducationLoanReceipt || ddReferenceNumber.trim() !== "");

  function handlePrintClick() {
    setIssueError(null);
    issueReceiptNumber.mutate(
      { fee_payment_ids: selectedPaymentIds, print_date: printDate },
      {
        onSuccess: (data) => {
          setReceiptNumber(data.id);
          setIsPrinting(true);
        },
        onError: (err) => {
          setIssueError(err instanceof Error ? err.message : "Couldn't issue a receipt number. Please try again.");
        },
      },
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: "#64748b", marginBottom: 16 }}>
        <button
          onClick={() => router.push("/billing/students")}
          data-bill-tab
          style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M15 19l-7-7 7-7" /></svg>
          Back to Students
        </button>
        <span style={{ color: "#cbd5e1" }}>›</span>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{p.register_number ?? p.student_id_no}</span>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#475569", flex: "0 0 64px" }}>
          {initialsOf(p.student_name ?? "??")}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{p.student_name ?? "—"}</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#475569", marginTop: 2 }}>{p.register_number ?? "—"}</div>
          <div style={{ fontSize: 13.5, color: "#475569", marginTop: 4 }}>{p.programme} · {p.department}</div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700, color: "#334155", marginTop: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#475569" }} />{p.quota}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 44, flexWrap: "wrap", margin: "24px 0 8px" }}>
        <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Total Demand</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, marginTop: 4 }}>{money(fs.total_demand)}</div></div>
        <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Paid Amount</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, marginTop: 4 }}>{money(fs.total_paid)}</div></div>
        <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Outstanding</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, marginTop: 4 }}>{money(fs.total_outstanding)}</div></div>
        <div>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>Collection %</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, marginTop: 4 }}>{pct.toFixed(1)}%</div>
          <div style={{ width: 110, height: 5, background: "#e8eef7", borderRadius: 4, marginTop: 6, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: "#1d4ed8" }} />
          </div>
        </div>
        <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Fee Structures</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{ws.demand_summary.map((d) => d.fee_structure_name).join(", ") || "—"}</div></div>
        <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Batch</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 600, marginTop: 6 }}>{p.batch}</div></div>
      </div>

      <div style={{ display: "flex", gap: 26, borderBottom: "1px solid #e6e9ef", margin: "22px 0 24px" }}>
        <button onClick={() => setTab("receive")} style={tabBtnSx(tab === "receive")}>Receive Payment</button>
        <button onClick={() => setTab("demand")} style={tabBtnSx(tab === "demand")}>Demand Details</button>
        <button onClick={() => setTab("history")} style={tabBtnSx(tab === "history")}>Payment History</button>
        <button onClick={() => setTab("concession")} style={tabBtnSx(tab === "concession")}>Fee Concessions</button>
        <button onClick={() => setTab("dd")} style={tabBtnSx(tab === "dd")}>Education Loan DD</button>
      </div>

      {tab === "receive" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          <div data-bill-lift style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Payment Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Paid Amount</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600 }}>{money(fs.total_paid)}</div></div>
              <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Outstanding Amount</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600 }}>{money(fs.total_outstanding)}</div></div>
              <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Last Payment</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600 }}>{ws.payment_summary.last_payment_date ? new Date(ws.payment_summary.last_payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div></div>
              <div><div style={{ fontSize: 12.5, color: "#64748b" }}>Payments on record</div><div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600 }}>{ws.payment_summary.payment_count}</div></div>
            </div>
          </div>
          <div data-bill-lift style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => setModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "#eef3ff", border: 0, borderRadius: 9, padding: "12px 14px", fontSize: 13.5, fontWeight: 700, color: "#1d4ed8", cursor: "pointer" }}>
                <span style={{ fontSize: 15 }}>+</span>Receive Payment
              </button>
              <button data-bill-icon onClick={() => setTab("history")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "transparent", border: 0, borderRadius: 9, padding: "12px 14px", fontSize: 13.5, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Print Receipt</button>
              <button data-bill-icon onClick={() => setTab("concession")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "transparent", border: 0, borderRadius: 9, padding: "12px 14px", fontSize: 13.5, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Apply Concession</button>
              <button data-bill-icon onClick={() => setTab("dd")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "transparent", border: 0, borderRadius: 9, padding: "12px 14px", fontSize: 13.5, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>Add Education Loan DD</button>
            </div>
          </div>
        </div>
      )}

      {tab === "demand" && (
        <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
                <th style={{ textAlign: "left", padding: "14px 18px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Fee Structure</th>
                <th style={{ textAlign: "left", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Academic Year</th>
                <th style={{ textAlign: "right", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Demand</th>
                <th style={{ textAlign: "right", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Paid</th>
                <th style={{ textAlign: "right", padding: "14px 18px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {ws.demand_summary.map((d) => (
                <tr
                  key={d.student_fee_demand_mapping_id}
                  data-bill-rowtable
                  onClick={() => setModalOpen(true)}
                  style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                  title="Receive a payment against this student's fee structures"
                >
                  <td style={{ padding: "13px 18px", fontSize: 13.5, fontWeight: 600 }}>{d.fee_structure_name}</td>
                  <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }}>{d.academic_year}</td>
                  <td style={{ padding: "13px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{money(d.total_amount)}</td>
                  <td style={{ padding: "13px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{money(d.paid_amount)}</td>
                  <td style={{ padding: "13px 18px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600 }}>{money(d.outstanding_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && (
        <div className="print:hidden">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, color: "#475569" }}>All payments recorded against this student.</div>
            <button data-bill-primary onClick={() => setModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              <span style={{ fontSize: 15 }}>+</span>Receive Payment
            </button>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
                  <th style={{ padding: "14px 8px 14px 18px", width: 36 }}>
                    <input
                      type="checkbox"
                      aria-label="Select all payments"
                      checked={allPaymentsSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePaymentsSelected;
                      }}
                      onChange={toggleAllPayments}
                      disabled={selectablePaymentIds.length === 0}
                      style={{ width: 15, height: 15, accentColor: "#1d4ed8" }}
                    />
                  </th>
                  <th style={{ textAlign: "left", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Receipt No.</th>
                  <th style={{ textAlign: "left", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Mode</th>
                  <th style={{ textAlign: "left", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Partial?</th>
                  <th style={{ textAlign: "right", padding: "14px 18px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((pmt) => {
                  const isSelected = selectedPaymentIds.includes(pmt.id);
                  return (
                    <tr
                      key={pmt.id}
                      data-bill-rowtable
                      onClick={(e) => handleRowClick(e, pmt.id)}
                      // Reachable and operable without a mouse: the row takes
                      // focus and Enter/Space toggles it, matching the
                      // checkbox it stands in for.
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`Select payment ${pmt.receipt_no}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          lastClickedPaymentId.current = pmt.id;
                          togglePayment(pmt.id);
                        }
                      }}
                      style={{
                        borderTop: "1px solid #f1f5f9",
                        background: isSelected ? "#eef3ff" : undefined,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "";
                      }}
                    >
                      <td style={{ padding: "12px 8px 12px 18px" }}>
                        <input
                          type="checkbox"
                          // The row handler already covers this click; without
                          // stopping propagation the two would fire and cancel
                          // each other out.
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select payment ${pmt.receipt_no}`}
                          checked={isSelected}
                          onChange={() => {
                            lastClickedPaymentId.current = pmt.id;
                            togglePayment(pmt.id);
                          }}
                          style={{ width: 15, height: 15, accentColor: "#1d4ed8" }}
                        />
                      </td>
                      <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }}>{new Date(pmt.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: "#1d4ed8" }}>{pmt.receipt_no}</td>
                      <td style={{ padding: "13px 10px", fontSize: 13 }}>{pmt.payment_mode ?? "—"}</td>
                      <td style={{ padding: "13px 10px", fontSize: 13 }}>{pmt.is_partial ? "Yes" : "No"}</td>
                      <td style={{ padding: "13px 18px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600 }}>{money(pmt.amount_paid)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ws.payment_history.length === 0 && <div style={{ padding: 44, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>No payments recorded yet.</div>}
          </div>

          {ws.payment_history.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "14px 16px", marginTop: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 13, color: "#475569" }}>
                  Selected payments: <span style={{ fontWeight: 700, color: "#0f172a" }}>{selectedPaymentIds.length}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>Print date</span>
                    <input
                      type="date"
                      value={printDate}
                      onChange={(e) => setPrintDate(e.target.value)}
                      style={inputSxSmall}
                    />
                  </label>
                  {/* Always offered, for any selected payment: whether this
                      print is an education-loan (DD) receipt is the billing
                      staff's call at print time, not something derivable from
                      whether a prior education_loan_dd row happens to exist
                      for the student. Toggling it on reveals the DD Reference
                      Number field below and puts the DD number on the printed
                      receipt; left off, printing works exactly as before with
                      no DD text at all. */}
                  <button
                    type="button"
                    data-bill-tab
                    disabled={selectedPaymentIds.length === 0}
                    onClick={() => setIsEducationLoanReceipt((v) => !v)}
                    aria-pressed={isEducationLoanReceipt}
                    style={{
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: selectedPaymentIds.length === 0 ? "not-allowed" : "pointer",
                      opacity: selectedPaymentIds.length === 0 ? 0.5 : 1,
                      border: isEducationLoanReceipt ? "1px solid #1d4ed8" : "1px solid #e2e8f0",
                      background: isEducationLoanReceipt ? "#eef3ff" : "#fff",
                      color: isEducationLoanReceipt ? "#1d4ed8" : "#334155",
                    }}
                  >
                    From Education Loan
                  </button>
                  <button
                    type="button"
                    data-bill-primary
                    disabled={!canPrint || issueReceiptNumber.isPending}
                    onClick={handlePrintClick}
                    style={{
                      background: "#1d4ed8",
                      color: "#fff",
                      border: 0,
                      borderRadius: 9,
                      padding: "10px 16px",
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: !canPrint || issueReceiptNumber.isPending ? "not-allowed" : "pointer",
                      opacity: !canPrint || issueReceiptNumber.isPending ? 0.5 : 1,
                    }}
                  >
                    {issueReceiptNumber.isPending ? "Preparing…" : "Print Receipt"}
                  </button>
                </div>
              </div>

              {issueError && <div style={{ fontSize: 12.5, color: "#b91c1c" }}>{issueError}</div>}

              {isEducationLoanReceipt && (
                <label style={{ display: "block", maxWidth: 280 }}>
                  <span style={{ display: "block", marginBottom: 4, fontSize: 12.5, fontWeight: 700, color: "#334155" }}>DD Reference Number</span>
                  <input
                    type="text"
                    required
                    value={ddReferenceNumber}
                    onChange={(e) => setDdReferenceNumber(e.target.value)}
                    placeholder="e.g. DD2025000441"
                    style={{ ...inputSxSmall, width: "100%" }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* Portaled to a direct child of <body> (id="receipt-print-root") so the
          global print rule in globals.css can hide every other top-level
          element regardless of how deeply this component is nested inside
          them. `hidden print:block` keeps it invisible on screen and out of
          normal layout until the print stylesheet activates it. */}
      {isPrinting &&
        receiptNumber !== null &&
        createPortal(
          <div id="receipt-print-root" data-print-root className="hidden print:block">
            <ReceiptDocument
              student={receiptStudent}
              payments={receiptPayments}
              receiptNumber={receiptNumber}
              printDate={printDate}
              ddReferenceNumber={isEducationLoanReceipt ? ddReferenceNumber.trim() : undefined}
            />
          </div>,
          document.body,
        )}

      {tab === "concession" && (
        <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Fee Concessions</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Concessions sanctioned against this student&apos;s demand.</div>
            </div>
            <button data-bill-primary onClick={() => setConcessionModal({ editing: null })} style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>+ Add Concession</button>
          </div>
          {ws.fee_concessions.map((c) => (
            <div key={c.id} data-bill-row style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderTop: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.fee_structure_name}</div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{c.settled_date ? `Settled ${new Date(c.settled_date).toLocaleDateString("en-IN")}` : "Not yet settled"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600 }}>{money(c.concession_amount)}</div>
                <span style={{ background: "#f1f5f9", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700, color: "#334155" }}>{c.is_settled ? "settled" : "pending"}</span>
                <button
                  type="button"
                  aria-label="Edit concession"
                  data-bill-icon
                  onClick={() => setConcessionModal({ editing: c })}
                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                </button>
                <button
                  type="button"
                  aria-label="Delete concession"
                  data-bill-icon
                  onClick={() => handleDeleteConcession(c)}
                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#b91c1c" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                </button>
              </div>
            </div>
          ))}
          {ws.fee_concessions.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: "#64748b", fontSize: 13.5 }}>No concessions recorded for this student.</div>
          )}
        </div>
      )}

      {tab === "dd" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, color: "#475569" }}>Education loan demand drafts recorded for this student.</div>
            <button data-bill-primary onClick={() => setDdModal({ editing: null })} style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>+ Add DD</button>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
                  <th style={{ textAlign: "left", padding: "14px 18px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>DD Reference No.</th>
                  <th style={{ textAlign: "left", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Bank</th>
                  <th style={{ textAlign: "right", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Amount</th>
                  <th style={{ textAlign: "left", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "14px 10px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Ack. Receipt No.</th>
                  <th style={{ textAlign: "right", padding: "14px 18px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ws.education_loan_dd.map((d) => (
                  <tr key={d.id} data-bill-rowtable style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "13px 18px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }}>{d.dd_reference_number}</td>
                    <td style={{ padding: "13px 10px", fontSize: 13.5 }}>{d.bank_name}</td>
                    <td style={{ padding: "13px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{money(d.amount)}</td>
                    <td style={{ padding: "13px 10px", fontSize: 13, fontWeight: 600 }}>{d.status}</td>
                    <td style={{ padding: "13px 10px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, color: "#64748b" }}>{d.acknowledgement_receipt_no ?? "—"}</td>
                    <td style={{ padding: "13px 18px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          aria-label="Edit education loan DD"
                          data-bill-icon
                          onClick={() => setDdModal({ editing: d })}
                          style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                        </button>
                        <button
                          type="button"
                          aria-label="Delete education loan DD"
                          data-bill-icon
                          onClick={() => handleDeleteDD(d)}
                          style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#b91c1c" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ws.education_loan_dd.length === 0 && (
              <div style={{ padding: 44, textAlign: "center" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>No education loan DDs found</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Add a DD to get started.</div>
              </div>
            )}
          </div>
        </div>
      )}

      <ReceivePaymentModal
        open={modalOpen}
        fixedStudentId={studentId}
        demandMappingIds={demandMappingIds}
        onClose={() => setModalOpen(false)}
        onSubmitted={() => {
          setModalOpen(false);
          showToast("Payment recorded");
        }}
      />

      <ConcessionModal
        open={concessionModal !== null}
        demandSummary={ws.demand_summary}
        editing={concessionModal?.editing ?? null}
        onClose={() => setConcessionModal(null)}
        onSubmitted={() => {
          showToast(concessionModal?.editing ? "Concession updated" : "Concession added");
          setConcessionModal(null);
        }}
      />

      <EducationLoanDDModal
        open={ddModal !== null}
        demandSummary={ws.demand_summary}
        editing={ddModal?.editing ?? null}
        onClose={() => setDdModal(null)}
        onSubmitted={() => {
          showToast(ddModal?.editing ? "Education loan DD updated" : "Education loan DD added");
          setDdModal(null);
        }}
      />

      {toast && <div style={toastSx}>{toast}</div>}
    </div>
  );
}
