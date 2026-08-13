"use client";

import { useMemo, useState } from "react";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";
import { useMenteeHigherEducation, type MenteeHigherEducationRow } from "@/modules/advisor/api/higher-education";
import { useMenteeRoster } from "@/modules/advisor/api/dashboard";
import { useMenteeProfile } from "@/modules/advisor/api/mentees";

// Pixel-structural port of the design's Higher Education screen (stat tiles,
// search bar, table, click-through detail hero + 4 sections) — the previous
// version of this file was a flat card list that didn't match the design at
// all; rebuilt against "Advisor (Final) - Web/Faculty Portal.dc.html" one
// section at a time. CONNECTED FOR REAL — GET /me/mentee-higher-education,
// scoped live to whichever class(es) this faculty is the current
// class_mentor for, resolved fresh on every request (a reassignment to a
// different class changes this list on the very next fetch).
//
// Honest substitutions vs the design (no backend field exists — per project
// rule, omit/substitute rather than invent):
// - Design's "Test scores" hero tile (GRE/TOEFL) has no backend field at all
//   — replaced with the real "Offer status" field.
// - Design's "Passport" row has no backend field — dropped.
// - CGPA/arrears/mobile/guardian come from the real mentee-roster join (same
//   source Student Records uses), not from the higher-education row itself.
// - No student email field exists on either the higher-education row or the
//   roster row — the design's "Email" row in Funding & contact is dropped.

function pill(bg: string, border: string, color: string) {
  return { padding: "5px 12px", borderRadius: 20, background: bg, border: `1px solid ${border}`, color, fontSize: 11, fontWeight: 800 } as const;
}

