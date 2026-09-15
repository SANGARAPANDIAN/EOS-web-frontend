"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { useHigherEducationProfile, type HigherEducationProfile } from "@/modules/principal/api/higher-education";

// Every section below is backed by a real column on student_higher_education,
// or the same real family/contact data the Student Profile screen already
// uses — see EOSbackend1/src/modules/principal/higher-education/higher-education.service.ts's getProfile().

const cardSx = { background: principalColors.bg, border: `1px solid ${principalColors.border}`, borderRadius: 16, padding: "22px 24px" } as const;
const cardClass = "transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0 last:pb-0" style={{ borderColor: principalColors.borderLight }}>
      <span className="text-[13px]" style={{ color: principalColors.textFaint }}>{label}</span>
      <span className="text-right text-[13.5px] font-bold" style={{ color: principalColors.heading }}>{value ?? "—"}</span>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}
function statusBadge(status: string | null): { label: string; fg: string; bg: string; bd: string } {
  if (!status) return { label: "—", fg: principalColors.textFaint, bg: principalColors.surfaceMuted, bd: principalColors.borderLight };
  if (["approved", "accepted", "admitted", "enrolled"].includes(status)) return { label: status, fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
  if (["rejected", "declined"].includes(status)) return { label: status, fg: "#B42318", bg: "#FEF0EE", bd: "#F7C3BB" };
  return { label: status, fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
}

export default function PrincipalHigherEducationProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: p, isLoading, error } = useHigherEducationProfile(Number.isFinite(id) ? id : undefined);

  if (isLoading) {
    return <div className="py-16 text-center text-sm" style={{ color: principalColors.textFaint }}>Loading application…</div>;
  }
  if (error || !p) {
    return (
      <div className="py-16 text-center">
        <div className="mb-4 text-sm font-semibold" style={{ color: "#B42318" }}>
          {error instanceof Error ? error.message : "Higher-education record not found."}
        </div>
        <Link
          href="/principal/higher-education"
          className="inline-flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Back to higher education
        </Link>
      </div>
    );
  }

  return <ProfileBody p={p} />;
}

function ProfileBody({ p }: { p: HigherEducationProfile }) {
  const guardian = p.family?.guardian;
  const guardianName = guardian?.name ?? p.family?.father.name ?? null;
  const guardianMobile = guardian?.mobile ?? p.family?.father.mobile ?? null;
  const admission = statusBadge(p.admission_status);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/principal/higher-education"
          className="flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Back to higher education
        </Link>
        <div>
          <div className="text-[15px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            {p.student.name}
          </div>
          <div className="mt-0.5 text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint }}>
            {p.student.register_no ?? p.student.roll_no}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className={cardClass} style={{ ...cardSx, padding: "28px 30px", display: "flex", gap: 30, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto", textAlign: "center" }}>
          {p.student.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.student.photo_url} alt={p.student.name} style={{ width: 186, height: 240, objectFit: "cover", borderRadius: 10, border: `1px solid ${principalColors.chipBorder}` }} />
          ) : (
            <div
              style={{
                width: 186,
                height: 240,
                border: `1px solid ${principalColors.chipBorder}`,
                background: principalColors.surfaceTint,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 11.3,
                color: principalColors.textFaint,
                textAlign: "center",
                lineHeight: 1.7,
              }}
            >
              student photo
              <br />
              not stored
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, color: principalColors.heading, fontFamily: "var(--font-plus-jakarta-sans)" }}>{p.student.name}</h1>
          <p className="mt-2.5 mb-4.5 text-[14px]" style={{ color: principalColors.textFaint }}>
            {p.programme} · {p.university ?? "University not on file"}
          </p>
          <div className="mb-5.5 flex flex-wrap gap-3">
            <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
              {p.country}
            </span>
            <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
              {p.is_abroad ? "Overseas" : "Within India"}
            </span>
            {p.department?.code && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
                {p.department.code}
              </span>
            )}
            {p.is_scholarship && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.chipBorder, background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                Scholarship
              </span>
            )}
            <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ color: admission.fg, background: admission.bg, borderColor: admission.bd }}>
              {admission.label}
            </span>
          </div>
          <div className="grid gap-4.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>CGPA</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.cgpa ?? "—"}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Credits earned</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.credits_earned}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Arrears</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: p.arrear_count > 0 ? "#B42318" : principalColors.heading }}>{p.arrear_count}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Visa status</div>
              <div className="mt-2.5 text-[15px] font-bold capitalize" style={{ color: principalColors.heading }}>{p.visa_status?.replace(/_/g, " ") ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Application / academic — two cards */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Application</h2>
          <div>
            <Row label="Programme" value={p.programme} />
            <Row label="University" value={p.university} />
            <Row label="Intake term" value={p.intake_term} />
            <Row label="SOP status" value={p.sop_status} />
            <Row label="Recommendation status" value={p.recommendation_status} />
            <Row label="Application submitted" value={fmtDate(p.application_submitted_date)} />
            <Row label="Interview date" value={fmtDate(p.interview_date)} />
            <Row label="Offer status" value={p.offer_status} />
          </div>
        </div>

        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Academic &amp; funding</h2>
          <div>
            <Row label="CGPA · percentage" value={p.cgpa != null ? `${p.cgpa}${p.percentage != null ? ` · ${p.percentage}%` : ""}` : "—"} />
            <Row label="Test scores" value={p.test_scores_summary} />
            <Row label="Research output" value={p.research_output} />
            <Row label="Internship details" value={p.internship_details} />
            <Row label="Funding source" value={p.funding_source} />
            <Row label="Scholarship" value={p.is_scholarship ? p.scholarship_name : "Not availed"} />
            <Row label="Scholarship value" value={fmtMoney(p.scholarship_value)} />
          </div>
        </div>
      </div>

      {p.remarks && (
        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Remarks</h2>
          <p className="text-[13px]" style={{ color: principalColors.body }}>{p.remarks}</p>
        </div>
      )}

      {/* Family / guardian */}
      {p.family && (
        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Contact &amp; guardian</h2>
          <div>
            <Row label="Institute email" value={p.student.institute_email} />
            <Row label="Mobile" value={p.student.mobile} />
            <Row label="Passport number" value={p.student.passport_number} />
            <Row label="Guardian" value={guardianName} />
            <Row label="Guardian mobile" value={guardianMobile} />
          </div>
        </div>
      )}
    </div>
  );
}
