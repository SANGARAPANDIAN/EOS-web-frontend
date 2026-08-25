"use client";

import { useMemo, useState } from "react";
import { useStudentLeaves, useFacultyApproveLeave, type StudentLeaveRow } from "@/modules/advisor/api/requests";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";
import { AdvisorIcon } from "@/modules/advisor/icons";

// Backed by GET /me/student-leaves + PATCH /me/student-leaves/:id/faculty-approve
// (StudentLeavesController). Backend has no separate "days" or "duration"
// field — computed client-side from from_date/to_date, same math the design
// implied. Status values are the real `student_leave_status_enum` strings
// ('pending' | 'faculty_approved' | 'hod_approved' | 'rejected'), mapped to
// the design's 3-state pill (Pending/Approved/Rejected).

function initialsOf(name: string | null | undefined) {
  const p = (name ?? "").split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

type Status = "Pending" | "Approved" | "Rejected";

function displayStatus(s: string): Status {
  if (s === "pending") return "Pending";
  if (s === "rejected") return "Rejected";
  return "Approved"; // faculty_approved / hod_approved
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

function durationLabel(from: string, to: string) {
  const a = new Date(from);
  const b = new Date(to);
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return `${days} day${days === 1 ? "" : "s"}`;
}

function dateRangeLabel(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  const a = new Date(from).toLocaleDateString("en-IN", opts);
  const b = new Date(to).toLocaleDateString("en-IN", opts);
  return a === b ? a : `${a} – ${b}`;
}

export default function AdvisorLeavePage() {
  const { isAdvisor, classes } = useIsClassAdvisor();
  const leaves = useStudentLeaves();
  const approve = useFacultyApproveLeave();
  const [filter, setFilter] = useState<Status | "All">("Pending");

  const rows: StudentLeaveRow[] = leaves.data?.data ?? [];
  const withStatus = useMemo(() => rows.map((r) => ({ ...r, statusLabel: displayStatus(r.status) })), [rows]);

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
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Student Leave</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        Leave applications from your mentoring class only
      </div>

      <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px", marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AdvisorIcon kind="leave" width={20} height={20} style={{ color: "#1D4ED8" }} />
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
                {initialsOf(r.student.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.student.name}</div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{r.student.student_id_no}</div>
              </div>
              <div style={statusStyle(r.statusLabel)}>{r.statusLabel.toUpperCase()}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14, marginTop: 16, paddingTop: 15, borderTop: "1px solid #F1F4F9" }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>DATES</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 5 }}>{dateRangeLabel(r.from_date, r.to_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>DURATION</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 5 }}>{durationLabel(r.from_date, r.to_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>APPLIED</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 5 }}>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
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
        {list.length === 0 && !leaves.isLoading && (
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 64, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <AdvisorIcon kind="leave" width={30} height={30} style={{ color: "#CBD5E1" }} />
            </div>
            <div style={{ fontSize: 14, color: "#94A3B8", fontWeight: 600, marginTop: 14 }}>No requests here</div>
          </div>
        )}
      </div>
    </div>
  );
}