function initialsOf(name: string) {
  const p = name.split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

function humanize(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusPill(status: string | null) {
  const admitted = status === "admitted" || status === "enrolled";
  return admitted ? pill("#F0FDF4", "#BBF7D0", "#16A34A") : pill("#EFF6FF", "#DBEAFE", "#1D4ED8");
}

export default function AdvisorHigherEducationPage() {
  const { isAdvisor, isLoading, classes } = useIsClassAdvisor();
  const primaryClass = classes[0];
  const records = useMenteeHigherEducation();
  const roster = useMenteeRoster(primaryClass?.class_id);
  const rosterById = new Map((roster.data?.students ?? []).map((s) => [s.id, s]));

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows: MenteeHigherEducationRow[] = records.data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.student.name.toLowerCase().includes(q) ||
        r.student.student_id_no.toLowerCase().includes(q) ||
        (r.preferred_university ?? "").toLowerCase().includes(q) ||
        r.preferred_course.toLowerCase().includes(q) ||
        r.preferred_country.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const overseas = rows.filter((r) => r.preferred_country.trim().toLowerCase() !== "india");
  const withinIndia = rows.length - overseas.length;
  const overseasUniversities = new Set(overseas.map((r) => r.preferred_university).filter(Boolean));
  const overseasCountries = Array.from(new Set(overseas.map((r) => r.preferred_country)));
  const confirmedAdmission = rows.filter((r) => r.admission_status === "admitted" || r.admission_status === "enrolled").length;
  const scholarshipHolders = rows.filter((r) => r.is_scholarship);
  const scholarshipNames = Array.from(new Set(scholarshipHolders.map((r) => r.scholarship_name).filter((n): n is string => Boolean(n))));

  const selected = rows.find((r) => r.id === selectedId);
  const rosterRow = selected ? rosterById.get(selected.student.id) : undefined;
  const profile = useMenteeProfile(selected?.student.id);

  if (!isLoading && !isAdvisor) {
    return (
      <div style={{ padding: 54, textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>Higher Education</div>
        <div style={{ marginTop: 10, fontSize: 14, color: "#94A3B8", fontWeight: 600, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          You&apos;re not currently assigned as a class advisor. Once you&apos;re assigned as the class mentor for a class, you&apos;ll see the higher-education plans of that class&apos;s students here — automatically, in real time.
        </div>
      </div>
    );
  }

  if (selected) {
    const cgpa = rosterRow?.cgpa ?? null;
    const p = profile.data;
    return (
      <div style={{ width: "100%" }}>
        <div onClick={() => setSelectedId(null)} data-advisor-lift="" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "9px 16px", background: "#fff", border: "1px solid #E6EAF0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
          <span style={{ fontSize: 15 }}>←</span>
          <span>All higher-education students</span>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #DBEAFE", borderRadius: 16, padding: 24, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 96, height: 118, flex: "0 0 96px", border: "1px solid #DBEAFE", borderRadius: 12, background: "#F2F6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}>
              photo
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", wordBreak: "break-word" }}>{selected.student.name}</div>
              <div style={{ marginTop: 6, fontSize: 13.5, color: "#7C8899", fontWeight: 600 }}>
                {[p?.class?.department.code, p ? `Batch ${p.batch.start_year}–${p.batch.end_year}` : null, `Register ${p?.register_no ?? selected.student.student_id_no}`].filter(Boolean).join(" · ")}
              </div>
              <div style={{ display: "flex", gap: 9, marginTop: 14, flexWrap: "wrap" }}>
                {[
                  humanize(selected.admission_status),
                  selected.preferred_country.trim().toLowerCase() !== "india" ? "Abroad" : "Domestic",
                  selected.intake_term ? `Intake ${selected.intake_term}` : null,
                ]
                  .filter((t): t is string => Boolean(t))
                  .map((t) => (
                    <div key={t} data-advisor-lift="" style={pill("#EFF6FF", "#DBEAFE", "#1D4ED8")}>
                      {t}
                    </div>
                  ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginTop: 18 }}>
                {[
                  { label: "UG CGPA", value: cgpa !== null ? cgpa.toFixed(2) : "—", sub: cgpa !== null ? `${(cgpa * 9.5).toFixed(1)}% equivalent` : "—" },
                  { label: "Destination", value: selected.preferred_country, sub: selected.intake_term ?? "—" },
                  { label: "Scholarship value", value: selected.scholarship_value !== null ? `₹${selected.scholarship_value.toLocaleString("en-IN")}` : "—", sub: selected.scholarship_name ?? "No scholarship" },
                  { label: "Offer status", value: humanize(selected.offer_status) ?? "—", sub: humanize(selected.visa_status) ?? "—" },
                ].map((s) => (
                  <div key={s.label} data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 15 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7C8899" }}>{s.label}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6 }}>{s.value}</div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: 5 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 16, alignItems: "start" }}>
          {[
            {
              title: "Programme & university",
              rows: [
                ["Programme", selected.preferred_course],
                ["University", selected.preferred_university ?? "—"],
                ["Country", selected.preferred_country],
                ["Intake", selected.intake_term ?? "—"],
                ["Statement of purpose", humanize(selected.sop_status) ?? "—"],
                ["Recommendation", selected.recommendation_status ?? "—"],
              ],
            },
            {
              title: "Undergraduate record & readiness",
              rows: [
                ["CGPA · percentage", cgpa !== null ? `${cgpa.toFixed(2)} · ${(cgpa * 9.5).toFixed(1)}%` : "—"],
                ["Arrears", rosterRow ? (rosterRow.arrears > 0 ? `${rosterRow.arrears} arrear paper(s)` : "No arrears") : "—"],
                ["Research output", selected.research_output ?? "—"],
                ["Internship", selected.internship_details ?? "—"],
                ["Visa", humanize(selected.visa_status) ?? "—"],
              ],
            },
            {
              title: "Application timeline",
              rows: [
                ["Application submitted", fmtDate(selected.application_submitted_date)],
                ["Interview / evaluation", fmtDate(selected.interview_date)],
                ["Offer / result", humanize(selected.offer_status) ?? "—"],
              ],
            },
            {
              title: "Funding & contact",
              rows: [
                ["Scholarship", selected.scholarship_name ?? (selected.is_scholarship ? "Yes" : "No")],
                ["Value", selected.scholarship_value !== null ? `₹${selected.scholarship_value.toLocaleString("en-IN")}` : "—"],
                ["Loan / funding", selected.funding_source ?? "—"],
                ["Student mobile", rosterRow?.contact ?? "—"],
                ["Guardian", rosterRow?.guardian_name ? `${rosterRow.guardian_name}${rosterRow.guardian_relation ? ` · ${rosterRow.guardian_relation}` : ""}` : "—"],
              ],
            },
          ].map((section) => (
            <div key={section.title} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>{section.title}</div>
              <div style={{ marginTop: 8 }}>
                {section.rows.map(([label, value]) => (
                  <div key={label} style={{ display: "flex", gap: 18, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                    <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1, minWidth: 0 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Higher Education</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        {primaryClass?.label ?? "Your"} mentoring class · students who progressed to postgraduate study · open a student for the full file
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16, marginTop: 20 }}>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Total higher education</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{rows.length}</div>
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 500, marginTop: 5 }}>{withinIndia} within India · {overseas.length} overseas</div>
          <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, marginTop: 3 }}>{confirmedAdmission} already hold a confirmed admission</div>
        </div>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Studying abroad</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{overseas.length}</div>
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 500, marginTop: 5 }}>Across {overseasUniversities.size} universit{overseasUniversities.size === 1 ? "y" : "ies"}</div>
          <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, marginTop: 3 }}>{overseasCountries.join(", ") || "—"}</div>
        </div>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Scholarship holders</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{scholarshipHolders.length}</div>
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 500, marginTop: 5 }}>Students holding a scholarship or assistantship</div>
          <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, marginTop: 3 }}>{scholarshipNames.join(", ") || "—"}</div>
        </div>
      </div>

      <div data-advisor-lift="" style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "16px 18px", marginTop: 16, flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, register number, university, programme or country"
          style={{ flex: 1, minWidth: 260, height: 44, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 16px", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", outline: 0 }}
        />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#94A3B8" }}>
          Showing {filtered.length} of {rows.length} higher-education records
        </div>
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.6fr 1.9fr 1.1fr 1.7fr 1.1fr", padding: "15px 22px", borderBottom: "1px solid #EEF1F6", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <div>STUDENT</div>
          <div>PROGRAMME</div>
          <div>UNIVERSITY</div>
          <div>COUNTRY</div>
          <div>SCHOLARSHIP</div>
          <div style={{ textAlign: "right" }}>STATUS</div>
        </div>
        {filtered.map((r) => (
          <div
            key={r.id}
            data-advisor-lift=""
            onClick={() => setSelectedId(r.id)}
            style={{ display: "grid", gridTemplateColumns: "2fr 1.6fr 1.9fr 1.1fr 1.7fr 1.1fr", padding: "13px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
                {initialsOf(r.student.name)}
              </div>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.student.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.student.student_id_no}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, paddingRight: 12 }}>{r.preferred_course}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", paddingRight: 12 }}>{r.preferred_university ?? "—"}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{r.preferred_country}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7C8899", paddingRight: 12 }}>{r.scholarship_name ?? (r.is_scholarship ? "Scholarship" : "—")}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span style={statusPill(r.admission_status)}>{humanize(r.admission_status) ?? "—"}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !records.isLoading && (
          <div style={{ padding: "50px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
            {rows.length === 0 ? "No students in your class have registered higher-education plans yet." : "No records match this search."}
          </div>
        )}
      </div>
    </div>
  );
}
