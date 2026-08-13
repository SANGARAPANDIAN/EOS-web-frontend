"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEdcEntrepreneurship, isBeyondIdeaStage } from "@/modules/edc/api/entrepreneurship";
import { pillSx } from "@/modules/edc/genericPage";

// Real backend connection — replaces the fake EDC_ROWS list. GET
// /me/edc-entrepreneurship (institution-wide, real-time). The design's
// "DEPT · BATCH" column and batch filter are dropped — the real student
// summary this endpoint returns has no batch field (only department +
// section) — shown honestly as "DEPT · Section" instead.

function initialsOf(name: string) {
  const p = name.split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}
function money(v: number | null): string {
  return v !== null ? `₹${v.toLocaleString("en-IN")}` : "—";
}

export default function EdcEntrepreneursPage() {
  const router = useRouter();
  const { data, isLoading } = useEdcEntrepreneurship();
  const rows = data ?? [];

  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All departments");

  const depts = useMemo(() => ["All departments", ...Array.from(new Set(rows.map((r) => r.student.department?.code).filter((c): c is string => Boolean(c))))], [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (dept !== "All departments" && r.student.department?.code !== dept) return false;
      if (!q) return true;
      return [r.student.name, r.student.student_id_no, r.business_name, r.sector, r.stage].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [rows, query, dept]);

  const startupsCount = rows.filter(isBeyondIdeaStage).length;
  const registeredCount = rows.filter((r) => r.registration_type && r.registration_type !== "unregistered").length;
  const insideCollegeCount = rows.filter((r) => r.is_incubated).length;

  const kpis = [
    { label: "Students in EDC", value: String(rows.length), note: "Across all departments and sections", icon: "rocket_launch", highlight: false },
    { label: "Startups", value: String(startupsCount), note: "Beyond idea stage and still active", icon: "storefront", highlight: false },
    { label: "Registered ventures", value: String(registeredCount), note: "Legally registered", icon: "verified", highlight: false },
    { label: "Startups inside college", value: String(insideCollegeCount), note: "Seated in the campus incubation centre", icon: "apartment", highlight: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1560 }}>
      <div>
        <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Entrepreneurship Development Cell</h1>
        <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Students building ventures through the EDC · open a student for the full entrepreneurship file</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} data-edc-lift="" style={{ background: k.highlight ? "#F4F8FF" : "#fff", border: `1px solid ${k.highlight ? "#CFE0F7" : "#E6EBF2"}`, borderRadius: 14, padding: "18px 20px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "#475569" }}>{k.label}</span>
              <span className="ms" style={{ width: 32, height: 32, borderRadius: 9, background: k.highlight ? "#E4EDFC" : "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flex: "none" }}>
                {k.icon}
              </span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: k.highlight ? "#3B6FD4" : "#94A3B8" }}>{k.note}</div>
          </div>
        ))}
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0, height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff" }}>
          <span className="ms" style={{ color: "#94A3B8", fontSize: 19 }}>search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, register number, venture, domain or stage"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, color: "#0F172A" }}
          />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ height: 44, padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#334155", flex: "none" }}>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ fontSize: 13.5, color: "#64748B", flex: "none" }}>Showing {filtered.length} of {rows.length} EDC records</span>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1.2fr 1.1fr 0.9fr 0.9fr 1fr", gap: 16, padding: "12px 24px", background: "#fff", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <span>STUDENT</span>
          <span>DEPT · SECTION</span>
          <span>VENTURE</span>
          <span>DOMAIN</span>
          <span>ROLE</span>
          <span style={{ textAlign: "right" }}>MONTHLY REV.</span>
          <span style={{ textAlign: "right" }}>STAGE</span>
        </div>
        {filtered.map((r) => (
          <div
            key={r.id}
            data-edc-row=""
            onClick={() => router.push(`/edc/entrepreneurs/${r.id}`)}
            style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1.2fr 1.1fr 0.9fr 0.9fr 1fr", gap: 16, alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #EEF2F7", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
                {initialsOf(r.student.name)}
              </div>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.student.name}>{r.student.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#94A3B8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.student.student_id_no}</div>
              </div>
            </div>
            <span style={{ fontSize: 13.5, color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[r.student.department?.code, r.student.section].filter(Boolean).join(" · ") || "—"}</span>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.business_name}</span>
            <span style={{ fontSize: 13.5, color: "#475569", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sector ?? "—"}</span>
            <span style={{ fontSize: 13.5, color: "#475569", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.role ?? "—"}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, textAlign: "right" }}>{money(r.monthly_revenue)}</span>
            <span style={{ textAlign: "right" }}>
              <span style={pillSx("blue")}>{r.stage ?? (isBeyondIdeaStage(r) ? "Beyond idea" : "Idea stage")}</span>
            </span>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div style={{ padding: "50px 24px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
            {rows.length === 0 ? "No EDC students registered yet." : "No records match this search."}
          </div>
        )}
      </div>
    </div>
  );
}
