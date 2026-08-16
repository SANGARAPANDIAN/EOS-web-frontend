"use client";

import { useState } from "react";
import { tone, initialsOf } from "@/modules/secretary/helpers";
import { useOutpasses, useUpdateOutpassStatus, type OutpassRow, type OutpassStatus } from "@/modules/secretary/api/outpass";

// Pixel-exact layout port of the `isOutpass` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1835-1884.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// new `/me/student-outpasses` module (built this session against the real
// `student_outpasses` table added via the Secretary module completion
// migration). Mentor name is real too (joined through the real
// `class_mentors` table). No "raise a new outpass" composer exists on
// this screen in the source either — students raise these elsewhere;
// Secretary only approves/rejects, matching the design exactly.

const FILTER_LABELS = ["pending", "approved", "rejected", "all"] as const;
const FILTER_TITLE: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", all: "All" };

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SecretaryOutpassPage() {
  const [filter, setFilter] = useState<(typeof FILTER_LABELS)[number]>("pending");
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data, isLoading, error } = useOutpasses(filter === "all" ? undefined : (filter as OutpassStatus));
  const updateMutation = useUpdateOutpassStatus();

  const filtered = data?.data ?? [];
  const pendingCount = filtered.filter((o) => o.status === "pending").length;

  async function onApprove(o: OutpassRow) {
    if (o.status === "approved") {
      flash(`Gate pass for ${o.student.name} sent to the printer.`);
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: o.id, status: "approved" });
      flash(`${o.student.name}'s outpass approved.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not approve the outpass.");
    }
  }
  async function onReject(o: OutpassRow) {
    try {
      await updateMutation.mutateAsync({ id: o.id, status: "rejected" });
      flash(`${o.student.name}'s outpass rejected.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not reject the outpass.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Student Outpass</h1>
          <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#64748b" }}>Gate passes raised by students · your approval releases them at the gate</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#eef4ff", color: "#1d4ed8", borderRadius: 12, padding: "14px 22px", fontSize: 13.1, fontWeight: 600 }}>{pendingCount} awaiting your approval</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTER_LABELS.map((f) => (
          <button
            key={f}
            data-sec-nav-item=""
            onClick={() => setFilter(f)}
            style={{ border: filter === f ? "1px solid #c7d7fe" : "1px solid #e5e9f2", background: filter === f ? "#eef4ff" : "#ffffff", color: filter === f ? "#1e3a8a" : "#475569", fontSize: 12.2, fontWeight: filter === f ? 600 : 500, borderRadius: 999, padding: "10px 18px", cursor: "pointer" }}
          >
            {FILTER_TITLE[f]}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Loading outpasses…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load outpasses."}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map((o) => {
          const t = tone(o.status);
          return (
            <div key={o.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8" }}>OP-{o.id}</span>
                <span style={{ fontSize: 11.7, color: "#64748b" }}>{o.kind}</span>
                <span style={{ marginLeft: "auto", fontSize: 10.8, fontWeight: 700, letterSpacing: 0.7, borderRadius: 7, padding: "6px 11px", background: t.bg, color: t.fg }}>{o.status.toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 999, background: "#eef4ff", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.7, fontWeight: 700 }}>{initialsOf(o.student.name)}</div>
                <div>
                  <div style={{ fontSize: 14.8, fontWeight: 600 }}>{o.student.name}</div>
                  <div style={{ fontSize: 11.7, color: "#64748b", marginTop: 2 }}>{o.student.student_id_no} · {o.student.section ?? "—"}{o.mentor_name ? ` · mentor ${o.mentor_name}` : ""}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 12.6, fontWeight: 600 }}>{fmtTime(o.from_time)} – {fmtTime(o.to_time)}</div>
                  <div style={{ fontSize: 11.3, color: "#94a3b8" }}>{fmtDate(o.outpass_date)}</div>
                </div>
              </div>
              <div style={{ fontSize: 12.6, color: "#475569", lineHeight: 1.6, marginTop: 14 }}>{o.reason}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, borderTop: "1px solid #f5f7fa", paddingTop: 16 }}>
                <span style={{ fontSize: 11.3, color: "#94a3b8" }}>Parent contact {o.parent_contact ?? "—"}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                  {o.status !== "rejected" && (
                    <span data-sec-danger="" onClick={() => onReject(o)} style={{ border: "1px solid #fee2e2", background: "#ffffff", color: "#b91c1c", fontSize: 11.7, fontWeight: 600, borderRadius: 10, padding: "11px 20px", cursor: "pointer" }}>Reject</span>
                  )}
                  <span onClick={() => onApprove(o)} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 11.7, fontWeight: 600, borderRadius: 10, padding: "11px 22px", cursor: "pointer" }}>{o.status === "approved" ? "Print pass" : "Approve"}</span>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && !error && filtered.length === 0 && (
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No outpass requests in this state.</div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
