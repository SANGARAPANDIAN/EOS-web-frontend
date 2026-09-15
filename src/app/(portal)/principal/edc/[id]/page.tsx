"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { useEdcProfile, type EdcProfile } from "@/modules/principal/api/edc";

// Every section below is backed by a real column on student_entrepreneurship,
// the originating startup_ideas row (for "Solution / product"), or the same
// real family/contact data the Student Profile screen already uses — see
// EOSbackend1/src/modules/principal/edc/edc.service.ts's getProfile().

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

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function boolLabel(v: boolean | null): string {
  if (v === null) return "—";
  return v ? "Yes" : "No";
}

export default function PrincipalEdcProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: p, isLoading, error } = useEdcProfile(Number.isFinite(id) ? id : undefined);

  if (isLoading) {
    return <div className="py-16 text-center text-sm" style={{ color: principalColors.textFaint }}>Loading venture…</div>;
  }
  if (error || !p) {
    return (
      <div className="py-16 text-center">
        <div className="mb-4 text-sm font-semibold" style={{ color: "#B42318" }}>
          {error instanceof Error ? error.message : "EDC record not found."}
        </div>
        <Link
          href="/principal/edc"
          className="inline-flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Back to EDC
        </Link>
      </div>
    );
  }

  return <ProfileBody p={p} />;
}

function ProfileBody({ p }: { p: EdcProfile }) {
  const guardian = p.family?.guardian;
  const guardianName = guardian?.name ?? p.family?.father.name ?? null;
  const guardianMobile = guardian?.mobile ?? p.family?.father.mobile ?? null;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/principal/edc"
          className="flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Back to EDC
        </Link>
        <div>
          <div className="text-[15px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            {p.venture_name}
          </div>
          <div className="mt-0.5 text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint }}>
            {p.student.name} · {p.student.register_no ?? p.student.roll_no}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className={cardClass} style={{ ...cardSx, padding: "28px 30px", display: "flex", gap: 30, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto", textAlign: "center" }}>
          {p.venture_logo_url ?? p.student.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.venture_logo_url ?? p.student.photo_url ?? undefined}
              alt={p.venture_name}
              style={{ width: 186, height: 186, objectFit: "cover", borderRadius: 10, border: `1px solid ${principalColors.chipBorder}` }}
            />
          ) : (
            <div
              style={{
                width: 186,
                height: 186,
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
              logo
              <br />
              not on file
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, color: principalColors.heading, fontFamily: "var(--font-plus-jakarta-sans)" }}>{p.venture_name}</h1>
          <p className="mt-2.5 mb-4.5 text-[14px]" style={{ color: principalColors.textFaint }}>
            {p.student.name} · {p.department?.name ?? "—"}
          </p>
          <div className="mb-5.5 flex flex-wrap gap-3">
            {p.sector && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
                {p.sector}
              </span>
            )}
            {p.stage && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
                {p.stage}
              </span>
            )}
            {p.is_registered && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.chipBorder, background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                {p.registration_label ?? "Registered"}
              </span>
            )}
            {p.is_incubated && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.chipBorder, background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                Incubated
              </span>
            )}
          </div>
          <div className="grid gap-4.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Team size</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.team_size ?? "—"}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Customers</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.customers_count ?? "—"}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Monthly revenue</div>
              <div className="my-1.5 text-[22px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{fmtMoney(p.monthly_revenue)}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Funding required</div>
              <div className="my-1.5 text-[22px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{fmtMoney(p.funding_required)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Venture / progress — two cards */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Venture details</h2>
          <div>
            <Row label="Business category" value={p.business_category} />
            <Row label="Business model" value={p.business_model} />
            <Row label="Target customers" value={p.target_customers} />
            <Row label="Location" value={p.location} />
            <Row label="Website" value={p.website} />
            <Row label="LinkedIn" value={p.linkedin_url} />
            <Row label="Year started" value={p.year_started} />
          </div>
        </div>

        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Progress</h2>
          <div>
            <Row label="Idea developed" value={boolLabel(p.idea_developed)} />
            <Row label="Prototype developed" value={boolLabel(p.prototype_developed)} />
            <Row label="MVP launched" value={boolLabel(p.mvp_launched)} />
            <Row label="Product launched" value={boolLabel(p.product_launched)} />
            <Row label="Growth stage" value={p.growth_stage} />
            <Row label="Funding status" value={p.funding_status} />
            <Row label="Funding received" value={fmtMoney(p.funding_received)} />
          </div>
        </div>
      </div>

      {/* Problem / solution */}
      {(p.problem_statement || p.solution || p.description) && (
        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Problem &amp; solution</h2>
          <div className="grid gap-4">
            {p.description && <div><div className="text-[11.3px] font-semibold uppercase tracking-wide" style={{ color: principalColors.textFaint }}>Description</div><p className="mt-1 text-[13px]" style={{ color: principalColors.body }}>{p.description}</p></div>}
            {p.problem_statement && <div><div className="text-[11.3px] font-semibold uppercase tracking-wide" style={{ color: principalColors.textFaint }}>Problem statement</div><p className="mt-1 text-[13px]" style={{ color: principalColors.body }}>{p.problem_statement}</p></div>}
            {p.solution && <div><div className="text-[11.3px] font-semibold uppercase tracking-wide" style={{ color: principalColors.textFaint }}>Solution</div><p className="mt-1 text-[13px]" style={{ color: principalColors.body }}>{p.solution}</p></div>}
          </div>
        </div>
      )}

      {/* Team & mentorship / Support — two cards */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Team &amp; mentorship</h2>
          <div>
            <Row label="Co-founders" value={p.co_founders} />
            <Row label="Team roles" value={p.team_roles_note} />
            <Row label="Faculty mentor" value={p.faculty_mentor} />
            <Row label="External mentor" value={p.external_mentor_name} />
            <Row label="External mentor org" value={p.external_mentor_org} />
            <Row label="Role" value={p.role} />
          </div>
        </div>

        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Support &amp; funding</h2>
          <div>
            <Row label="Funding source" value={p.funding_source} />
            <Row label="Govt. grant scheme" value={p.govt_grant_scheme} />
            <Row label="Incubator support" value={p.incubator_support} />
            <Row label="Accelerator support" value={p.accelerator_support} />
            <Row label="Incubation status" value={p.incubation_status} />
            <Row label="Registration type" value={p.registration_type} />
          </div>
        </div>
      </div>

      {(p.current_status_note || p.remarks) && (
        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Notes</h2>
          {p.current_status_note && <p className="text-[13px]" style={{ color: principalColors.body }}>{p.current_status_note}</p>}
          {p.remarks && <p className="mt-2 text-[13px]" style={{ color: principalColors.body }}>{p.remarks}</p>}
        </div>
      )}

      {/* Family / guardian */}
      {p.family && (
        <div className={cardClass} style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Guardian contact</h2>
          <div>
            <Row label="Student email" value={p.student.institute_email} />
            <Row label="Student mobile" value={p.student.mobile} />
            <Row label="Guardian" value={guardianName} />
            <Row label="Guardian mobile" value={guardianMobile} />
          </div>
        </div>
      )}
    </div>
  );
}
