// Institutional letterhead, seal, signature block and footer shared by both
// bonafide print formats — pixel-matched against the college's real printed
// bonafide template (crest + NBA/NAAC accreditation badges + registrar
// address block, R. Rajaram/Director signature, circular office seal, and
// the "VISION" statement bar), not an invented design.
export const BONAFIDE_LOGO_SRC = "/college-logo.png";
export const BONAFIDE_NBA_LOGO_SRC = "/nba-logo.png";
export const BONAFIDE_NAAC_LOGO_SRC = "/naac-logo.png";

export function BonafideLetterhead() {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <img src={BONAFIDE_LOGO_SRC} alt="" className="h-[62px] w-[62px] shrink-0 object-contain" />
        <div className="min-w-0 flex-1 pt-0.5 text-center leading-tight">
          <h1 className="text-[21px] font-bold tracking-tight whitespace-nowrap">Sri Eshwar College of Engineering</h1>
          <p className="mt-0.5 text-[10.5px] italic">(An Autonomous Institution)</p>
          <p className="mt-0.5 text-[10.5px] font-semibold">
            (Approved by AICTE, New Delhi &amp; Affiliated to Anna University, Chennai)
          </p>
          <p className="mt-1 text-[11px] font-semibold">
            Kondampatti (P.O), Vadasithur (Via), Kinathukadavu, Coimbatore - 641 202.
          </p>
          <p className="mt-0.5 text-[9.5px]">Tel : 04259 200300&nbsp;&nbsp;Cell : 73736 17171, 97153 17171&nbsp;&nbsp;Fax : 04259 200305</p>
          <p className="mt-0.5 text-[9.5px]">E-mail : sece@sece.ac.in&nbsp;&nbsp;&nbsp;&nbsp;Web : www.sece.ac.in</p>
        </div>
        <div className="flex w-[58px] shrink-0 flex-col items-center gap-1 pt-1">
          <img src={BONAFIDE_NBA_LOGO_SRC} alt="" className="w-[54px] object-contain" />
          <img src={BONAFIDE_NAAC_LOGO_SRC} alt="" className="w-[38px] object-contain" />
        </div>
      </div>
      <div className="mt-2 border-t-2 border-black" />
    </>
  );
}

export function BonafideSeal() {
  return (
    <svg width="108" height="108" viewBox="0 0 108 108" className="shrink-0">
      <defs>
        <path id="bonafide-seal-arc-top" d="M 12,54 A 42,42 0 1 1 96,54" fill="none" />
        <path id="bonafide-seal-arc-bottom" d="M 96,58 A 42,42 0 1 1 12,58" fill="none" />
      </defs>
      <circle cx="54" cy="54" r="50" fill="none" stroke="black" strokeWidth="1" />
      <circle cx="54" cy="54" r="43" fill="none" stroke="black" strokeWidth="1" />
      <text fontSize="6.5" fontWeight="600" fill="black" letterSpacing="0.3">
        <textPath href="#bonafide-seal-arc-top" startOffset="50%" textAnchor="middle">
          Sri Eshwar College of Engineering
        </textPath>
      </text>
      <text fontSize="6" fontWeight="600" fill="black" letterSpacing="0.3">
        <textPath href="#bonafide-seal-arc-bottom" startOffset="50%" textAnchor="middle">
          ★ ★ ★ ★ ★
        </textPath>
      </text>
      <text x="54" y="50" textAnchor="middle" fontSize="8" fontWeight="700" fill="black">
        Coimbatore
      </text>
      <text x="54" y="63" textAnchor="middle" fontSize="8" fontWeight="700" fill="black">
        641 202.
      </text>
    </svg>
  );
}

export function BonafideSignatureBlock() {
  return (
    <div className="text-center text-[12.5px] leading-[1.6]">
      <p className="font-semibold text-transparent select-none">signature</p>
      <p className="font-bold">R. RAJARAM</p>
      <p className="font-bold">DIRECTOR</p>
      <p>Sri Eshwar College of Engineering</p>
      <p>Kondampatti (Po), Vadasithur (Via),</p>
      <p>Kinathukadavu, Coimbatore - 641 202</p>
    </div>
  );
}

export function BonafideVisionFooter() {
  return (
    <div className="mt-10">
      <div className="relative border-t border-black">
        <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 bg-black px-3 py-0.5 text-[11px] font-bold tracking-wide text-white">
          VISION
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] font-semibold">
        To be recognized as a premier institution, grooming students into globally acknowledged engineering professionals.
      </p>
    </div>
  );
}
