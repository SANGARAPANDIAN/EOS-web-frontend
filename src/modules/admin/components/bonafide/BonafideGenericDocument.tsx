import { BonafideLetterhead, BonafideSeal, BonafideSignatureBlock, BonafideVisionFooter } from "./BonafideLetterhead";
import { bonafideRefNo, currentAcademicYearFull, formatDateSlash, formatStudentName, genderTitle, relationPrefix, yearOfStudyWord } from "./bonafideText";
import type { BonafideRequestDetail } from "@/modules/admin/api/bonafideRequests";

// Used for every bonafide reason other than "Bank Loan Purpose" (Passport
// Application, Scholarship Application, Visa Application, and any future
// reason) — same letterhead/seal/signature/footer as the bank format, but no
// fee-expenditure table, since only a loan application needs one.
export function BonafideGenericDocument({ request }: { request: BonafideRequestDetail }) {
  const { student, reason } = request;
  const name = formatStudentName(student.first_name, student.last_name);
  const now = request.issued_at ? new Date(request.issued_at) : new Date();

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

      <p className="mt-4 text-justify text-[13px] leading-[1.9]">
        This certificate is issued for the purpose of <span className="font-semibold">{reason.reason_text}</span>.
      </p>

      <div className="mt-24 flex items-end justify-between px-1">
        <BonafideSeal />
        <BonafideSignatureBlock />
      </div>

      <BonafideVisionFooter />
    </div>
  );
}
