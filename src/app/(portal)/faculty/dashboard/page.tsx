"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SegmentedTabs } from "@/components/ui";
import { useMyFacultyProfile, useIsClassAdvisor } from "@/modules/advisor/api/profile";
import { useTodayClasses, useMenteeRoster } from "@/modules/advisor/api/dashboard";
import { useStudentLeaves, useStudentOds } from "@/modules/advisor/api/requests";
import { useAnnouncements } from "@/modules/advisor/api/announcements";
import { useMentoredStudents, useAllMenteesPlacementHistory } from "@/modules/advisor/api/placements";
import { AdvisorIcon, type AdvisorIconKind } from "@/modules/advisor/icons";

// Structural port of the `isDashboard` block in
// "Advisor (Final) - Web/Faculty Portal.dc.html", now driven end-to-end by
// EOSbackend1. There is no single dashboard-aggregate endpoint, so this page
// composes several real endpoints. "Class placements" was previously
// hardcoded to fabricated numbers ("9 / 12", "2 drives running today") —
// fixed to compute a real placed-count from GET /me/mentored-students +
// GET /me/mentored-students/:id/placement-history (same real source the
// Placements page itself uses), same as everything else on this page.

function daysAgo(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export default function AdvisorDashboardPage() {
  const [scope, setScope] = useState<"today" | "term">("today");

  const myProfile = useMyFacultyProfile();
  const { isAdvisor, classes: menteeClasses } = useIsClassAdvisor();
  const primaryMentee = menteeClasses[0];

  const today = useTodayClasses();
  const leaves = useStudentLeaves();
  const ods = useStudentOds();
  const roster = useMenteeRoster(primaryMentee?.class_id, scope === "today" ? "today" : undefined);
  const announcements = useAnnouncements();

  // "Class placements" KPI — real, computed from GET /me/mentored-students +
  // GET /me/mentored-students/:id/placement-history (same source the
  // Placements page itself uses), replacing what used to be hardcoded
  // fabricated numbers ("9 / 12", "2 drives running today").
  const mentees = useMentoredStudents();
  const menteeIds = (mentees.data ?? []).map((s) => s.student_id);
  const menteeHistory = useAllMenteesPlacementHistory(menteeIds);
  const placementsLoaded = menteeIds.length > 0 && menteeHistory.every((q) => !q.isLoading);
  const placedStudentCount = menteeHistory.filter((q) => (q.data ?? []).some((h) => h.application_status === "placed")).length;

  const firstName = (myProfile.data?.name ?? "").replace(/^Dr\.?\s+/i, "").split(" ")[0];

  // Deliberately NOT scoped by Today/This term — a pending request is
  // equally actionable regardless of when it was raised, and the sidebar's
  // own pending badge (AdvisorShell, usePendingStudentLeaveCount/OdCount)
  // is never scoped either. Filtering this to "raised today" previously
  // made the KPI show "0 · nothing waiting" on the default Today tab while
  // the sidebar badge and the Leave/OD pages themselves showed a real
  // pending count one glance away — a same-screen inconsistency, and worse,
  // it actively hid actionable items behind the default tab.
  const pendingLeaves = useMemo(() => (leaves.data?.data ?? []).filter((r) => r.status === "pending"), [leaves.data]);
  const pendingOds = useMemo(() => (ods.data?.data ?? []).filter((r) => r.mentor_approval_status === "pending"), [ods.data]);
  const totalPending = pendingLeaves.length + pendingOds.length;

  const todayClasses = today.data ?? [];
  // The backend's /me/classes/today has no "completed" flag at all — derive
  // it client-side from the current time vs each slot's end_time.
  const nowHm = new Date().toTimeString().slice(0, 5);
  const upcoming = todayClasses.filter((c) => c.end_time >= nowHm);
  const doneCount = todayClasses.length - upcoming.length;

  const rosterRows = roster.data?.students ?? [];
  // null attendance_percent means "no attendance record yet" (most students,
  // every day, before their periods are marked) — excluded from the average
  // rather than counted as a 0%, which would otherwise read as "everyone
  // absent" the moment nothing has been marked yet.
  const rosterWithAttendance = rosterRows.filter((r) => r.attendance_percent !== null);
  const meanAttendance = rosterWithAttendance.length
    ? Math.round((rosterWithAttendance.reduce((s, r) => s + (r.attendance_percent ?? 0), 0) / rosterWithAttendance.length) * 10) / 10
    : null;
  const meanCgpa = rosterRows.length
    ? Math.round((rosterRows.reduce((s, r) => s + (r.cgpa ?? 0), 0) / rosterRows.length) * 10) / 10
    : null;
  const arrearCount = rosterRows.filter((r) => (r.arrears ?? 0) > 0).length;

  const kpis = [
    {
      label: "Classes today",
      icon: "subject",
      value: String(todayClasses.length || 0),
      sub: `${doneCount} taken · ${upcoming.length} remaining`,
      bar: todayClasses.length ? Math.round((doneCount / todayClasses.length) * 100) : 0,
      foot: upcoming[0] ? `Next: Period ${upcoming[0].period_number} · ${upcoming[0].class_section}` : "No more classes today",
      href: "/faculty/timetable",
    },
    {
      label: "My class attendance",
      icon: "attendance",
      value: meanAttendance !== null ? `${meanAttendance}%` : "—",
      sub: `${primaryMentee?.label ?? ""} · ${rosterRows.length} students${scope === "today" ? " · today" : " · this term"}`,
      bar: meanAttendance !== null ? Math.round(meanAttendance) : 0,
      foot:
        scope === "today"
          ? rosterWithAttendance.length === 0
            ? "No attendance marked yet today"
            : `${rosterWithAttendance.filter((r) => r.attendance_percent === 0).length} of ${rosterWithAttendance.length} marked absent today`
          : arrearCount > 0
            ? `${arrearCount} student(s) with arrears`
            : "No arrears flagged",
      href: "/faculty/attendance",
    },
    {
      label: "Pending approvals",
      icon: "leave",
      value: String(totalPending),
      sub: `${pendingLeaves.length} leave · ${pendingOds.length} OD`,
      bar: Math.min(100, Math.round((totalPending / Math.max(rosterRows.length, 1)) * 100)),
      foot: [...pendingLeaves.map((r) => r.created_at), ...pendingOds.map((r) => r.created_at)].length
        ? `Oldest raised ${daysAgo([...pendingLeaves.map((r) => r.created_at), ...pendingOds.map((r) => r.created_at)].sort()[0]) ?? "recently"}`
        : "Nothing waiting",
      href: "/faculty/leave",
    },
    {
      label: "Class placements",
      icon: "results",
      value: menteeIds.length ? `${placedStudentCount} / ${menteeIds.length}` : "—",
      sub: placementsLoaded && menteeIds.length ? `${Math.round((placedStudentCount / menteeIds.length) * 100)}% of the class` : "—",
      bar: menteeIds.length ? Math.round((placedStudentCount / menteeIds.length) * 100) : 0,
      foot: menteeIds.length ? `${menteeIds.length - placedStudentCount} yet to be placed` : "not the mentor of any class",
      href: "/faculty/placements",
    },
  ] as { label: string; icon: AdvisorIconKind; value: string; sub: string; bar: number; foot: string; href: string }[];

  const needsAttention = [
    ...pendingLeaves.map((r) => ({ title: `Leave request unattended`, sub: `${r.student.name} · ${daysAgo(r.created_at) ?? "recently"}` })),
    ...pendingOds.map((r) => ({ title: `OD request unattended`, sub: `${r.creator.name} · ${daysAgo(r.created_at) ?? "recently"}` })),
  ].slice(0, 6);

  const recentAnnouncements = (announcements.data ?? []).slice(0, 3);

  return (
    <div>
      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>
        {firstName ? `Good morning, ${firstName}` : "Good morning"}
      </div>
      <div style={{ marginTop: 8, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        {todayClasses.length > 0 ? ` · ${todayClasses.length} classes today` : ""} · attendance window closes at 4.15 pm
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        {/* Only "My class attendance" below responds to this scope, and that
            card only exists for a class mentor — for any other faculty
            there is nothing on this page the toggle would change, so it's
            hidden rather than shown inert. */}
        {isAdvisor && primaryMentee && (
          <SegmentedTabs
            options={[
              { key: "today", label: "Today" },
              { key: "term", label: "This term" },
            ]}
            value={scope}
            onChange={setScope}
          />
        )}
        <Link
          href="/faculty/attendance"
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 18px", height: 44, background: "#1D4ED8", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#fff", cursor: "pointer", textDecoration: "none" }}
        >
          Mark attendance
        </Link>
        <div style={{ flex: 1 }} />
        {totalPending > 0 && (
          <Link
            href="/faculty/leave"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px", height: 44, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#1E3A8A", textDecoration: "none" }}
          >
            {totalPending} approval{totalPending === 1 ? "" : "s"} waiting on you
          </Link>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length}, minmax(0,1fr))`, gap: 16, marginTop: 20 }}>
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            data-advisor-lift=""
            style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, cursor: "pointer", display: "block", textDecoration: "none", color: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#475569" }}>{k.label}</div>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AdvisorIcon kind={k.icon} width={17} height={17} style={{ color: "#1D4ED8" }} />
              </div>
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.035em", marginTop: 10 }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: "#64748B", fontWeight: 500, marginTop: 4 }}>{k.sub}</div>
            <div style={{ height: 6, borderRadius: 6, background: "#EDF1F7", marginTop: 14, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${k.bar}%`, background: "#1D4ED8", borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, marginTop: 12 }}>{k.foot}</div>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 16, alignItems: "stretch" }}>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Up next</div>
            <Link href="/faculty/timetable" style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>
              Full timetable
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {upcoming.slice(0, 2).map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 13px", border: "1px solid #EEF1F6", borderRadius: 11 }}>
                <div style={{ width: 46, fontSize: 12, fontWeight: 800, color: "#1D4ED8" }}>P{t.period_number}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.subject_name}</div>
                  <div style={{ fontSize: 11.5, color: "#7C8899", fontWeight: 500, marginTop: 2 }}>
                    {[t.class_section, `${t.start_time} – ${t.end_time}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, borderRadius: 20, padding: "4px 10px", background: i === 0 ? "#DBEAFE" : "#F1F4F9", color: i === 0 ? "#1D4ED8" : "#7C8899" }}>
                  {i === 0 ? "Next" : "Later"}
                </div>
              </div>
            ))}
            {upcoming.length === 0 && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>No more classes scheduled today.</div>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 16 }} />
          <Link
            href="/faculty/attendance"
            style={{ marginTop: 12, textAlign: "center", padding: 12, background: "#1D4ED8", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "block" }}
          >
            Mark attendance
          </Link>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Needs attention</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", border: "1px solid #E2E8F0", borderRadius: 20, padding: "4px 11px" }}>
              {needsAttention.length} flags
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 12 }}>
            {needsAttention.map((f, i) => (
              <div key={`${f.title}-${i}`} style={{ display: "flex", gap: 11, padding: "13px 0", borderBottom: "1px solid #F1F4F9" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D4ED8", marginTop: 6, flex: "0 0 7px" }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#7C8899", fontWeight: 500, marginTop: 3 }}>{f.sub}</div>
                </div>
              </div>
            ))}
            {needsAttention.length === 0 && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>Nothing needs attention right now.</div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/faculty/leave" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F4F9", fontSize: 12.5, fontWeight: 700, color: "#1D4ED8", cursor: "pointer", textDecoration: "none" }}>
            Review all flags →
          </Link>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Announcements</div>
            <Link href="/faculty/announcements" style={{ padding: "7px 14px", background: "#1D4ED8", color: "#fff", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>
              View all
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {recentAnnouncements.map((a) => (
              <div key={a.id} style={{ padding: "13px 14px", border: "1px solid #EEF1F6", borderRadius: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em", color: "#1D4ED8", background: "#EFF6FF", borderRadius: 6, padding: "3px 8px" }}>
                    {(a.target_audience ?? "general").toUpperCase()}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>{daysAgo(a.created_at) ?? "today"}</div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 9, lineHeight: 1.4 }}>{a.title}</div>
              </div>
            ))}
            {recentAnnouncements.length === 0 && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>No announcements yet.</div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/faculty/announcements" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F4F9", fontSize: 12.5, fontWeight: 700, color: "#1D4ED8", cursor: "pointer", textDecoration: "none" }}>
            Open the board →
          </Link>
        </div>
      </div>

      {isAdvisor && primaryMentee && (
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>
              My class · {primaryMentee.label}
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>Class advisor view</div>
            <div style={{ flex: 1 }} />
            <Link href="/faculty/students" style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8", textDecoration: "none" }}>
              Class board
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginTop: 18 }}>
            {[
              { label: "Students", value: String(rosterRows.length), sub: primaryMentee.label },
              meanAttendance !== null && { label: "Mean attendance", value: `${meanAttendance}%`, sub: scope === "today" ? "today" : "this term" },
              meanCgpa !== null && { label: "Mean CGPA", value: String(meanCgpa), sub: "across the class" },
              { label: "Pending requests", value: String(totalPending), sub: "leave + OD" },
            ]
              .filter(Boolean)
              .map((c) => {
                const item = c as { label: string; value: string; sub: string };
                return (
                  <div key={item.label} data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{item.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8, color: "#0F172A" }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, marginTop: 4 }}>{item.sub}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
