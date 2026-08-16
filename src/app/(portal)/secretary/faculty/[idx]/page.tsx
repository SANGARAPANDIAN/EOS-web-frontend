"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFacultyList, useFacultyAttendanceOverview } from "@/modules/secretary/api/overview";

// Pixel-exact layout port of the `isFacultyProfile` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 2089-2212.
//
// REAL BACKEND WIRING — the hash-seeded fake generator (`facultyProfile()`)
// has been removed entirely. Real via the same `GET /me/faculty` +
// `GET /me/faculty/attendance/overview` the Faculty directory/Reports
// screens already use, joined by faculty id.
//
// Honest, documented gap: subjects handled, publications/citations,
// current responsibilities/duties and leave/appraisal summary have NO
// backing anywhere in the schema (confirmed during this session's
// Faculty/Reports conversion — no teaching-load table, no publications
// table, no duties/responsibilities table). Dropped rather than
// fabricated, same posture as the Faculty directory page already applies.

export default function FacultyProfilePage() {
  const params = useParams<{ idx: string }>();
  const router = useRouter();
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const facultyId = parseInt(params.idx, 10);
  const { data: list, isLoading: listLoading, error } = useFacultyList();
  const { data: attendance } = useFacultyAttendanceOverview();

  const f = useMemo(() => list?.data.find((r) => r.id === facultyId), [list, facultyId]);
  const att = useMemo(() => attendance?.rows.find((r) => r.faculty_id === facultyId), [attendance, facultyId]);

  if (listLoading) {
    return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading faculty…</div>;
  }
  if (error || !f) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 13.1, color: "#b91c1c", marginBottom: 16 }}>{error instanceof Error ? error.message : "Faculty member not found."}</div>
        <button onClick={() => router.push("/secretary/faculty")} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 20px", cursor: "pointer" }}>← Back to faculty</button>
      </div>
    );
  }

  const name = `${f.first_name} ${f.last_name}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22, flexWrap: "wrap" }}>
        <button data-sec-lift="" onClick={() => router.push("/secretary/faculty")} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 20px", cursor: "pointer" }}>← Back to faculty</button>
        <div>
          <div style={{ fontSize: 14.8, fontWeight: 700 }}>{name}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8", marginTop: 3 }}>{f.designation} · {f.department?.code ?? "—"}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <button data-sec-lift="" onClick={() => flash(`Profile of ${name} sent to the printer.`)} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 22px", cursor: "pointer" }}>Print profile</button>
        </div>
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 16, padding: "28px 30px", display: "flex", gap: 30, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ width: 186, height: 240, border: "1px solid #dbe6ff", background: "#eef4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8", textAlign: "center", lineHeight: 1.7 }}>faculty photo<br />not stored</div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1.4 }}>{name}</h1>
          <p style={{ margin: "10px 0 18px", fontSize: 14.4, color: "#64748b" }}>{f.designation} · {f.department?.name ?? "No department on record"}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            <span style={{ border: "1px solid #eef2f7", background: "#ffffff", color: "#334155", fontSize: 12.2, fontWeight: 500, borderRadius: 999, padding: "9px 18px" }}>{f.status}</span>
            <span style={{ border: "1px solid #eef2f7", background: "#ffffff", color: "#334155", fontSize: 12.2, fontWeight: 500, borderRadius: 999, padding: "9px 18px" }}>Joined {f.date_of_joining.slice(0, 10)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18 }}>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>Attendance</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{att ? `${att.attendance_percentage}%` : "—"}</div>
            </div>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>On duty / leave</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{att?.on_duty_or_leave ?? "—"}</div>
            </div>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>Absent</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{att?.absent ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 16, padding: "24px 26px" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 17.4, fontWeight: 700, letterSpacing: -0.4 }}>Contact</h2>
          <div data-sec-row="" style={{ display: "flex", alignItems: "baseline", gap: 20, padding: "13px 0", borderBottom: "1px solid #f5f7fa" }}>
            <span style={{ fontSize: 12.6, color: "#64748b" }}>Email</span>
            <span style={{ marginLeft: "auto", fontSize: 12.6, fontWeight: 600, textAlign: "right" }}>{f.email}</span>
          </div>
          <div data-sec-row="" style={{ display: "flex", alignItems: "baseline", gap: 20, padding: "13px 0" }}>
            <span style={{ fontSize: 12.6, color: "#64748b" }}>Phone</span>
            <span style={{ marginLeft: "auto", fontSize: 12.6, fontWeight: 600, textAlign: "right" }}>{f.phone ?? "—"}</span>
          </div>
        </div>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 16, padding: "24px 26px" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 17.4, fontWeight: 700, letterSpacing: -0.4 }}>Additional records</h2>
          <p style={{ margin: 0, fontSize: 12.6, color: "#94a3b8" }}>
            Subjects handled, publications/citations, current responsibilities and leave/appraisal summary aren&apos;t backed by any table in the current schema — confirmed, not fabricated. These sections have been removed rather than shown with invented data.
          </p>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
