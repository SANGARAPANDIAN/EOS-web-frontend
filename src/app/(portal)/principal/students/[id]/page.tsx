"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { useStudentProfile, downloadStudentProfile, type StudentProfile } from "@/modules/principal/api/students";
import { SubjectMarksTable } from "@/modules/shared/marks/SubjectMarksTable";

// Every section below is backed by a real table — GET /principal-students/:id/profile
// (EOSbackend1/src/modules/principal-students/principal-students.service.ts),
// the same institution-wide, schema-audited endpoint the Secretary module's
// student profile screen already uses. A section with no real rows on file
// renders a genuine empty state, not fabricated content — Class X/XII
// percentage marks, a hostel warden name and a library card number have no
// backing table anywhere in the schema, so none of those three appear here.

const cardSx = { background: principalColors.bg, border: `1px solid ${principalColors.border}`, borderRadius: 16, padding: "22px 24px" } as const;
// Same blue tint + inset border hover the students list page's table rows
// already use (hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE])
// — applied here too so the module's hover treatment is consistent.
const cardClass = "transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]";
const labelSx = { fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" as const, color: principalColors.textFaint };
const valueSx = { fontSize: 13.5, fontWeight: 600, marginTop: 4, color: principalColors.heading };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={labelSx}>{label}</div>
      <div style={valueSx}>{value ?? "—"}</div>
    </div>
  );
}

/** Label-left, value-right row with a hairline divider — the layout the reference design's info cards use throughout. */
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
function hostelLabel(hostel: StudentProfile["hostel"]): string {
  if (!hostel) return "Day scholar";
  const block = hostel.block ?? "Hostel";
  return hostel.room_number ? `${block} · ${hostel.room_number}` : block;
}

