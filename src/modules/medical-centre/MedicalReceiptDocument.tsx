// Printable medical receipt.
//
// The letterhead, the boxed frame, the rule weights and the patient block
// deliberately mirror src/modules/billing/ReceiptDocument.tsx (the fees
// receipt) so both documents read as the same institution's paperwork. What
// differs below the patient block is the medical content: a reason-for-
// consultation band, then a particulars table with per-unit pricing, then the
// total — the layout a dispensary receipt is expected to have.
//
// Sized to half of A4 in portrait: 210mm wide, capped at 148mm tall.

export const RECEIPT_LOGO_SRC = "/college-logo.png";

export interface MedicalReceiptItem {
  id: number;
  item_type: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface MedicalReceiptData {
  receipt_no: string;
  bill_id: number;
  issued_at: string;
  patient: {
    name: string;
    department: string | null;
    /** Roll number (student) or staff code (faculty); null for a walk-in. */
    identifier: string | null;
    /** True when the details came from a linked OPD visit, not typed in. */
    is_linked: boolean;
  };
  reason: string | null;
  attended_by: { name: string; designation: string | null } | null;
  payment_mode: string;
  /** Set only for a UPI settlement; null for cash and the other modes. */
  upi_transaction_id: string | null;
  status: string;
  items: MedicalReceiptItem[];
  totals: { medicine: number; service: number; total: number };
}

/** Date and time of issue — a dispensary receipt is a same-day document, so
 *  the hour it was raised matters as much as the date. */
function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${dd}/${mm}/${d.getFullYear()}, ${time}`;
}

function rupees(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** Indian numbering (thousand / lakh / crore), as printed on the fees receipt. */
function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ONES[h] + " Hundred" + (r ? " and " : "") : "") + (r ? twoDigits(r) : "");
}

function amountInWords(value: number): string {
  const whole = Math.floor(Math.abs(value));
  const paise = Math.round((Math.abs(value) - whole) * 100);
  if (whole === 0 && paise === 0) return "Rupees Zero Only";

  const parts: string[] = [];
  const crore = Math.floor(whole / 10000000);
  const lakh = Math.floor((whole % 10000000) / 100000);
  const thousand = Math.floor((whole % 100000) / 1000);
  const rest = whole % 1000;

  if (crore) parts.push(twoDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (rest) parts.push(threeDigits(rest));

  const rupeeWords = parts.join(" ").replace(/\s+/g, " ").trim();
  const paiseWords = paise ? ` and ${twoDigits(paise)} Paise` : "";
  return `Rupees ${rupeeWords}${paiseWords} Only`;
}

export function MedicalReceiptDocument({ receipt }: { receipt: MedicalReceiptData }) {
  const { items, totals } = receipt;

  return (
    <div
      className="medical-receipt-page bg-white text-black"
      style={{
        width: "210mm",
        padding: "8mm 12mm 0 12mm",
        // The real app font instance loaded by the root layout, so print uses
        // the same face as the screen rather than a same-named system font.
        fontFamily: 'var(--font-plus-jakarta-sans), "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        .medical-receipt-page * { box-sizing: border-box; }
        .mr-frame table { table-layout: fixed; width: 100%; border-collapse: collapse; }
        .mr-frame tr { page-break-inside: avoid; }
      `}</style>

      {/* Letterhead + boxed receipt together are capped at 148mm — exactly half
          of A4's 297mm. overflow:hidden is the hard backstop; the paddings are
          sized so a typical 1–8 line receipt fits well inside the cap without
          ever clipping real data. */}
      <div style={{ maxHeight: "148mm", overflow: "hidden" }}>
        {/* ── Letterhead (identical to the fees receipt) ── */}
        <div className="flex items-center justify-between gap-2 pb-1.5">
          <img src={RECEIPT_LOGO_SRC} alt="" className="h-[56px] w-[56px] shrink-0 object-contain" />
          <div className="min-w-0 flex-1 text-center leading-tight">
            <h1 className="whitespace-nowrap text-[21px] font-bold tracking-tight">
              Sri Eshwar College of Engineering
            </h1>
            <p className="mt-0.5 text-[10px]">(Approved by AICTE, New Delhi &amp; Affiliated to Anna University)</p>
            <p className="mt-0.5 text-[12px] font-semibold">
              Kondampatti(P.O), Vadasithur(Via), Kinathukadavu, Coimbatore-641 202.
            </p>
            <p className="mt-0.5 text-[10px]">Ph : 04259 200300</p>
          </div>
          <div className="shrink-0 self-start pt-1 text-right">
            <p className="whitespace-nowrap text-[12px] font-semibold">HEALTH CENTRE</p>
            <p className="mt-0.5 whitespace-nowrap text-[10px]">ORIGINAL</p>
          </div>
        </div>
        <div className="border-t-2 border-black" />

        {/* Document title band — names the document so it cannot be mistaken
            for the fees receipt it shares a letterhead with. */}
        <p className="mt-1 text-center text-[13px] font-bold uppercase tracking-[0.14em]">
          Medical Consultation &amp; Pharmacy Receipt
        </p>

        <div className="mr-frame mt-1.5 border-2 border-black">
          {/* Receipt No / Date */}
          <table className="text-[12.5px]">
            <tbody>
              <tr>
                <td className="w-1/2 border-b border-black px-4 py-1.5 align-top">
                  <span className="font-semibold">Receipt No: </span>
                  {receipt.receipt_no}
                </td>
                <td className="w-1/2 border-b border-l-2 border-black px-4 py-1.5 align-top">
                  <span className="font-semibold">Date &amp; time : </span>
                  {formatDateTime(receipt.issued_at)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Patient block — same two-by-two grid as the fees receipt's student block */}
          <table className="text-[12.5px]">
            <tbody>
              <tr>
                <td className="w-[62%] border-b border-black px-4 py-2 align-top">
                  <span className="font-semibold">Name : </span>
                  {receipt.patient.name}
                </td>
                <td className="w-[38%] border-b border-l-2 border-black px-4 py-2 align-top">
                  <span className="font-semibold">Dept / Class: </span>
                  {receipt.patient.department ?? "—"}
                </td>
              </tr>
              <tr>
                <td className="border-b border-black px-4 py-2 align-top">
                  <span className="font-semibold">Roll no / Staff code : </span>
                  {/* Resolved from the linked OPD visit. A walk-in billed with
                      no queue entry has no verified identifier, and printing a
                      guess on a medical record would be worse than omitting
                      it, so it says so instead. */}
                  {receipt.patient.identifier ?? (receipt.patient.is_linked ? "—" : "Not on record")}
                </td>
                <td className="border-b border-l-2 border-black px-4 py-2 align-top">
                  <span className="font-semibold">Receipt type : </span>
                  {receipt.patient.is_linked ? "OPD consultation" : "Walk-in"}
                </td>
              </tr>
              <tr>
                <td className="border-b-2 border-black px-4 py-2 align-top">
                  <span className="font-semibold">Attended by : </span>
                  {receipt.attended_by
                    ? `${receipt.attended_by.name}${receipt.attended_by.designation ? ", " + receipt.attended_by.designation : ""}`
                    : "—"}
                </td>
                <td className="border-b-2 border-l-2 border-black px-4 py-2 align-top">
                  <span className="font-semibold">Mode : </span>
                  {receipt.payment_mode}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Reason for consultation ── */}
          <table className="text-[12.5px]">
            <tbody>
              <tr>
                <td className="border-b-2 border-black px-4 py-2 align-top">
                  <span className="font-semibold">Reason for consultation / Presenting complaint : </span>
                  {receipt.reason && receipt.reason.trim() !== "" && receipt.reason !== "—"
                    ? receipt.reason
                    : "General consultation — no specific complaint recorded"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Particulars ── */}
          <table className="text-[12.5px]">
            <colgroup>
              <col style={{ width: "3rem" }} />
              <col />
              <col style={{ width: "5rem" }} />
              <col style={{ width: "7rem" }} />
              <col style={{ width: "7rem" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b-2 border-r border-black py-1.5 pl-4 text-left font-semibold">S.No</th>
                <th className="border-b-2 border-r border-black py-1.5 pl-2 text-left font-semibold">
                  Medicine / Service
                </th>
                <th className="border-b-2 border-r border-black py-1.5 pr-2 text-right font-semibold">Qty</th>
                <th className="border-b-2 border-r border-black py-1.5 pr-2 text-right font-semibold">Rate (₹)</th>
                <th className="border-b-2 border-l border-black py-1.5 pr-4 text-right font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border-b border-black py-2 pl-4 italic">
                    No items billed.
                  </td>
                </tr>
              ) : (
                items.map((it, index) => (
                  <tr key={it.id}>
                    <td
                      className="border-r border-black py-1.5 pl-4 align-top"
                      style={{ borderBottom: "1px dotted black" }}
                    >
                      {index + 1}
                    </td>
                    <td
                      className="border-r border-black py-1.5 pl-2 align-top"
                      style={{ borderBottom: "1px dotted black" }}
                    >
                      {it.description}
                      {/* A dispensary receipt should make clear which lines are
                          dispensed medicine and which are a service charge. */}
                      {it.item_type === "service" && (
                        <span className="ml-1 text-[10.5px] italic">(service)</span>
                      )}
                    </td>
                    <td
                      className="border-r border-black py-1.5 pr-2 text-right align-top tabular-nums"
                      style={{ borderBottom: "1px dotted black" }}
                    >
                      {it.quantity}
                    </td>
                    <td
                      className="border-r border-black py-1.5 pr-2 text-right align-top tabular-nums"
                      style={{ borderBottom: "1px dotted black" }}
                    >
                      {rupees(it.rate)}
                    </td>
                    <td
                      className="border-l border-black py-1.5 pr-4 text-right align-top tabular-nums"
                      style={{ borderBottom: "1px dotted black" }}
                    >
                      {rupees(it.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* ── Totals ── */}
          <table className="text-[12.5px]">
            <colgroup>
              <col />
              <col style={{ width: "7rem" }} />
              <col style={{ width: "7rem" }} />
            </colgroup>
            <tbody>
              {/* Medicine / service split, so the patient can see what was
                  dispensed versus what was charged for the consultation. */}
              <tr>
                <td colSpan={3} className="border-b border-t border-black px-4 py-1.5 align-middle">
                  <span>Pharmacy</span>{" "}
                  <span className="font-semibold tabular-nums">₹{rupees(totals.medicine)}</span>
                  <span className="ml-5">Services</span>{" "}
                  <span className="font-semibold tabular-nums">₹{rupees(totals.service)}</span>
                  <span className="ml-5">Status</span>{" "}
                  <span className="font-semibold">{receipt.status}</span>
                  {/* Always state how it was paid. */}
                  <span className="ml-5">Payment mode</span>{" "}
                  <span className="font-semibold uppercase">{receipt.payment_mode}</span>
                  {/* The reference only exists for a UPI settlement, so it is
                      printed only then — a cash receipt carries no txn id. */}
                  {receipt.upi_transaction_id && (
                    <>
                      <span className="ml-5">Transaction ID</span>{" "}
                      <span className="font-semibold">{receipt.upi_transaction_id}</span>
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 italic">{amountInWords(totals.total)}</td>
                <td className="border-l-2 border-black px-2 py-1.5 text-right align-middle font-semibold">
                  TOTAL SUM
                </td>
                <td className="px-2 py-1.5 text-right align-middle font-bold tabular-nums">
                  ₹{rupees(totals.total)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Footer: pharmacist advisory + signature ── */}
          <div className="flex items-end justify-end gap-4 px-4 pb-2 pt-3">
            <div className="text-center text-[12px]">
              <p className="italic">For Sri Eshwar College of Engineering</p>
              <p className="mt-4 border-t border-black px-6 pt-1">Medical Officer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
