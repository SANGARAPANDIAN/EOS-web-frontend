"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { useFacultyProfile, downloadFacultyProfile, type FacultyProfile } from "@/modules/principal/api/faculty";

// Every section below is backed by a real table — GET /principal-faculty/:id/profile
// (EOSbackend1/src/modules/principal-faculty/principal-faculty.service.ts), the
// same institution-wide, schema-audited endpoint the Secretary module's faculty
// profile screen and Role Allocation's candidate view already use.

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

function approvalBadge(status: string): { label: string; fg: string; bg: string; bd: string } {
  if (status === "approved") return { label: "Approved", fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
  if (status === "rejected") return { label: "Rejected", fg: "#B42318", bg: "#FEF0EE", bd: "#F7C3BB" };
  return { label: "Pending", fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
}

function ExportButton({ facultyId }: { facultyId: number }) {
  const [downloading, setDownloading] = useState(false);
  async function handleClick() {
    setDownloading(true);
    try {
      await downloadFacultyProfile(facultyId, "pdf");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={downloading}
      className="flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold transition-colors disabled:opacity-60"
      style={{ background: principalColors.primary, borderColor: principalColors.primary, color: "#FFFFFF" }}
    >
      <Icon name="picture_as_pdf" size={18} />
      {downloading ? "Preparing…" : "Export PDF"}
    </button>
  );
}

export default function PrincipalFacultyProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: p, isLoading, error } = useFacultyProfile(Number.isFinite(id) ? id : undefined);

  if (isLoading) {
    return <div className="py-16 text-center text-sm" style={{ color: principalColors.textFaint }}>Loading faculty…</div>;
  }
  if (error || !p) {
    return (
      <div className="py-16 text-center">
        <div className="mb-4 text-sm font-semibold" style={{ color: "#B42318" }}>
          {error instanceof Error ? error.message : "Faculty member not found."}
        </div>
        <Link
          href="/principal/faculty"
          className="inline-flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Back to faculty
        </Link>
      </div>
    );
  }

  return <ProfileBody p={p} />;
}

function ProfileBody({ p }: { p: FacultyProfile }) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div data-no-print="" className="flex flex-wrap items-center gap-4">
        <Link
          href="/principal/faculty"
          className="flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Back to faculty
        </Link>
        <div>
          <div className="text-[15px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            {p.name}
          </div>
          <div className="mt-0.5 text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint }}>
            {p.staff_code ?? "—"}
          </div>
        </div>
        <div className="ml-auto">
          <ExportButton facultyId={p.id} />
        </div>
      </div>

      {/* Hero */}
      <div className={cardClass} data-print-card="" style={{ ...cardSx, padding: "28px 30px", display: "flex", gap: 30, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto", textAlign: "center" }}>
          {p.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo_url} alt={p.name} style={{ width: 186, height: 240, objectFit: "cover", borderRadius: 10, border: `1px solid ${principalColors.chipBorder}` }} />
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
              photo
              <br />
              not on file
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, color: principalColors.heading, fontFamily: "var(--font-plus-jakarta-sans)" }}>{p.name}</h1>
          <p className="mt-2.5 mb-4.5 text-[14px]" style={{ color: principalColors.textFaint }}>
            {p.designation} · {p.department?.name ?? "—"}
          </p>
          <div className="mb-5.5 flex flex-wrap gap-3">
            <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
              {p.staff_code ?? "—"}
            </span>
            <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
              {p.department?.code ?? "—"}
            </span>
            <span
              className="rounded-full border px-4.5 py-2 text-[12px] font-medium capitalize"
              style={
                p.status === "active"
                  ? { borderColor: principalColors.chipBorder, background: principalColors.surfaceTint, color: principalColors.primaryDark }
                  : { borderColor: principalColors.borderLight, color: principalColors.body }
              }
            >
              {p.status}
            </span>
            {p.class_advisor_of && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
                Advisor · {p.class_advisor_of}
              </span>
            )}
          </div>
          <div className="grid gap-4.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Experience</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.experience_years != null ? `${p.experience_years}y` : "—"}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Attendance</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.attendance_pct_this_term != null ? `${p.attendance_pct_this_term}%` : "—"}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Publications</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.publications_summary.total}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Periods / week</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.periods_per_week}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal / employment — two cards per row */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Personal &amp; contact</h2>
          <div>
            <Row label="Date of birth" value={fmtDate(p.date_of_birth)} />
            <Row label="Gender" value={p.gender} />
            <Row label="Institute email" value={p.institute_email} />
            <Row label="Personal email" value={p.personal_email} />
            <Row label="Phone" value={p.phone} />
            <Row label="Office room" value={p.office_room} />
            <Row label="Work location" value={p.work_location} />
          </div>
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Employment details</h2>
          <div>
            <Row label="Designation" value={p.designation} />
            <Row label="Department" value={p.department?.name} />
            <Row label="Date of joining" value={fmtDate(p.date_of_joining)} />
            <Row label="Qualification" value={p.qualification} />
            <Row label="Specialization" value={p.specialization} />
            <Row label="Previous institution" value={p.previous_institution} />
            <Row label="Employment status / type" value={[p.employment_status, p.employment_type].filter(Boolean).join(" · ") || "—"} />
          </div>
        </div>
      </div>

      {/* Subjects handled */}
      <div className={cardClass} data-print-card="" style={{ ...cardSx, padding: 0, overflow: "hidden" }}>
        <h2 className="px-6 pt-5 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Subjects handled</h2>
        {p.subjects_handled.length === 0 ? (
          <div className="p-6 text-[12.6px]" style={{ color: principalColors.textFaint }}>No subject assignments on record.</div>
        ) : (
          <div className="mt-4">
            <div className="grid gap-3 border-t px-6 py-3.5 text-[10.8px] font-bold uppercase tracking-wide" style={{ gridTemplateColumns: "2fr 1fr 1fr 1.4fr", borderColor: principalColors.borderLight, color: principalColors.textFaint }}>
              <span>Subject</span><span>Semester</span><span>Section</span><span>Academic year</span>
            </div>
            {p.subjects_handled.map((s, i) => (
              <div key={i} className="grid items-center gap-3 border-t px-6 py-3.5" style={{ gridTemplateColumns: "2fr 1fr 1fr 1.4fr", borderColor: principalColors.borderMuted }}>
                <div>
                  <div className="text-[13.1px] font-semibold" style={{ color: principalColors.heading }}>{s.name}</div>
                  <div className="text-[10.8px]" style={{ color: principalColors.textFaint }}>{s.code}</div>
                </div>
                <span className="text-[12.6px]" style={{ color: principalColors.body }}>{s.semester ?? "—"}</span>
                <span className="text-[12.6px]" style={{ color: principalColors.body }}>{s.section}</span>
                <span className="text-[12.6px]" style={{ color: principalColors.body }}>{s.academic_year}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave balances + Appraisal — two cards */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Leave balances</h2>
          {p.leave_balances.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No leave balance recorded.</div>
          ) : (
            <div className="grid gap-3">
              {p.leave_balances.map((b, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: principalColors.body }}>{b.leave_type} <span style={{ color: principalColors.textFaint }}>· {b.academic_year}</span></span>
                  <span className="text-[13px] font-bold" style={{ color: principalColors.heading }}>{b.used} / {b.allocated}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Current appraisal</h2>
          {!p.appraisal ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No appraisal request on file.</div>
          ) : (
            <div>
              <Row label="Academic year" value={p.appraisal.academic_year} />
              <Row label="Status" value={p.appraisal.status.replace(/_/g, " ")} />
              <Row label="HoD reviewed" value={fmtDate(p.appraisal.hod_reviewed_at)} />
              <Row label="Management approved" value={fmtDate(p.appraisal.management_approved_at)} />
              {p.appraisal.remarks && <Row label="Remarks" value={p.appraisal.remarks} />}
            </div>
          )}
        </div>
      </div>

      {/* Leave / OD history — two cards */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Recent leave</h2>
          {p.leave_history.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No leave requests on record.</div>
          ) : (
            <div className="grid gap-3">
              {p.leave_history.map((l, i) => {
                const badge = approvalBadge(l.hr_status !== "pending" ? l.hr_status : l.hod_status);
                return (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: principalColors.heading }}>{fmtDate(l.from_date)} – {fmtDate(l.to_date)}</div>
                      <div className="text-[11.3px]" style={{ color: principalColors.textFaint }}>{l.reason ?? "—"}</div>
                    </div>
                    <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Recent OD</h2>
          {p.od_history.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No OD requests on record.</div>
          ) : (
            <div className="grid gap-3">
              {p.od_history.map((o, i) => {
                const badge = approvalBadge(o.hr_status !== "pending" ? o.hr_status : o.hod_status);
                return (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: principalColors.heading }}>{fmtDate(o.from_date)} – {fmtDate(o.to_date)}</div>
                      <div className="text-[11.3px]" style={{ color: principalColors.textFaint }}>{[o.purpose, o.place].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Publications */}
      <div className={cardClass} data-print-card="" style={cardSx}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Publications</h2>
          <div className="flex flex-wrap gap-2 text-[12px]" style={{ color: principalColors.body }}>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>{p.publications_summary.journals} journals</span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>{p.publications_summary.conferences} conferences</span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>{p.publications_summary.books} books</span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>{p.publications_summary.total_citations} citations</span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: principalColors.border }}>h-index {p.publications_summary.h_index}</span>
          </div>
        </div>
        {p.publications.length === 0 ? (
          <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No publications on record.</div>
        ) : (
          <div className="grid gap-2.5">
            {p.publications.map((pub, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: principalColors.borderLight }}>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: principalColors.heading }}>{pub.title}</div>
                  <div className="text-[11.3px]" style={{ color: principalColors.textFaint }}>{pub.type} · {pub.year}</div>
                </div>
                <span className="text-[12px] font-semibold" style={{ color: principalColors.body }}>{pub.citation_count} citations</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Awards + Responsibilities — two cards */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Awards</h2>
          {p.awards.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No awards on record.</div>
          ) : (
            <ul className="grid gap-2">
              {p.awards.map((a, i) => (
                <li key={i} className="text-[13px]" style={{ color: principalColors.body }}>
                  <span className="font-semibold" style={{ color: principalColors.heading }}>{a.title}</span> — {a.year}
                  {a.awarded_by ? ` · ${a.awarded_by}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Responsibilities</h2>
          {p.responsibilities.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No committee responsibilities on record.</div>
          ) : (
            <ul className="grid gap-2">
              {p.responsibilities.map((r, i) => (
                <li key={i} className="text-[13px]" style={{ color: principalColors.body }}>
                  <span className="font-semibold" style={{ color: principalColors.heading }}>{r.title}</span> — {r.academic_year}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
