"use client";

import { useMemo, useState } from "react";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";
import { useMenteeEntrepreneurship, type MenteeEntrepreneurshipRow } from "@/modules/advisor/api/entrepreneurship";
import { useMenteeRoster } from "@/modules/advisor/api/dashboard";
import { useMenteeProfile } from "@/modules/advisor/api/mentees";

// Pixel-structural port of the design's EDC screen (stat tiles, search bar,
// table, click-through detail hero + 6 numbered sections) — rebuilt against
// "Advisor (Final) - Web/Faculty Portal.dc.html" one section at a time; the
// previous version was a flat card list that didn't match at all.
// CONNECTED FOR REAL — GET /me/mentee-entrepreneurship, scoped live to
// whichever class(es) this faculty is the current class_mentor for.
//
// Honest gaps vs the design (no backend field/value exists — omitted or
// substituted, never invented): no student photo/venture-logo file exists
// (photo_url/venture_logo_url are on the model but empty for every seeded
// row so far — the slot renders, the image just isn't there yet); no
// student email field on the entrepreneurship row or roster row, so the
// design's "College email" row falls back to the profile endpoint's email
// when a detail is open; "Employees" hero stat uses the real team_size
// field (there is no separate headcount field).

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

function money(v: number | null): string {
  return v !== null ? `₹${v.toLocaleString("en-IN")}` : "—";
}

function yesNo(v: boolean | null): string {
  return v === null ? "—" : v ? "Yes" : "No";
}

