import { BonafideLetterhead, BonafideSeal, BonafideSignatureBlock, BonafideVisionFooter } from "./BonafideLetterhead";
import { bonafideRefNo, currentAcademicYearFull, formatDateSlash, formatStudentName, genderTitle, relationPrefix, yearOfStudyWord } from "./bonafideText";
import type { BonafideRequestDetail } from "@/modules/admin/api/bonafideRequests";

export interface FeeParticularRow {
  label: string;
  footnote?: boolean;
  yearII: string;
  yearIII: string;
  yearIV: string;
}

// The six particulars and their order are fixed to match the college's real
// printed expenditure table. fee_structures in the DB is scoped to a single
// academic_year with no multi-year projection, so future-year figures
// aren't derivable from real data — amounts are entered by the admin in the
// print dialog immediately before printing (see BonafidePrintDialog), never
// auto-populated or invented here.
export const DEFAULT_FEE_ROWS: FeeParticularRow[] = [
  { label: "Tuition Fees", yearII: "", yearIII: "", yearIV: "" },
  { label: "Exam Fees", yearII: "", yearIII: "", yearIV: "" },
  { label: "Book Fees", yearII: "", yearIII: "", yearIV: "" },
  { label: "Placement Training Fees", yearII: "", yearIII: "", yearIV: "" },
  { label: "Development Fee", yearII: "", yearIII: "", yearIV: "" },
  { label: "Hostel Fees", footnote: true, yearII: "", yearIII: "", yearIV: "" },
];

function toAmount(value: string): number {
  const n = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function BonafideBankDocument({
  request,
  feeRows,
}: {
  request: BonafideRequestDetail;
  feeRows: FeeParticularRow[];
}) {
  const { student } = request;
  const name = formatStudentName(student.first_name, student.last_name);
  const now = request.issued_at ? new Date(request.issued_at) : new Date();
  const totals = {
    yearII: feeRows.reduce((sum, r) => sum + toAmount(r.yearII), 0),
    yearIII: feeRows.reduce((sum, r) => sum + toAmount(r.yearIII), 0),
    yearIV: feeRows.reduce((sum, r) => sum + toAmount(r.yearIV), 0),
  };
  const hasFootnote = feeRows.some((r) => r.footnote);

  return (
    <div
      className="bonafide-page bg-white text-black"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "12mm 16mm",
        fontFamily: 'var(--font-plus-jakarta-sans), "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @page { size: A4; margin: 0; }
        .bonafide-page * { box-sizing: border-box; }
        .bonafide-fee-table table { border-collapse: collapse; width: 100%; }
      `}</style>

      <BonafideLetterhead />

      <div className="mt-4 flex justify-between text-[12px]">
        <span>
          <span className="font-semibold">Ref: </span>
          {bonafideRefNo(request.id, student.department?.code ?? null, now)}
        </span>
        <span>Dt.{formatDateSlash(request.issued_at)}</span>
      </div>

      <h2 className="mt-3 text-center text-[15px] font-bold underline underline-offset-2">BONAFIDE CERTIFICATE</h2>

      <p className="mt-4 text-justify text-[13px] leading-[1.9]">
        This is to certify that {genderTitle(student.gender)} <span className="font-semibold">{name}</span>,{" "}
        (<span className="font-semibold">{student.register_no ?? student.student_id_no}</span>) {relationPrefix(student.gender)} Mr.{" "}
        <span className="font-semibold">{(student.father_name ?? "—").toUpperCase()}</span> is a bonafide student of our
        college studying <span className="font-semibold">{yearOfStudyWord(student.batch?.name ?? null, now)} year</span>{" "}
        {student.course?.name ?? "—"} during the academic year{" "}
        <span className="font-semibold">{currentAcademicYearFull(now, " - ")}</span>.
      </p>

      <p className="mt-4 text-[13px]">The approximate expenditure for the second, third &amp; fourth year are as follows:</p>

      <div className="bonafide-fee-table mt-3 border-2 border-black text-[12.5px]">
        <table>
          <thead>
            <tr>
              <th className="border-b-2 border-r border-black py-1.5 px-2 text-left font-semibold" style={{ width: "10%" }}>
                S.No
              </th>
              <th className="border-b-2 border-r border-black py-1.5 px-3 text-left font-semibold">Particulars</th>
              <th className="border-b-2 border-r border-black py-1.5 px-3 text-right font-semibold" style={{ width: "16%" }}>
                II Year
              </th>
              <th className="border-b-2 border-r border-black py-1.5 px-3 text-right font-semibold" style={{ width: "16%" }}>
                III Year
              </th>
              <th className="border-b-2 border-black py-1.5 px-3 text-right font-semibold" style={{ width: "16%" }}>
                IV Year
              </th>
            </tr>
          </thead>
          <tbody>
            {feeRows.map((row, i) => (
              <tr key={row.label}>
                <td className="border-r border-b border-black py-1.5 px-2">{i + 1}</td>
                <td className="border-r border-b border-black py-1.5 px-3">
                  {row.label}
                  {row.footnote ? " *" : ""}
                </td>
                <td className="border-r border-b border-black py-1.5 px-3 text-right tabular-nums">
                  {toAmount(row.yearII).toLocaleString("en-IN")}
                </td>
                <td className="border-r border-b border-black py-1.5 px-3 text-right tabular-nums">
                  {toAmount(row.yearIII).toLocaleString("en-IN")}
                </td>
                <td className="border-b border-black py-1.5 px-3 text-right tabular-nums">
                  {toAmount(row.yearIV).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="border-r border-black py-1.5 px-3 text-right font-bold">
                Total
              </td>
              <td className="border-r border-black py-1.5 px-3 text-right font-bold tabular-nums">
                {totals.yearII.toLocaleString("en-IN")}
              </td>
              <td className="border-r border-black py-1.5 px-3 text-right font-bold tabular-nums">
                {totals.yearIII.toLocaleString("en-IN")}
              </td>
              <td className="py-1.5 px-3 text-right font-bold tabular-nums">{totals.yearIV.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[13px] font-semibold">This Certificate is issued to avail Education Loan.</p>

      <div className="mt-16 flex items-end justify-between px-1">
        <div className="max-w-[220px]">
          {hasFootnote && <p className="text-[10.5px]">*Subject to revision as per Management norms.</p>}
          <div className="mt-3">
            <BonafideSeal />
          </div>
        </div>
        <BonafideSignatureBlock />
      </div>

      <BonafideVisionFooter />
    </div>
  );
}
