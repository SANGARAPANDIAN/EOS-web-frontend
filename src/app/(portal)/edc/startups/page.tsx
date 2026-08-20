"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEdcEntrepreneurship, isBeyondIdeaStage } from "@/modules/edc/api/entrepreneurship";
import { pillSx } from "@/modules/edc/genericPage";

// Real backend connection — same GET /me/edc-entrepreneurship as EDC
// Students, filtered client-side to ventures beyond idea stage (there is no
// separate ventures/startups table anywhere in the schema — confirmed by
// backend audit). "Legal identity" maps to the real registration_type enum
// (private_limited/llp/proprietorship/unregistered).

function humanize(v: string | null): string | null {
  if (!v) return null;
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function money(v: number | null): string {
  return v !== null ? `₹${v.toLocaleString("en-IN")}` : "—";
}

const CHIPS = ["All", "Active", "Inside college", "Funded", "Registered", "Not registered"] as const;

export default function EdcStartupsPage() {
  const router = useRouter();
  const { data, isLoading } = useEdcEntrepreneurship();
  const rows = useMemo(() => (data ?? []).filter(isBeyondIdeaStage), [data]);

  const [chip, setChip] = useState<(typeof CHIPS)[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (chip === "Inside college" && !r.is_incubated) return false;
      if (chip === "Funded" && !r.funding_received) return false;
      if (chip === "Registered" && (!r.registration_type || r.registration_type === "unregistered")) return false;
      if (chip === "Not registered" && r.registration_type && r.registration_type !== "unregistered") return false;
      if (!q) return true;
      return [r.business_name, r.student.name, r.sector].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [rows, chip, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1560 }}>
      <div>
        <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Startups</h1>
        <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>The {rows.length} EDC venture{rows.length === 1 ? "" : "s"} that are beyond idea stage and still active.</p>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {CHIPS.map((c) => {
            const active = chip === c;
            return (
              <div key={c} onClick={() => setChip(c)} style={{ padding: "9px 18px", borderRadius: 99, fontSize: 13.5, cursor: "pointer", fontWeight: active ? 700 : 600, color: active ? "#fff" : "#475569", background: active ? "#1D4ED8" : "#fff", border: `1px solid ${active ? "#1D4ED8" : "#E6EBF2"}` }}>
                {c}
              </div>
            );
          })}
        </div>
        <div style={{ height: 42, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff" }}>
          <span className="ms" style={{ color: "#94A3B8", fontSize: 19 }}>search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search startup name or founder…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A" }} />
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 16px" }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Venture Register</h3>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#3B6FD4", background: "#EFF6FF", borderRadius: 99, padding: "3px 10px" }}>{filtered.length} shown</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr 0.6fr 1.1fr 1fr 0.9fr 0.8fr", gap: 16, padding: "11px 24px", background: "#fff", borderTop: "1px solid #EEF2F7", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <span>VENTURE</span>
          <span>FOUNDER</span>
          <span>DEPT</span>
          <span>DOMAIN</span>
          <span>STAGE</span>
          <span>LEGAL IDENTITY</span>
          <span style={{ textAlign: "right" }}>MONTHLY REV.</span>
        </div>
        {filtered.map((r) => (
          <div
            key={r.id}
            data-edc-row=""
            onClick={() => router.push(`/edc/startups/${r.id}`)}
            style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr 0.6fr 1.1fr 1fr 0.9fr 0.8fr", gap: 16, alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #EEF2F7", cursor: "pointer" }}
          >
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.business_name}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>{r.year_started ? `Started ${r.year_started}` : "—"}</div>
            </div>
            <span style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.student.name}>{r.student.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#475569" }}>{r.student.department?.code ?? "—"}</span>
            <span style={{ fontSize: 13.5, color: "#475569", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sector ?? "—"}</span>
            <span><span style={pillSx("blue")}>{r.stage ?? "Active"}</span></span>
            <span style={{ fontSize: 13.5, color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{humanize(r.registration_type) ?? "Not registered"}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, textAlign: "right" }}>{money(r.monthly_revenue)}</span>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div style={{ padding: "50px 24px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
            {rows.length === 0 ? "No ventures beyond idea stage yet." : "No records match this filter."}
          </div>
        )}
      </div>
    </div>
  );
}