export default function AdvisorEdcPage() {
  const { isAdvisor, isLoading, classes } = useIsClassAdvisor();
  const primaryClass = classes[0];
  const records = useMenteeEntrepreneurship();
  const roster = useMenteeRoster(primaryClass?.class_id);
  const rosterById = new Map((roster.data?.students ?? []).map((s) => [s.id, s]));

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows: MenteeEntrepreneurshipRow[] = records.data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.student.name.toLowerCase().includes(q) ||
        r.student.student_id_no.toLowerCase().includes(q) ||
        r.business_name.toLowerCase().includes(q) ||
        (r.sector ?? "").toLowerCase().includes(q) ||
        (r.stage ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const beyondIdea = rows.filter((r) => r.prototype_developed || r.mvp_launched || r.product_launched);
  const registeredVentures = rows.filter((r) => r.registration_type && r.registration_type !== "unregistered");
  const inIncubation = rows.filter((r) => Boolean(r.incubator_support));

  const selected = rows.find((r) => r.id === selectedId);
  const rosterRow = selected ? rosterById.get(selected.student.id) : undefined;
  const profile = useMenteeProfile(selected?.student.id);

  if (!isLoading && !isAdvisor) {
    return (
      <div style={{ padding: 54, textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>Entrepreneurship Development Cell</div>
        <div style={{ marginTop: 10, fontSize: 14, color: "#94A3B8", fontWeight: 600, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          You&apos;re not currently assigned as a class advisor. Once you&apos;re assigned as the class mentor for a class, you&apos;ll see that class&apos;s student ventures here — automatically, in real time.
        </div>
      </div>
    );
  }

  if (selected) {
    const p = profile.data;
    return (
      <div style={{ width: "100%" }}>
        <div onClick={() => setSelectedId(null)} data-advisor-lift="" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "9px 16px", background: "#fff", border: "1px solid #E6EAF0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
          <span style={{ fontSize: 15 }}>←</span>
          <span>All EDC students</span>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #DBEAFE", borderRadius: 16, padding: 24, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "0 0 96px" }}>
              <div style={{ width: 96, height: 104, border: "1px solid #DBEAFE", borderRadius: 12, background: "#F2F6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#94A3B8" }}>photo</div>
              <div style={{ width: 96, height: 72, border: "1px solid #DBEAFE", borderRadius: 12, background: "#F2F6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#94A3B8" }}>logo</div>
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>{selected.business_name}</div>
              <div style={{ marginTop: 6, fontSize: 13.5, color: "#7C8899", fontWeight: 600 }}>
                {[selected.sector, selected.year_started ? `started ${selected.year_started}` : null].filter(Boolean).join(" · ") || "—"}
              </div>
              <div style={{ display: "flex", gap: 9, marginTop: 14, flexWrap: "wrap" }}>
                {[humanize(selected.stage), humanize(selected.role), selected.is_incubated ? "Incubated" : null, `Reg ${selected.student.student_id_no}`]
                  .filter((t): t is string => Boolean(t))
                  .map((t) => (
                    <div key={t} data-advisor-lift="" style={pill("#EFF6FF", "#DBEAFE", "#1D4ED8")}>
                      {t}
                    </div>
                  ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginTop: 18 }}>
                {[
                  { label: "Customers / users", value: selected.customers_count !== null ? selected.customers_count.toLocaleString("en-IN") : "—", sub: "as reported this term" },
                  { label: "Monthly revenue", value: money(selected.monthly_revenue), sub: selected.monthly_revenue !== null ? `${money(selected.monthly_revenue * 12)} a year` : "—" },
                  { label: "Team size", value: selected.team_size !== null ? String(selected.team_size) : "—", sub: selected.team_size !== null ? `${selected.team_size} employees` : "—" },
                  { label: "Funding raised", value: money(selected.funding_received), sub: selected.growth_stage ?? "—" },
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
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>1 · Student information</div>
            <div style={{ marginTop: 8 }}>
              {[
                ["Student name", selected.student.name],
                ["Register number", selected.student.student_id_no],
                ["Department", p?.class?.department.name ?? "—"],
                ["Programme", p ? `${p.course.code} — ${p.course.name}` : "—"],
                ["Batch · year of study", p ? `${p.batch.start_year}–${p.batch.end_year}` : "—"],
                ["College email", p?.email ?? "—"],
                ["Mobile number", rosterRow?.contact ?? "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 18, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1, minWidth: 0 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>2 · Entrepreneurship status</div>
            <div style={{ marginTop: 8 }}>
              {[
                ["Entrepreneurship status", humanize(selected.stage) ?? "—"],
                ["Entrepreneur type", humanize(selected.role) ?? "—"],
                ["Year started", selected.year_started ?? "—"],
                ["Current status", selected.current_status_note ?? "—"],
                ["Registration", selected.registration_type ? `Yes · ${humanize(selected.registration_type)}` : "Not registered"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 18, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1, minWidth: 0 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>3 · Startup / business details</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "18px 26px", marginTop: 18 }}>
            {[
              ["Domain / sector", selected.sector ?? "—"],
              ["Category", selected.business_category ?? "—"],
              ["Location", selected.location ?? "—"],
              ["Problem statement", selected.problem_statement ?? "—"],
              ["Solution / product", selected.business_model ?? "—"],
              ["Target customers", selected.target_customers ?? "—"],
              ["Website", selected.website ?? "—"],
              ["LinkedIn", selected.linkedin_url ?? "—"],
              ["Funding required", money(selected.funding_required)],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 16, alignItems: "start" }}>
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>4 · Founder & team</div>
            <div style={{ marginTop: 8 }}>
              {[
                ["Founder", selected.student.name],
                ["Co-founders", selected.co_founders ?? "—"],
                ["Team members", selected.team_size ?? "—"],
                ["Student team", selected.student_team_note ?? "—"],
                ["Faculty mentor", selected.mentor_faculty_name ?? "—"],
                ["External mentor", [selected.external_mentor_name, selected.external_mentor_org].filter(Boolean).join(" · ") || "—"],
                ["Team roles", selected.team_roles_note ?? "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 18, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1, minWidth: 0 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>5 · Startup progress</div>
            <div style={{ marginTop: 8 }}>
              {[
                ["Idea developed", yesNo(selected.idea_developed)],
                ["Prototype developed", yesNo(selected.prototype_developed)],
                ["MVP launched", yesNo(selected.mvp_launched)],
                ["Product / service launched", yesNo(selected.product_launched)],
                ["Customers / users", selected.customers_count ?? "—"],
                ["Monthly · annual revenue", selected.monthly_revenue !== null ? `${money(selected.monthly_revenue)} · ${money(selected.monthly_revenue * 12)}` : "—"],
                ["Employees", selected.team_size ?? "—"],
                ["Current growth stage", selected.growth_stage ?? "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 18, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1, minWidth: 0 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>6 · Funding</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "0 34px", marginTop: 10 }}>
            <div>
              {[
                ["Funding status", selected.funding_status ?? "—"],
                ["Funding received", money(selected.funding_received)],
                ["Funding source", selected.funding_source ?? "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 18, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1, minWidth: 0 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                </div>
              ))}
            </div>
            <div>
              {[
                ["Government grant / scheme", selected.govt_grant_scheme ?? "Not availed"],
                ["Incubator support", selected.incubator_support ?? "Not enrolled"],
                ["Accelerator support", selected.accelerator_support ?? "Not enrolled"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 18, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 600, flex: 1, minWidth: 0 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Entrepreneurship Development Cell</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        {primaryClass?.label ?? "Your"} mentoring class · students building ventures through the EDC · open a student for the full file
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginTop: 20 }}>
        {[
          { label: "Students in EDC", value: rows.length, sub: `From your mentoring class ${primaryClass?.section ?? ""}`.trim() },
          { label: "Startups", value: beyondIdea.length, sub: "Beyond idea stage and still active" },
          { label: "Registered ventures", value: registeredVentures.length, sub: "Private limited, LLP or proprietorship" },
          { label: "Inside the incubation centre", value: inIncubation.length, sub: "Seated in the campus incubation centre" },
        ].map((s) => (
          <div key={s.label} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 500, marginTop: 5 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div data-advisor-lift="" style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "16px 18px", marginTop: 16, flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, register number, venture, domain or stage"
          style={{ flex: 1, minWidth: 260, height: 44, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 16px", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", outline: 0 }}
        />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#94A3B8" }}>
          Showing {filtered.length} of {rows.length} EDC records
        </div>
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.6fr 1.4fr 1.1fr 1.2fr 1.3fr", padding: "15px 22px", borderBottom: "1px solid #EEF1F6", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <div>STUDENT</div>
          <div>VENTURE</div>
          <div>DOMAIN</div>
          <div>ROLE</div>
          <div>MONTHLY REV.</div>
          <div style={{ textAlign: "right" }}>STAGE</div>
        </div>
        {filtered.map((r) => (
          <div
            key={r.id}
            data-advisor-lift=""
            onClick={() => setSelectedId(r.id)}
            style={{ display: "grid", gridTemplateColumns: "1.8fr 1.6fr 1.4fr 1.1fr 1.2fr 1.3fr", padding: "13px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center", cursor: "pointer" }}
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
            <div style={{ fontSize: 13, fontWeight: 700, paddingRight: 12 }}>{r.business_name}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", paddingRight: 12 }}>{r.sector ?? "—"}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{humanize(r.role) ?? "—"}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{money(r.monthly_revenue)}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span style={pill("#EFF6FF", "#DBEAFE", "#1D4ED8")}>{humanize(r.stage) ?? "—"}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !records.isLoading && (
          <div style={{ padding: "50px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
            {rows.length === 0 ? "No students in your class have registered a venture yet." : "No records match this search."}
          </div>
        )}
      </div>
    </div>
  );
}
