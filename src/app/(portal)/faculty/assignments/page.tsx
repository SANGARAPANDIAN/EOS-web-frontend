"use client";

import { useMemo, useState } from "react";
import { useAssignments, useAssignmentStudents, useSetAssignmentStudentStatus } from "@/modules/advisor/api/assignments";
import { AdvisorIcon } from "@/modules/advisor/icons";

// Backed by GET /me/assignments and GET /me/assignments/:id/students
// (AssignmentsController). The design's per-row submission timestamp ("07
// Aug · 21:1x") has no backend source — AssignmentStudentStatus only stores
// `marked_at`, so real timestamps are shown when present and the row simply
// shows "—" when not, instead of an invented time.

function initialsOf(name: string | null | undefined) {
  const p = (name ?? "").split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export default function AdvisorAssignmentsPage() {
  const assignments = useAssignments();
  const rows = assignments.data ?? [];

  // Derived rather than synced via effect (same fix as the Attendance
  // page's class/subject selector) — defaults to the first assignment
  // until the user picks a different one, without a setState-in-effect.
  const [assignmentIdOverride, setAssignmentId] = useState<number | null>(null);
  const assignmentId = assignmentIdOverride ?? (rows.length ? rows[0].id : null);

  const active = rows.find((a) => a.id === assignmentId);
  const students = useAssignmentStudents(assignmentId ?? undefined);
  const setStatus = useSetAssignmentStudentStatus();

  const studentRows = students.data ?? [];
  const subCount = studentRows.filter((r) => r.is_submitted).length;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Submitted" | "Not submitted">("All");
  const FILTERS = ["All", "Submitted", "Not submitted"] as const;

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studentRows.filter((r) => {
      if (q && !(r.name.toLowerCase().includes(q) || r.student_id_no.toLowerCase().includes(q))) return false;
      if (filter === "Submitted") return r.is_submitted;
      if (filter === "Not submitted") return !r.is_submitted;
      return true;
    });
  }, [studentRows, query, filter]);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Assignment Status</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        Submission tracking across the classes you teach
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>ASSIGNMENT</div>
          <select
            value={assignmentId ?? ""}
            onChange={(e) => setAssignmentId(Number(e.target.value))}
            style={{ width: "100%", marginTop: 9, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#0F172A", background: "#F8FAFC" }}
          >
            {rows.map((a) => (
              <option key={a.id} value={a.id}>
                {a.class.section} · {a.subject.subject_code} · Assignment {a.sequence_no}{a.title ? ` · ${a.title}` : ""}
              </option>
            ))}
          </select>
        </div>
        {active && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20, padding: "14px 18px", background: "#EFF6FF", borderRadius: 11 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1D4ED8" }}>
              {subCount} of {studentRows.length} submitted
            </div>
            <div style={{ flex: 1, height: 8, borderRadius: 8, background: "#DBEAFE", overflow: "hidden" }}>
              <div style={{ width: `${studentRows.length ? Math.round((subCount / studentRows.length) * 100) : 0}%`, height: "100%", borderRadius: 8, background: "#1D4ED8" }} />
            </div>
          </div>
        )}
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "14px 16px", marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 220, display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 14px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#F8FAFC" }}>
          <AdvisorIcon kind="search" width={15} height={15} style={{ color: "#94A3B8", flex: "0 0 15px" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or roll number"
            style={{ flex: "1 1 0", minWidth: 0, border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "#0F172A" }}
          />
        </div>
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <div
              key={f}
              data-advisor-lift=""
              onClick={() => setFilter(f)}
              style={{ padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: isActive ? "#1D4ED8" : "#fff", border: `1px solid ${isActive ? "#1D4ED8" : "#E2E8F0"}`, color: isActive ? "#fff" : "#475569", whiteSpace: "nowrap" }}
            >
              {f}
            </div>
          );
        })}
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
        {filteredRows.map((r) => (
          <div key={r.student_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 22px", borderBottom: "1px solid #F4F6FA" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {initialsOf(r.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{r.student_id_no}</div>
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, width: 140, textAlign: "right" }}>
              {r.marked_at ? new Date(r.marked_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
            </div>
            <div
              style={
                r.is_submitted
                  ? { padding: "8px 16px", borderRadius: 22, background: "#1D4ED8", color: "#fff", fontSize: 12.5, fontWeight: 700, minWidth: 132, textAlign: "center" }
                  : { padding: "8px 16px", borderRadius: 22, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#94A3B8", fontSize: 12.5, fontWeight: 700, minWidth: 132, textAlign: "center" }
              }
            >
              {r.is_submitted ? "Submitted" : "Not submitted"}
            </div>
            <div
              onClick={() =>
                assignmentId &&
                setStatus.mutate({ assignmentId, statusId: r.status_id, studentId: r.student_id, is_submitted: !r.is_submitted })
              }
              style={{ padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#1D4ED8", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {r.is_submitted ? "Mark not submitted" : "Mark submitted"}
            </div>
          </div>
        ))}
        {filteredRows.length === 0 && !students.isLoading && (
          <div style={{ padding: "40px 22px", textAlign: "center", fontSize: 13.5, color: "#94A3B8", fontWeight: 600 }}>
            {studentRows.length === 0 ? "No students found for this assignment." : "No students match this filter."}
          </div>
        )}
      </div>
    </div>
  );
}
