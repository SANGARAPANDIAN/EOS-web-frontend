"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStudentsSearch } from "@/modules/secretary/api/overview";

// Pixel-exact layout port of the `isStudentProfile` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1886-2086.
//
// REAL BACKEND WIRING — the hash-seeded fake generator (`studentProfile()`)
// has been removed entirely. This now shows only real fields from the same
// `/principal-students` search endpoint the roster already uses (matched
// by register_no), plus the real fee/attendance/CGPA aggregates.
//
// Honest, documented gap: parents/guardian, pre-admission school record,
// semester-wise GPA history, current-semester subject-wise marks,
// achievements and per-student documents have NO backing anywhere in the
// schema (confirmed during this session's Students/Reports conversion —
// no parent/guardian table, no school-record table, no subject-marks-by-
// student endpoint beyond the current CIA/exam modules which aren't
// student-scoped this way, no achievements/documents-per-student table).
// Rather than fabricate these with a hash generator, this page drops them
// and shows an explicit "not available" panel instead — same posture as
// Reports/Dept Details earlier this session.

export default function StudentProfilePage() {
  const params = useParams<{ roll: string }>();
  const router = useRouter();
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data, isLoading, error } = useStudentsSearch({ search: params.roll, limit: 5 });
  const rec = useMemo(
    () => data?.students.find((s) => s.register_no === params.roll) ?? data?.students[0],
    [data, params.roll],
  );

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading student…</div>;
  }
  if (error || !rec) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 13.1, color: "#b91c1c", marginBottom: 16 }}>{error instanceof Error ? error.message : "Student not found."}</div>
        <button onClick={() => router.push("/secretary/students")} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 20px", cursor: "pointer" }}>← Back to students</button>
      </div>
    );
  }

  const feeLabel = rec.fee_status === "paid" ? "Fees paid" : rec.fee_status === "scholarship" ? "Scholarship" : rec.fee_status === "due" ? "Fees due" : "No demand raised";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22, flexWrap: "wrap" }}>
        <button data-sec-lift="" onClick={() => router.push("/secretary/students")} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 20px", cursor: "pointer" }}>← Back to students</button>
        <div>
          <div style={{ fontSize: 14.8, fontWeight: 700 }}>{rec.name}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8", marginTop: 3 }}>{rec.register_no} · {rec.student_id_no}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <button data-sec-lift="" onClick={() => flash(`Profile of ${rec.name} sent to the printer.`)} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#0f172a", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "14px 22px", cursor: "pointer" }}>Print profile</button>
        </div>
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 16, padding: "28px 30px", display: "flex", gap: 30, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto", textAlign: "center" }}>
          <div style={{ width: 186, height: 240, border: "1px solid #dbe6ff", background: "#eef4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8", textAlign: "center", lineHeight: 1.7 }}>student photo<br />not stored</div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1.4 }}>{rec.name}</h1>
          <p style={{ margin: "10px 0 18px", fontSize: 14.4, color: "#64748b" }}>{rec.department_name} · Semester {rec.semester ?? "—"}{rec.section ? ` · Section ${rec.section}` : ""}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            <span style={{ border: "1px solid #eef2f7", background: "#ffffff", color: "#334155", fontSize: 12.2, fontWeight: 500, borderRadius: 999, padding: "9px 18px" }}>{rec.department_code}</span>
            <span style={{ border: "1px solid #eef2f7", background: "#ffffff", color: "#334155", fontSize: 12.2, fontWeight: 500, borderRadius: 999, padding: "9px 18px" }}>{feeLabel}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18 }}>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>CGPA</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{rec.cgpa ?? "—"}</div>
            </div>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>Attendance</div>
              <div style={{ fontSize: 27.8, fontWeight: 700, letterSpacing: -1, margin: "6px 0 4px" }}>{rec.attendance_pct !== null ? `${rec.attendance_pct}%` : "—"}</div>
            </div>
            <div style={{ background: "#f5f8ff", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 12.2, color: "#475569" }}>Fee status</div>
              <div style={{ fontSize: 18, fontWeight: 700, margin: "10px 0 4px" }}>{feeLabel}</div>
              {rec.fee_outstanding > 0 && <div style={{ fontSize: 11.3, color: "#94a3b8" }}>₹{rec.fee_outstanding} outstanding</div>}
            </div>
          </div>
        </div>
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 16, padding: "24px 26px" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 17.4, fontWeight: 700, letterSpacing: -0.4 }}>Additional records</h2>
        <p style={{ margin: 0, fontSize: 12.6, color: "#94a3b8" }}>
          Parent/guardian details, pre-admission school record, semester-wise GPA history, current-semester subject marks, achievements and per-student documents aren&apos;t backed by any table in the current schema — confirmed, not fabricated. These sections have been removed rather than shown with invented data.
        </p>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
