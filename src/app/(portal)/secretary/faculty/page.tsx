"use client";

import { useMemo, useState } from "react";
import { useBatchesLookup, useDepartmentsLookup } from "@/modules/secretary/api/announcements";
import { useFacultyDirectory, useFacultyAttendanceOverview } from "@/modules/secretary/api/faculty";
import { initialsOf } from "@/modules/secretary/helpers";

// Pixel-exact layout port of the `isFaculty` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 516-551.
//
// REAL BACKEND WIRING — ZERO fake data. Reads through EOSbackend1's real
// `GET /me/faculty` (directory) and `GET /me/faculty/attendance/overview`
// (real attendance %), both Secretary-granted this session — see
// `src/modules/secretary/api/faculty.ts` header comment for the full
// accounting of what has NO real backing anywhere and was dropped rather
// than faked: "load" (teaching hours), "duties"/"mentees" counts, the
// rich Available/On-duty/On-leave/Overloaded status (real `status` is
// only active/inactive — an account flag, not a live state), and any
// "assign duty" write action (no such endpoint exists).

export default function SecretaryFacultyPage() {
  const [search, setSearch] = useState("");
  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);

  const { data: directory, isLoading, error } = useFacultyDirectory({ department_id: cseDept?.id, search: search || undefined });
  const { data: attendanceOverview } = useFacultyAttendanceOverview(cseDept?.id);
  const attendanceMap = useMemo(() => new Map((attendanceOverview?.rows ?? []).map((r) => [r.faculty_id, r])), [attendanceOverview]);

  const rows = directory?.data ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Faculty Coordination</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Real-time directory and attendance across {directory?.meta.total ?? 0} faculty</p>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or designation" style={{ width: 260, height: 46, border: "1px solid #e5e9f2", borderRadius: 12, padding: "0 16px", fontSize: 12.6 }} />
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading faculty…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load faculty."}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
        {rows.map((f) => {
          const name = `${f.first_name} ${f.last_name}`.trim();
          const att = attendanceMap.get(f.id);
          const statusBg = f.status === "active" ? "#ecfdf5" : "#fef2f2";
          const statusFg = f.status === "active" ? "#047857" : "#b91c1c";
          return (
            <div key={f.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 999, background: "#eef4ff", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.2, fontWeight: 700 }}>{initialsOf(name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 11.8, color: "#64748b" }}>{f.designation}</div>
                </div>
                <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "5px 10px", background: statusBg, color: statusFg }}>{f.status === "active" ? "Active" : "Inactive"}</span>
              </div>
              <div style={{ display: "flex", gap: 22, margin: "16px 0 12px" }}>
                <div><div style={{ fontSize: 10.8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>Attendance</div><div style={{ fontSize: 15.7, fontWeight: 700 }}>{att ? `${att.attendance_percentage}%` : "—"}</div></div>
                <div><div style={{ fontSize: 10.8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>On duty/leave</div><div style={{ fontSize: 15.7, fontWeight: 700 }}>{att ? att.on_duty_or_leave : "—"}</div></div>
                <div><div style={{ fontSize: 10.8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>Absent</div><div style={{ fontSize: 15.7, fontWeight: 700 }}>{att ? att.absent : "—"}</div></div>
              </div>
              <div style={{ fontSize: 11.3, color: "#475569", borderTop: "1px solid #f5f7fa", paddingTop: 12 }}>{f.email}{f.phone ? ` · ${f.phone}` : ""}</div>
            </div>
          );
        })}
        {!isLoading && !error && rows.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No faculty matches that search.</div>
        )}
      </div>
    </div>
  );
}
