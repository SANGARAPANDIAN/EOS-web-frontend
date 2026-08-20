"use client";

import { useMemo, useState } from "react";
import { useStudentOds, useFacultyApproveOd, type StudentOdRow } from "@/modules/advisor/api/requests";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";

// Backed by GET /me/student-ods + PATCH /me/student-ods/:id/faculty-approve
// (StudentOdsController). Real OD requests are TEAM-based (unique_code,
// member_count, faculty_guide_name) with a from/to date+time range and a
// reason — there is no separate "event title"/"venue" field, so this screen
// shows the real fields (team code, member count, faculty guide, reason)
// instead of the design's invented event/venue text.

function initialsOf(name: string | null | undefined) {
  const p = (name ?? "").split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

type Status = "Pending" | "Approved" | "Rejected";

function displayStatus(s: string): Status {
  if (s === "pending") return "Pending";
  if (s === "rejected") return "Rejected";
  return "Approved";
}

function statusStyle(status: Status) {
  const map: Record<Status, { bg: string; border: string; color: string }> = {
    Approved: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" },
    Rejected: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
    Pending: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E3A8A" },
  };
  const t = map[status];
  return { padding: "6px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11.5, fontWeight: 800, letterSpacing: "0.03em" } as const;
}

function dateRangeLabel(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  const a = new Date(from).toLocaleDateString("en-IN", opts);
  const b = new Date(to).toLocaleDateString("en-IN", opts);
  return a === b ? a : `${a} – ${b}`;
}

export default function AdvisorOdPage() {
  const { classes } = useIsClassAdvisor();
  const ods = useStudentOds();
  const approve = useFacultyApproveOd();
  const [filter, setFilter] = useState<Status | "All">("Pending");

  const rows: StudentOdRow[] = ods.data?.data ?? [];
  const withStatus = useMemo(() => rows.map((r) => ({ ...r, statusLabel: displayStatus(r.mentor_approval_status) })), [rows]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { Pending: 0, Approved: 0, Rejected: 0 };
    withStatus.forEach((r) => c[r.statusLabel]++);
    return c;
  }, [withStatus]);

  const list = withStatus.filter((r) => filter === "All" || r.statusLabel === filter);
  const primaryClass = classes[0];

  const filters: { key: Status | "All"; label: string }[] = [
    { key: "Pending", label: `Pending (${counts.Pending})` },
    { key: "Approved", label: `Approved (${counts.Approved})` },
    { key: "Rejected", label: `Rejected (${counts.Rejected})` },
    { key: "All", label: `All (${withStatus.length})` },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Student OD</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        On-duty requests from your mentoring class only
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px", marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 14, height: 14, border: "2px solid #1D4ED8", borderRadius: 4 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.015em" }}>{primaryClass?.department.name ?? ""} {primaryClass ? `— ${primaryClass.section}` : ""}</div>
          <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 600, marginTop: 3 }}>
            {counts.Pending} pending · {withStatus.length} total
          </div>
        </div>
        <div style={{ padding: "7px 13px", background: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: 8, fontSize: 11.5, fontWeight: 800, color: "#1D4ED8", letterSpacing: "0.05em" }}>
          MY CLASS
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <div
              key={f.key}
              data-advisor-lift=""
              onClick={() => setFilter(f.key)}
              style={{ padding: "9px 17px", borderRadius: 22, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: active ? "#EFF6FF" : "#fff", border: `1px solid ${active ? "#93C5FD" : "#E2E8F0"}`, color: active ? "#1D4ED8" : "#475569" }}
            >
              {f.label}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {list.map((r) => (
          <div key={r.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initialsOf(r.creator.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                  {r.creator.name} {r.member_count > 1 ? `+ ${r.member_count - 1} more` : ""}
                </div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{r.creator.student_id_no} · Team {r.unique_code}</div>
              </div>
              <div style={statusStyle(r.statusLabel)}>{r.statusLabel.toUpperCase()}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14, marginTop: 16, paddingTop: 15, borderTop: "1px solid #F1F4F9" }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>DATES</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 5 }}>{dateRangeLabel(r.from_date, r.to_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>TIME</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 5 }}>{r.from_time && r.to_time ? `${r.from_time} – ${r.to_time}` : "All day"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>FACULTY GUIDE</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 5 }}>{r.faculty_guide_name ?? "—"}</div>
              </div>
            </div>
            {r.reason && <div style={{ fontSize: 13.5, color: "#475569", fontWeight: 500, marginTop: 14, lineHeight: 1.55 }}>{r.reason}</div>}
            {r.statusLabel === "Pending" && (
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <div
                  onClick={() => approve.mutate({ id: r.id, decision: "approved" })}
                  style={{ padding: "10px 22px", background: "#fff", border: "1px solid #93C5FD", color: "#1D4ED8", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Approve
                </div>
                <div
                  onClick={() => approve.mutate({ id: r.id, decision: "rejected" })}
                  style={{ padding: "10px 22px", background: "#fff", border: "1px solid #E2E8F0", color: "#475569", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Reject
                </div>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && !ods.isLoading && (
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 64, textAlign: "center" }}>
            <div style={{ width: 34, height: 34, border: "2px solid #CBD5E1", borderRadius: "50%", margin: "0 auto" }} />
            <div style={{ fontSize: 14, color: "#94A3B8", fontWeight: 600, marginTop: 14 }}>No requests here</div>
          </div>
        )}
      </div>
    </div>
  );
}
