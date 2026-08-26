"use client";

import { useState } from "react";
import { useMyFacultyOds, useCreateFacultyOd } from "@/modules/advisor/api/employee";

// Backed by GET /me/faculty-od + POST /me/create-od (FacultyOdController).
// Real CreateFacultyOdDto only accepts from_date/to_date/place/purpose — no
// OD-type, no "periods affected", no class-adjustment note, no attachment
// field exist in the schema, so those inputs are removed rather than
// collected and silently dropped.

function pill(status: string | null | undefined) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    approved: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    rejected: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
    pending: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E3A8A" },
  };
  const t = map[status ?? "pending"] ?? map.pending;
  return { padding: "6px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11.5, fontWeight: 800 } as const;
}

function dateRangeLabel(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  const a = new Date(from).toLocaleDateString("en-IN", opts);
  const b = new Date(to).toLocaleDateString("en-IN", opts);
  return a === b ? a : `${a} – ${b}`;
}

export default function AdvisorMyOdPage() {
  const [tab, setTab] = useState<"apply" | "history">("apply");
  const ods = useMyFacultyOds();
  const create = useCreateFacultyOd();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [place, setPlace] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Mirrors the real backend checks in FacultyOdService.create exactly
  // (from_date must not be before today; from_date must not be after
  // to_date) — validated here too so an invalid range is caught before a
  // request is even sent, instead of surfacing only as a 400 afterward.
  const rangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);
  const pastDate = Boolean(fromDate && fromDate < new Date().toISOString().slice(0, 10));
  const canSubmit = Boolean(fromDate && toDate) && !rangeInvalid && !pastDate;

  function submit() {
    if (!canSubmit) return;
    setFormError(null);
    create.mutate(
      { from_date: fromDate, to_date: toDate, purpose: purpose || undefined, place: place || undefined },
      {
        onSuccess: () => { setFromDate(""); setToDate(""); setPurpose(""); setPlace(""); setTab("history"); },
        onError: (e) => setFormError(e instanceof Error ? e.message : "Failed to submit OD request."),
      },
    );
  }

  const rows = ods.data?.data ?? [];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Staff OD</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>Apply for on-duty and track your applications</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 11, padding: 4, flex: "0 0 auto" }}>
          {[
            { key: "apply" as const, label: "Apply" },
            { key: "history" as const, label: "History" },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <div
                key={t.key}
                data-advisor-lift=""
                onClick={() => setTab(t.key)}
                style={{ padding: "9px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: active ? "#fff" : "transparent", color: active ? "#1D4ED8" : "#475569", boxShadow: active ? "0 1px 3px rgba(15,23,42,0.12)" : "none" }}
              >
                {t.label}
              </div>
            );
          })}
        </div>
      </div>

      {tab === "apply" && (
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 24, marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>From Date</div>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff", color: "#0F172A" }} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>To Date</div>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff", color: "#0F172A" }} />
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>Purpose</div>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value.slice(0, 255))}
              placeholder="e.g. ICACCS 2026 paper presentation"
              style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff" }}
            />
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>Place</div>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value.slice(0, 255))}
              placeholder="e.g. PSG College of Technology, Coimbatore"
              style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff" }}
            />
          </div>
          {rangeInvalid && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
              From Date must be on or before To Date.
            </div>
          )}
          {pastDate && !rangeInvalid && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
              From Date cannot be in the past.
            </div>
          )}
          {formError && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
              {formError}
            </div>
          )}
          <div
            onClick={submit}
            style={{ marginTop: 20, textAlign: "center", padding: 16, background: create.isPending ? "#93C5FD" : canSubmit ? "#1D4ED8" : "#C7D2E0", color: "#fff", borderRadius: 11, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            {create.isPending ? "Submitting…" : "Submit for approval"}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {rows.map((h) => (
            <div key={h.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.015em", flex: 1 }}>{h.purpose ?? "On-duty request"}</div>
                <div style={pill(h.overall_status)}>{(h.overall_status ?? "pending").toUpperCase()}</div>
              </div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600, marginTop: 6 }}>{dateRangeLabel(h.from_date, h.to_date)}</div>
              {h.place && <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 500, marginTop: 8 }}>{h.place}</div>}
              <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F4F9" }}>
                HoD: {(h.hod_approval_status ?? "pending").toUpperCase()} · HR: {(h.hr_approval_status ?? "pending").toUpperCase()}
              </div>
            </div>
          ))}
          {rows.length === 0 && !ods.isLoading && (
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 64, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>No OD requests yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
