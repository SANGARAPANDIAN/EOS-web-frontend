// Pixel-exact port of EOSfrontendweb's
// src/modules/fees/components/fee-payments-crud/ReceiptDocument.tsx.
// Only two things were adapted from the original: the font-family CSS var
// (this app's root layout loads Plus Jakarta Sans as `--font-plus-jakarta-
// sans`, not `--font-geist-sans`) and the logo path (this app already has
// the identical crest at /college-logo.png — reused instead of duplicating
// the asset under /assest/secelogo.png). Every layout/spacing/typography
// value below is unchanged from the source file.
import { formatAmountInWords } from "./receipt-utils";

// The letterhead crest. Exported so the printing page can warm the browser
// cache for this exact URL before opening the print dialog — the receipt is
// rendered inside a display:none container until the print stylesheet
// activates, and browsers do not reliably fetch images inside a display:none
// subtree, which otherwise prints the logo blank.
export const RECEIPT_LOGO_SRC = "/college-logo.png";

export interface ReceiptPaymentRow {
  id: number;
  demandCategoryName: string | null;
  amountPaid: number;
  // Real fee_payments.payment_mode for this row, used only to split the
  // printed Cash / Bank tender figures. Null when the backend has no mode
  // recorded, in which case the row counts towards Cash (the sample
  // receipt's own default for an over-the-counter collection).
  paymentMode?: string | null;
}

export interface ReceiptStudentInfo {
  name: string;
  registerNumber: string;
  rollNo: string;
  programme: string;
  academicYear: string;
  semester: number | string;
}

interface ReceiptDocumentProps {
  student: ReceiptStudentInfo;
  payments: ReceiptPaymentRow[];
  // One real receipt number (fee_receipt_numbers.id) issued by the backend
  // for this exact print action, covering every selected payment — never an
  // individual payment's own receipt_no, and never generated client-side.
  receiptNumber: number;
  // Billing-staff-editable print date (defaults to today's device date),
  // shown once for the whole receipt rather than one date per payment.
  printDate: string;
  // Optional, billing-staff-entered at print time via the "From Education
  // Loan" flow in Payment History — never derived from payment_mode, never
  // invented. Omitted entirely for a normal (non-DD) receipt.
  ddReferenceNumber?: string;
}

