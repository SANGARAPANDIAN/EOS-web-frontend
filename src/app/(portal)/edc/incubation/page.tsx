"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useIncubations, useCreateIncubation } from "@/modules/edc/api/incubations";
import { useEdcEntrepreneurship } from "@/modules/edc/api/entrepreneurship";
import { pillSx, barSx } from "@/modules/edc/genericPage";

// Real backend connection — GET/POST /me/incubations (IncubationsController,
// added this session on real `incubations`/`incubation_milestones` tables).
// No fake fallback: the design's INCUBATION_FILE sample object is gone —
// empty state shows plainly when no venture has been admitted yet.

function statusTone(status: string) {
  if (status === "Graduated") return pillSx("blue");
  if (status === "Exited") return pillSx("slate");
  return pillSx("green");
}

export default function EdcIncubationPage() {
  const router = useRouter();
  const incubations = useIncubations();
  const ventures = useEdcEntrepreneurship();
  const createIncubation = useCreateIncubation();
  const [admitOpen, setAdmitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks which specific row is mid-request — without this, a click gave
  // NO visible feedback (no spinner, no disabled state) until the request
  // resolved, so a second click on the same row before the first finished
  // fired a duplicate create that failed with a 409 — and since the first
  // request's onSuccess had already closed the whole panel, that error
  // banner rendered inside a now-hidden panel, i.e. invisible. Admitting
  // now stays open until the request settles and always shows something.
  const [admittingId, setAdmittingId] = useState<number | null>(null);

  const eligible = (ventures.data ?? []).filter((v) => !incubations.data?.some((i) => i.student_entrepreneurship_id === v.id));

  function admit(ventureId: number) {
    if (admittingId !== null) return;
    setError(null);
    setAdmittingId(ventureId);
    createIncubation.mutate(
      { student_entrepreneurship_id: ventureId },
      {
        onSuccess: (created) => {
          setAdmitOpen(false);
          setAdmittingId(null);
          router.push(`/edc/incubation/${created.id}`);
        },
        onError: (e) => {
          setAdmittingId(null);
          setError(e instanceof Error ? e.message : "Failed to admit venture.");
        },
      },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1300 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Incubation</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Ventures admitted into the EDC incubation centre — bays, mentors, reviews, milestones.</p>
        </div>
        <div
          data-edc-btn-primary=""
          onClick={() => setAdmitOpen((v) => !v)}
          style={{ padding: "12px 20px", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          + Admit a venture
        </div>
      </div>

      {admitOpen && (
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF2F7", fontSize: 15, fontWeight: 700 }}>Pick a venture to admit</div>
          {error && <div style={{ margin: "12px 22px 0", padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
          {ventures.isLoading && <div style={{ padding: "24px 22px", color: "#94A3B8", fontSize: 14 }}>Loading ventures…</div>}
          {eligible.length === 0 && !ventures.isLoading && (
            <div style={{ padding: "24px 22px", color: "#94A3B8", fontSize: 14 }}>Every registered venture is already in the incubation centre.</div>
          )}
          {eligible.map((v) => (
            <div key={v.id} data-edc-row="" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "13px 22px", borderBottom: "1px solid #EEF2F7" }}>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.business_name}</div>
                <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.student.name} · {v.student.student_id_no} · {v.student.department?.code ?? "—"}</div>
              </div>
              <span
                onClick={() => admit(v.id)}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  flex: "0 0 auto",
                  color: admittingId === v.id ? "#94A3B8" : "#1D4ED8",
                  background: admittingId === v.id ? "#F1F5F9" : "#EFF6FF",
                  borderRadius: 99,
                  padding: "6px 14px",
                  cursor: admittingId === v.id ? "default" : "pointer",
                }}
              >
                {admittingId === v.id ? "Admitting…" : "Admit →"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.9fr 0.9fr", gap: 16, padding: "12px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <span>VENTURE</span>
          <span>SEAT</span>
          <span>MENTOR</span>
          <span>PROGRESS</span>
          <span style={{ textAlign: "right" }}>STATUS</span>
        </div>

        {incubations.isLoading && <div style={{ padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Loading…</div>}
        {incubations.isError && (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#DC2626", fontWeight: 600, fontSize: 14 }}>
            {incubations.error instanceof Error ? incubations.error.message : "Failed to load incubation data."}
          </div>
        )}
        {incubations.data?.length === 0 && !incubations.isLoading && !incubations.isError && (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No ventures in the incubation centre yet.</div>
        )}

        {incubations.data?.map((row) => (
          <Link key={row.id} href={`/edc/incubation/${row.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div data-edc-row="" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.9fr 0.9fr", gap: 16, alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #EEF2F7", cursor: "pointer" }}>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.business_name ?? "—"}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.student?.name ?? "—"}</div>
              </div>
              <span style={{ fontSize: 13.5, color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.seat ?? "—"}</span>
              <span style={{ fontSize: 13.5, color: "#475569", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.mentor_faculty_name ?? "Not assigned"}</span>
              <div>
                <div style={{ height: 6, borderRadius: 99, background: "#E9EEF6", marginBottom: 4 }}>
                  <div style={barSx(row.progress_percent)} />
                </div>
                <span style={{ fontSize: 11.5, color: "#64748B" }}>{row.progress_percent}%</span>
              </div>
              <span style={{ textAlign: "right" }}><span style={statusTone(row.status)}>{row.status}</span></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