/** Same ExportButton pattern as the Reports page's "Export Excel"/"Export PDF" buttons (principal/reports/page.tsx) — a disabled "Preparing…" state while the file downloads, reused here verbatim rather than reinvented. */
function ExportButton({
  label,
  icon,
  format,
  studentId,
  variant,
}: {
  label: string;
  icon: string;
  format: "pdf";
  studentId: number;
  variant: "outline" | "solid";
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    setDownloading(true);
    try {
      await downloadStudentProfile(studentId, format);
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
      style={
        variant === "solid"
          ? { background: principalColors.primary, borderColor: principalColors.primary, color: "#FFFFFF" }
          : { background: principalColors.bg, borderColor: principalColors.border, color: principalColors.body }
      }
    >
      <Icon name={icon} size={18} />
      {downloading ? "Preparing…" : label}
    </button>
  );
}

function feeLedgerBadge(status: "paid" | "partial" | "pending"): { label: string; fg: string; bg: string; bd: string } {
  if (status === "paid") return { label: "Paid", fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
  if (status === "partial") return { label: "Partial", fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
  return { label: "Pending", fg: "#B42318", bg: "#FEF0EE", bd: "#F7C3BB" };
}

export default function PrincipalStudentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: p, isLoading, error } = useStudentProfile(Number.isFinite(id) ? id : undefined);

  if (isLoading) {
    return <div className="py-16 text-center text-sm" style={{ color: principalColors.textFaint }}>Loading student…</div>;
  }
  if (error || !p) {
    return (
      <div className="py-16 text-center">
        <div className="mb-4 text-sm font-semibold" style={{ color: "#B42318" }}>
          {error instanceof Error ? error.message : "Student not found."}
        </div>
        <Link
          href="/principal/students"
          className="inline-flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Back to students
        </Link>
      </div>
    );
  }

  return <ProfileBody p={p} />;
}

function ProfileBody({ p }: { p: StudentProfile }) {
  const [guardianPanelOpen, setGuardianPanelOpen] = useState(false);
  const feeLabel = p.fees.status === "paid" ? "Fees paid" : p.fees.status === "scholarship" ? "Scholarship" : p.fees.status === "due" ? "Fees due" : "No demand raised";
  const totalArrears = p.gpa_history.reduce((s, g) => s + g.arrears, 0);
  const guardian = p.family?.guardian;
  const guardianName = guardian?.name ?? p.family?.father.name ?? null;
  const guardianMobile = guardian?.mobile ?? p.family?.father.mobile ?? null;
  const guardianEmail = guardian?.email ?? p.family?.father.email ?? null;
  const permanentAddr = p.addresses.find((a) => a.type === "permanent") ?? null;
  const commAddr = p.addresses.find((a) => a.type !== "permanent") ?? null;
  const addrLine = (a: typeof permanentAddr) => (a ? [a.line, a.city, a.district, a.state, a.pincode].filter(Boolean).join(", ") : null);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div data-no-print="" className="flex flex-wrap items-center gap-4">
        <Link
          href="/principal/students"
          className="flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          Back to students
        </Link>
        <div>
          <div className="text-[15px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            {p.name}
          </div>
          <div className="mt-0.5 text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint }}>
            {p.register_no ?? p.roll_no} · {p.student_id_no}
          </div>
        </div>
        <div className="relative ml-auto flex gap-2.5">
          <button
            type="button"
            onClick={() => setGuardianPanelOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
            style={
              guardianPanelOpen
                ? { borderColor: principalColors.primary, color: principalColors.primary, background: "#F1F6FE" }
                : { borderColor: principalColors.border, color: principalColors.body }
            }
          >
            <Icon name="call" size={18} />
            Contact guardian
          </button>
          <ExportButton label="Export PDF" icon="picture_as_pdf" format="pdf" studentId={p.id} variant="solid" />

          {guardianPanelOpen && (
            <div
              className="absolute right-0 top-12 z-10 w-72 rounded-xl border p-4 shadow-lg"
              style={{ background: principalColors.bg, borderColor: principalColors.border }}
            >
              {!guardianMobile && !guardianEmail ? (
                <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No guardian contact on file for this student.</div>
              ) : (
                <div className="grid gap-3">
                  <div className="text-[13px] font-bold" style={{ color: principalColors.heading }}>{guardianName ?? "Guardian"}</div>
                  {guardianMobile && (
                    <a href={`tel:${guardianMobile}`} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: principalColors.primary }}>
                      <Icon name="call" size={16} />
                      {guardianMobile}
                    </a>
                  )}
                  {guardianEmail && (
                    <a href={`mailto:${guardianEmail}`} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: principalColors.primary }}>
                      <Icon name="mail" size={16} />
                      {guardianEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
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
              student photo
              <br />
              not stored
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, color: principalColors.heading, fontFamily: "var(--font-plus-jakarta-sans)" }}>{p.name}</h1>
          <p className="mt-2.5 mb-4.5 text-[14px]" style={{ color: principalColors.textFaint }}>
            {p.department?.name ?? "—"} · Semester {p.semester ?? "—"}
            {p.section ? ` · Section ${p.section}` : ""}
          </p>
          <div className="mb-5.5 flex flex-wrap gap-3">
            <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
              Reg {p.register_no ?? "—"}
            </span>
            <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
              {p.department?.code ?? "—"}
            </span>
            <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
              {feeLabel}
            </span>
            {p.hostel && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.borderLight, color: principalColors.body }}>
                Hosteller
              </span>
            )}
            {p.placement.some((pl) => pl.status === "placed") && (
              <span className="rounded-full border px-4.5 py-2 text-[12px] font-medium" style={{ borderColor: principalColors.chipBorder, background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                Placed
              </span>
            )}
          </div>
          <div className="grid gap-4.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>CGPA</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.overall_gpa ?? "—"}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Attendance</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: principalColors.heading }}>{p.overall_attendance_pct !== null ? `${p.overall_attendance_pct}%` : "—"}</div>
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Fee status</div>
              <div className="mt-2.5 text-[17px] font-bold" style={{ color: principalColors.heading }}>{feeLabel}</div>
              {p.fees.total_demand > p.fees.total_paid && (
                <div className="text-[11px]" style={{ color: principalColors.textFaint }}>{fmtMoney(p.fees.total_demand - p.fees.total_paid)} outstanding</div>
              )}
            </div>
            <div className="rounded-xl p-4.5" style={{ background: principalColors.surfaceMuted }}>
              <div className="text-[12px]" style={{ color: principalColors.textMuted }}>Arrears</div>
              <div className="my-1.5 text-[27px] font-bold" style={{ letterSpacing: -1, color: totalArrears > 0 ? "#B42318" : principalColors.heading }}>{totalArrears}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal / contact / academic / address — strictly two cards per row */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Personal details</h2>
          <div>
            <Row label="Date of birth" value={fmtDate(p.date_of_birth)} />
            <Row label="Gender" value={p.gender} />
            <Row label="Blood group" value={p.blood_group} />
            <Row label="Mother tongue" value={p.mother_tongue} />
            <Row label="Community" value={p.community} />
            <Row label="Admission quota" value={p.admission_quota} />
            <Row label="Date of admission" value={fmtDate(p.admission_date)} />
            <Row label="Admission number" value={p.admission_no} />
            <Row label="Personal email" value={p.personal_email} />
            <Row label="Aadhaar number" value={p.aadhar_number} />
          </div>
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Contact, mentor &amp; residence</h2>
          <div>
            <Row label="Student mobile" value={p.mobile} />
            <Row label="Institute email" value={p.institute_email} />
            <Row label="Address" value={addrLine(permanentAddr)} />
            <Row label="District" value={permanentAddr?.district} />
            <Row label="Class advisor" value={p.class_advisor} />
            <Row label="Faculty mentor" value={p.faculty_mentor} />
            <Row label="Residence / transport" value={p.hostel ? hostelLabel(p.hostel) : p.transport ? "Day scholar · bus route assigned" : "Not applicable (day scholar)"} />
          </div>
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Academic details</h2>
          <div>
            <Row label="Department" value={p.department?.name} />
            <Row label="Programme" value={p.programme} />
            <Row label="Batch / academic year" value={p.batch} />
            <Row label="Year · semester · section" value={`Sem ${p.semester ?? "—"} · Sec ${p.section ?? "—"}`} />
            <Row label="Admission type" value={p.admission_type} />
            <Row label="Current CGPA · percentage" value={p.overall_gpa ? `${p.overall_gpa} · ${p.overall_percentage}%` : "—"} />
            <Row
              label="Arrears / backlogs"
              value={<span style={{ color: totalArrears === 0 ? principalColors.primary : "#B42318" }}>{totalArrears === 0 ? "No arrears" : `${totalArrears} arrear${totalArrears > 1 ? "s" : ""}`}</span>}
            />
          </div>
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Address details</h2>
          {p.addresses.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No address on record.</div>
          ) : (
            <div>
              <Row label="Permanent address" value={addrLine(permanentAddr)} />
              <Row label="Communication address" value={addrLine(commAddr) ?? addrLine(permanentAddr)} />
              <Row label="City" value={permanentAddr?.city} />
              <Row label="District" value={permanentAddr?.district} />
              <Row label="State" value={permanentAddr?.state} />
              <Row label="Pincode" value={permanentAddr?.pincode} />
            </div>
          )}
        </div>
      </div>

      {/* Parents, guardian */}
      <div className={cardClass} data-print-card="" style={cardSx}>
        <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Parents, guardian &amp; photographs</h2>
        {!p.family ? (
          <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No family details on record.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
              {(["father", "mother"] as const).map((role) => {
                const parent = p.family![role];
                return (
                  <div key={role} className="flex gap-3.5 rounded-xl border p-4" style={{ borderColor: principalColors.borderLight }}>
                    {parent.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={parent.photo_url} alt={role} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flex: "0 0 auto" }} />
                    ) : (
                      <div
                        className="flex flex-shrink-0 items-center justify-center text-center"
                        style={{ width: 52, height: 52, borderRadius: 10, background: principalColors.surfaceTint, fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: principalColors.textFaint, lineHeight: 1.3 }}
                      >
                        {role}
                        <br />
                        photo
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase" style={{ color: principalColors.textFaint }}>
                        {role === "father" ? "Father" : "Mother"}
                        {role === "father" && (
                          <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                            Primary guardian
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[13.5px] font-bold" style={{ color: principalColors.heading }}>{parent.name ?? "—"}</div>
                      <div className="mt-0.5 text-[12.2px]" style={{ color: principalColors.textMuted }}>{parent.occupation ?? "—"}</div>
                      <div className="text-[12.2px]" style={{ color: principalColors.textMuted }}>{parent.mobile ?? "—"}</div>
                      {parent.annual_income != null && (
                        <div className="text-[12.2px]" style={{ color: principalColors.textMuted }}>{fmtMoney(parent.annual_income)} per annum</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4.5 grid grid-cols-1 gap-3 border-t pt-4.5 sm:grid-cols-3" style={{ borderColor: principalColors.borderLight }}>
              <Field label="Guardian" value={guardian?.is_father ? "Same as father" : `${guardian?.name ?? "—"}${guardian?.relationship ? ` (${guardian.relationship})` : ""}`} />
              <Field label="Guardian mobile" value={guardianMobile} />
              <Field label="Guardian email" value={guardianEmail} />
            </div>
          </>
        )}
      </div>

      {/* Parent-teacher meeting notes */}
      <div className={cardClass} data-print-card="" style={cardSx}>
        <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Parent-teacher meeting notes</h2>
        {p.meeting_notes.length === 0 ? (
          <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No meeting notes on record yet.</div>
        ) : (
          <div className="grid gap-2.5">
            {p.meeting_notes.map((m, i) => (
              <div key={i} className="flex gap-4">
                <span className="flex-shrink-0 text-[11.3px]" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint, width: 90 }}>
                  {fmtDate(m.date)}
                </span>
                <span className="text-[13.1px]" style={{ color: principalColors.body }}>{m.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pre-admission school record */}
      {p.pre_admission && (p.pre_admission.cutoff_physics || p.pre_admission.cutoff_chemistry || p.pre_admission.cutoff_maths) && (
        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>School record before admission (Class XII cut-off)</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
            <Field label="Physics" value={p.pre_admission.cutoff_physics} />
            <Field label="Chemistry" value={p.pre_admission.cutoff_chemistry} />
            <Field label="Maths" value={p.pre_admission.cutoff_maths} />
          </div>
        </div>
      )}

      {/* Semester-wise GPA + Monthly attendance — two cards in a row */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Semester-wise GPA</h2>
          {p.gpa_history.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No completed semester exam results on record yet.</div>
          ) : (
            <div className="grid gap-3.5">
              {p.gpa_history.map((g) => (
                <div key={g.semester} className="flex items-center gap-4">
                  <div className="flex-shrink-0 text-[12.6px] font-semibold" style={{ width: 70, color: principalColors.body }}>Sem {g.semester}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: principalColors.borderMuted }}>
                    <div className="h-full rounded-full" style={{ background: principalColors.primary, width: `${Math.min(100, ((g.gpa ?? 0) / 10) * 100)}%` }} />
                  </div>
                  <div className="flex-shrink-0 text-right text-[13.1px] font-bold" style={{ width: 50, color: principalColors.heading }}>{g.gpa ?? "—"}</div>
                  <div className="flex-shrink-0 text-right text-[11.3px]" style={{ width: 100, color: principalColors.textFaint }}>
                    {g.credits} cr · {g.arrears === 0 ? "All clear" : `${g.arrears} arrear${g.arrears > 1 ? "s" : ""}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-4 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Monthly attendance</h2>
          {p.monthly_attendance.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No attendance records yet.</div>
          ) : (
            <div className="flex items-end gap-3.5" style={{ height: 120 }}>
              {p.monthly_attendance.map((m) => {
                const barHeight = Math.max(Math.round((Math.min(m.pct, 100) / 100) * 90), m.pct > 0 ? 3 : 0);
                return (
                  <div key={m.month} className="flex-1 text-center">
                    <div className="flex items-end justify-center" style={{ height: 90 }}>
                      <div className="w-full rounded-t-md" style={{ height: `${barHeight}px`, background: principalColors.primary }} />
                    </div>
                    <div className="mt-1.5 text-[10.8px]" style={{ color: principalColors.textFaint }}>{m.month.slice(5)}</div>
                    <div className="text-[11.3px] font-bold" style={{ color: principalColors.heading }}>{m.pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subject-wise exam marks — shared SubjectMarksTable (same component and
          data source, GET /exam-marks?student_id=, as Admin/HoD/Faculty use)
          so this reflects real per-exam-type marks instead of a pre-summed
          internal total. */}
      <div className={cardClass} data-print-card="" style={{ ...cardSx, padding: 0, overflow: "hidden" }}>
        <h2 className="px-6 pt-5 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Examinations & results</h2>
        <div className="p-6">
          <SubjectMarksTable studentId={p.id} />
        </div>
      </div>

      {/* Fee ledger + College/ERP record — two cards in a row */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div className={cardClass} data-print-card="" style={cardSx}>
          <div className="mb-4 flex items-center gap-2.5">
            <h2 className="text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Fee ledger</h2>
            <span className="text-[12px]" style={{ color: principalColors.textFaint }}>
              Demand {fmtMoney(p.fees.total_demand)} · paid {fmtMoney(p.fees.total_paid)} · balance {fmtMoney(Math.max(p.fees.total_demand - p.fees.total_paid, 0))}
            </span>
          </div>
          {p.fee_ledger.length === 0 ? (
            <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No fee demand raised for this student yet.</div>
          ) : (
            <div className="grid gap-3">
              {p.fee_ledger.map((f, i) => {
                const badge = feeLedgerBadge(f.status);
                return (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13.1px] font-semibold" style={{ color: principalColors.heading }}>{f.name}</div>
                      <div className="text-[11.3px]" style={{ color: principalColors.textFaint }}>{f.academic_year}{f.semester ? ` · Sem ${f.semester}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold tabular-nums" style={{ color: principalColors.body }}>{fmtMoney(f.total_amount)}</span>
                      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>{badge.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardClass} data-print-card="" style={cardSx}>
          <h2 className="mb-3 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>College / ERP record</h2>
          <div>
            <Row label="Hostel / day scholar" value={hostelLabel(p.hostel)} />
            <Row label="Transport / bus route" value={p.transport ? "Bus route assigned" : "Not applicable"} />
            <Row label="Library" value={`${p.library.books_issued} book${p.library.books_issued === 1 ? "" : "s"} issued`} />
            <Row label="Scholarship" value={p.scholarships.length > 0 ? p.scholarships.map((s) => s.scheme).join(", ") : "Not availed"} />
            <Row label="Student status" value={p.status.charAt(0).toUpperCase() + p.status.slice(1)} />
            <Row label="Placement" value={p.placement.length > 0 ? p.placement.map((pl) => `${pl.company} (${pl.status})`).join(", ") : "Not placed yet"} />
            <Row label="Discipline" value={p.discipline.incident_count === 0 ? "No incidents on record" : `${p.discipline.incident_count} incident(s) on record`} />
          </div>

          {p.achievements.length > 0 && (
            <div className="mt-4.5 border-t pt-4.5" style={{ borderColor: principalColors.borderLight }}>
              <div style={labelSx}>Achievements</div>
              <ul className="mt-2 grid gap-1.5 pl-4.5">
                {p.achievements.map((a, i) => (
                  <li key={i} className="text-[13px]" style={{ color: principalColors.body }}>
                    {a.label}
                    {a.date ? ` — ${fmtDate(a.date)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Important documents */}
      <div className={cardClass} data-print-card="" style={cardSx}>
        <h2 className="mb-1.5 text-[15.5px] font-bold" style={{ color: principalColors.heading }}>Important documents</h2>
        <p className="mb-4 text-[12.2px]" style={{ color: principalColors.textFaint }}>
          Aadhaar: {p.aadhar_number ?? "not on record"} · Community: {p.community ?? "not on record"}
        </p>
        {p.documents.length === 0 ? (
          <div className="text-[12.6px]" style={{ color: principalColors.textFaint }}>No document register exists for this student yet.</div>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {p.documents.map((d) => (
              <div key={d.name} className="flex items-center justify-between rounded-[10px] border px-3.5 py-2.5" style={{ borderColor: principalColors.borderLight }}>
                <span className="text-[12.6px] font-medium" style={{ color: principalColors.body }}>{d.name}</span>
                <span
                  className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                  style={{ background: d.available ? "#F0FDF4" : "#FEF0EE", color: d.available ? "#047857" : "#B42318" }}
                >
                  {d.available ? "Available" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