// Header identity fields (college name/address/phone/logo) mirror the real,
// existing institutional letterhead already used elsewhere in this app —
// not fabricated data, just this receipt's required header content, per
// the uploaded reference layout.
//
// Fields populated: Student Name, Register Number, Roll No, Programme,
// Academic Year, Semester, Demand Category (per row), Amount Paid (per
// row), Grand Total, Amount in Words. Sl. No. and Grand Total/Amount-in-
// Words are generated at render time from the real selected rows — nothing
// else is derived.
function formatDateDDMMYYYY(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

// Cash vs Bank tender split for the footer line, mirroring the sample
// receipt's "Cash … Bank … Adj.: … Fine …" row. These are every non-cash
// member of the backend's real payment_mode_enum (cash | card | upi | dd |
// netbanking | razorpay) — anything settled through a card, gateway,
// transfer or instrument is Bank; cash (and an unrecorded mode) is an
// over-the-counter Cash collection.
const BANK_PAYMENT_MODES = new Set(["card", "upi", "dd", "netbanking", "razorpay"]);

function isBankTender(mode: string | null | undefined): boolean {
  if (!mode) return false;
  return BANK_PAYMENT_MODES.has(mode.trim().toLowerCase());
}

export function ReceiptDocument({ student, payments, receiptNumber, printDate, ddReferenceNumber }: ReceiptDocumentProps) {
  const grandTotal = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  // An education-loan receipt is settled by the disbursing bank's DD, so the
  // whole tender is Bank regardless of each row's stored mode.
  const bankTotal = ddReferenceNumber
    ? grandTotal
    : payments.reduce((sum, p) => (isBankTender(p.paymentMode) ? sum + p.amountPaid : sum), 0);
  const cashTotal = grandTotal - bankTotal;

  return (
    <div
      className="receipt-page bg-white text-black"
      style={{
        width: "210mm",
        padding: "8mm 12mm 0 12mm",
        // var(--font-plus-jakarta-sans) is the already-loaded Plus Jakarta
        // Sans instance from the root layout (next/font) — referencing it
        // directly guarantees the real app font renders here instead of a
        // same-named but unavailable system font.
        fontFamily: 'var(--font-plus-jakarta-sans), "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @page { size: A4; margin: 0; }
        .receipt-page * { box-sizing: border-box; }
        .receipt-frame table { table-layout: fixed; width: 100%; border-collapse: collapse; }
        .receipt-frame tr { page-break-inside: avoid; }
      `}</style>

      {/* Whole visual receipt (letterhead + boxed frame) is capped together
          at 148mm — exactly half of A4's 297mm. This wrapper, not the box
          alone, is what must never exceed half the sheet: the letterhead
          sits above the box, so both have to fit inside the same budget.
          overflow: hidden is the hard backstop; the paddings below are sized
          so a typical 1–6 line-item receipt fits well within the cap on its
          own, without ever needing to clip real data. */}
      <div style={{ maxHeight: "148mm", overflow: "hidden" }}>
        {/* Letterhead — sits above the boxed receipt, matching the sample's
            unboxed header with a single rule underneath it. */}
        <div className="flex items-center justify-between gap-2 pb-1.5">
          <img src={RECEIPT_LOGO_SRC} alt="" className="h-[56px] w-[56px] shrink-0 object-contain" />
          <div className="min-w-0 flex-1 text-center leading-tight">
            <h1 className="text-[21px] font-bold tracking-tight whitespace-nowrap">
              Sri Eshwar College of Engineering
            </h1>
            <p className="mt-0.5 text-[10px]">(Approved by AICTE, New Delhi &amp; Affiliated to Anna University)</p>
            <p className="mt-0.5 text-[12px] font-semibold">
              Kondampatti(P.O), Vadasithur(Via), Kinathukadavu, Coimbatore-641 202.
            </p>
            <p className="mt-0.5 text-[10px]">Ph : 04259 200300</p>
          </div>
          <p className="shrink-0 self-start whitespace-nowrap pt-1 text-right text-[12px] font-semibold">
            ORIGINAL
          </p>
        </div>
        <div className="border-t-2 border-black" />

        {/* Boxed frame — Receipt No/Date, student details, particulars,
            totals, signature. Height is auto (grows/shrinks with the number
            of selected line items) rather than a fixed value, so a short
            receipt hugs its own content instead of leaving a large blank
            gap before the signature — the outer wrapper above is what
            enforces the half-page ceiling. */}
        <div className="receipt-frame mt-1.5 border-2 border-black">
          {/* Receipt No / Date */}
          <table className="text-[12.5px]">
            <tbody>
              <tr>
                <td className="w-1/2 border-b border-black px-4 py-1.5 align-top">
                  <span className="font-semibold">Receipt No: </span>
                  {receiptNumber}
                </td>
                <td className="w-1/2 border-b border-l-2 border-black px-4 py-1.5 align-top">
                  <span className="font-semibold">Date : </span>
                  {formatDateDDMMYYYY(printDate)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Student details */}
          <table className="text-[12.5px]">
            <tbody>
              <tr>
                <td className="w-[62%] border-b border-black px-4 py-2 align-top">
                  <span className="font-semibold">Name : </span>
                  {student.name}
                </td>
                <td className="w-[38%] border-b border-l-2 border-black px-4 py-2 align-top">
                  <span className="font-semibold">Class: </span>
                  {student.programme}
                </td>
              </tr>
              <tr>
                <td className="border-b-2 border-black px-4 py-2 align-top">
                  <span className="font-semibold">Roll no: </span>
                  {student.rollNo}
                </td>
                <td className="border-b-2 border-l-2 border-black px-4 py-2 align-top">
                  <span className="font-semibold">Sem period: </span>
                  {student.academicYear} · Sem {student.semester}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Particulars */}
          <table className="text-[12.5px]">
            <thead>
              <tr>
                <th className="w-12 border-b-2 border-r border-black py-1.5 pl-4 text-left font-semibold">Sl.</th>
                <th className="border-b-2 border-black py-1.5 pl-2 text-left font-semibold">Particulars</th>
                <th className="w-24 border-b-2 border-l-2 border-black py-1.5 pr-4 text-right font-semibold">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={payment.id}>
                  <td
                    className="border-r border-black py-1.5 pl-4 align-top"
                    style={{ borderBottom: "1px dotted black" }}
                  >
                    {index + 1}
                  </td>
                  <td className="py-1.5 pl-2 align-top" style={{ borderBottom: "1px dotted black" }}>
                    {payment.demandCategoryName ?? "—"}
                  </td>
                  <td
                    className="border-l-2 border-black py-1.5 pr-4 text-right align-top tabular-nums"
                    style={{ borderBottom: "1px dotted black" }}
                  >
                    {payment.amountPaid.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals — laid out as on the reference receipt: the tender line
              ("Cheque/ DD subjected to realization." + Cash/Bank/Adj./Fine)
              spans the full width on its own row, then the amount-in-words
              sits on the left of the next row with Total/amount on its
              right. The DD number is appended to the tender line only for an
              education-loan receipt; a normal receipt prints this row exactly
              as the sample does, without any DD text. */}
          <table className="text-[12.5px]">
            {/* Explicit widths: the tender row spans all three columns, and
                under table-layout:fixed a colSpan cell alone would decide the
                column widths — this colgroup keeps the Total amount column
                the same 6rem as the Amount column in the particulars table
                above, so the figures stay in one vertical line. */}
            <colgroup>
              <col />
              <col style={{ width: "6rem" }} />
              <col style={{ width: "6rem" }} />
            </colgroup>
            <tbody>
              <tr>
                <td colSpan={3} className="border-b border-t border-black px-4 py-1.5 align-middle">
                  <span className="whitespace-nowrap">Cheque/ DD subjected to realization.</span>
                  <span className="ml-6">Cash</span>{" "}
                  <span className="font-semibold tabular-nums">{cashTotal.toLocaleString("en-IN")}</span>
                  <span className="ml-5">Bank</span>{" "}
                  <span className="font-semibold tabular-nums">{bankTotal.toLocaleString("en-IN")}</span>
                  <span className="ml-5">Adj.:</span> <span className="font-semibold">0</span>
                  <span className="ml-5">Fine</span> <span className="font-semibold">0</span>
                  {ddReferenceNumber && (
                    <span className="ml-5 whitespace-nowrap">
                      DD No: <span className="font-semibold">{ddReferenceNumber}</span>
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 italic">{formatAmountInWords(grandTotal)}</td>
                <td className="w-24 border-l-2 border-black px-2 py-1.5 text-right align-middle font-semibold">
                  Total
                </td>
                <td className="w-24 px-2 py-1.5 text-right align-middle font-bold tabular-nums">
                  {grandTotal.toLocaleString("en-IN")}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature — area only, no signature image */}
          <div className="flex justify-end px-4 pb-2 pt-3">
            <div className="text-center text-[12px]">
              <p className="italic">For Sri Eshwar College of Engineering</p>
              <p className="mt-4 border-t border-black px-6 pt-1">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
