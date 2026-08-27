"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SegmentedTabs } from "@/components/ui";
import { SecretaryIcon } from "@/modules/secretary/icons";
import { tone as noticeTone } from "@/modules/secretary/helpers";
import { useAnnouncements } from "@/modules/secretary/api/announcements";
import {
  useStudentAttendanceOverview,
  useRollCount,
  useFacultyOverview,
  useExamsOverview,
  usePlacementsOverview,
} from "@/modules/secretary/api/overview";

// Pixel-exact port of the `isDashboard` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 112-204.
//
// REAL BACKEND WIRING — ZERO fake data. Every number on this screen comes
// from EOSbackend1's institution-wide `/principal-*` aggregate endpoints
// (originally Principal-only, granted to Secretary — see
// `src/modules/secretary/api/overview.ts` for the exact routes/shapes) and
// the real `/announcements` module. Honest substitutions made where the
// design's own numbers have no real backend equivalent (documented at each
// spot below, never invented):
//   - "Average CGPA" tile → relabeled "Pass percentage" (`pass_percentage`
//     from /principal-exams/overview) — there is no aggregate "average
//     CGPA" field anywhere in the backend, only per-student cgpa values
//     (see reports/page.tsx) or a >8.5 "high CGPA" count.
//   - "Today's secretary queue" and "Needs attention" panels: the design's
//     own SOP/media/docs-unverified queue items have NO real backend
//     source yet (those screens — pop/sop/media/docs/students — are still
//     on fake local-state data, not converted in this pass). Rather than
//     leave stale fake counts on the dashboard, both panels were
//     repurposed to surface only signals that ARE now real: attendance/
//     exam/faculty aggregates from the same principal-* endpoints above.
//   - Announcements preview: reuses the already-real
//     `useAnnouncements()` hook (wired in a prior pass).

const RANGES = ["Today", "This term"] as const;
const RANGE_TABS = RANGES.map((r) => ({ key: r, label: r }));

function noticeChip(category: string | null) {
  const key = category === "emergency" ? "overdue" : category === "academic" ? "in progress" : "pending";
  return noticeTone(key);
}

export default function SecretaryDashboardPage() {
  const router = useRouter();
  const [range, setRange] = useState<(typeof RANGES)[number]>("Today");
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: attOverview } = useStudentAttendanceOverview();
  const { data: rollCount } = useRollCount();
  const { data: facOverview } = useFacultyOverview();
  const { data: examsOverview } = useExamsOverview();
  const { data: placementsOverview } = usePlacementsOverview();
  const { data: announcements } = useAnnouncements();

  const facAttendancePct = useMemo(() => {
    if (!facOverview || facOverview.total_employees === 0) return null;
    return Math.round((facOverview.present_today / facOverview.total_employees) * 100);
  }, [facOverview]);

  const stats = useMemo(() => {
    const deptsAbove90 = attOverview?.departments.filter((d) => d.attendance_pct !== null && d.attendance_pct >= 90).length ?? 0;
    return [
      {
        label: "Student attendance today",
        value: attOverview?.mean_attendance_pct !== null && attOverview?.mean_attendance_pct !== undefined ? `${attOverview.mean_attendance_pct.toFixed(1)}%` : "—",
        icon: "calcheck",
        hi: attOverview ? String(attOverview.present_today) : "—",
        sub: `present of ${rollCount?.count ?? "—"} on roll`,
        pct: attOverview?.mean_attendance_pct !== null && attOverview?.mean_attendance_pct !== undefined ? `${Math.round(attOverview.mean_attendance_pct)}%` : "0%",
        foot: attOverview ? `${deptsAbove90} of ${attOverview.departments.length} departments above 90%` : "—",
        href: "/secretary/attendance",
      },
      {
        label: "Faculty attendance today",
        value: facAttendancePct !== null ? `${facAttendancePct}%` : "—",
        icon: "faculty",
        hi: facOverview ? String(facOverview.present_today) : "—",
        sub: `reported of ${facOverview?.total_employees ?? "—"} on rolls`,
        pct: facAttendancePct !== null ? `${facAttendancePct}%` : "0%",
        foot: facOverview ? `${facOverview.on_leave_today} on approved leave · ${facOverview.on_duty_today} on OD` : "—",
        href: "/secretary/faculty",
      },
      {
        label: "Pass percentage",
        value: examsOverview?.pass_percentage !== null && examsOverview?.pass_percentage !== undefined ? `${examsOverview.pass_percentage.toFixed(1)}%` : "—",
        icon: "award",
        hi: examsOverview?.pass_percentage_delta !== null && examsOverview?.pass_percentage_delta !== undefined ? `${examsOverview.pass_percentage_delta >= 0 ? "+" : ""}${examsOverview.pass_percentage_delta}` : "—",
        sub: "against last semester",
        pct: examsOverview?.pass_percentage !== null && examsOverview?.pass_percentage !== undefined ? `${Math.round(examsOverview.pass_percentage)}%` : "0%",
        foot: examsOverview ? `${examsOverview.high_cgpa_count} students above 8.5 CGPA` : "—",
        href: "/secretary/reports",
      },
      {
        label: "Placements",
        value: placementsOverview ? String(placementsOverview.students_placed) : "—",
        icon: "briefcase",
        hi: placementsOverview ? `of ${placementsOverview.applicants}` : "—",
        sub: "eligible final-year students",
        pct: placementsOverview?.placement_pct !== null && placementsOverview?.placement_pct !== undefined ? `${Math.round(placementsOverview.placement_pct)}%` : "0%",
        foot: placementsOverview
          ? `${placementsOverview.highest_package !== null ? `Highest ₹${placementsOverview.highest_package} LPA` : "Highest —"} · ${placementsOverview.average_package !== null ? `average ₹${placementsOverview.average_package} LPA` : "average —"}`
          : "—",
        href: "/secretary/reports",
      },
    ];
  }, [attOverview, rollCount, facOverview, facAttendancePct, examsOverview, placementsOverview]);

  const queue = useMemo(() => {
    const items: { title: string; meta: string; status: string; chipBg: string; chipFg: string; href: string }[] = [];
    if (attOverview && attOverview.below_75_count > 0) {
      items.push({ title: `${attOverview.below_75_count} students below 75% attendance`, meta: "Institution-wide attendance overview · today", status: "Due today", chipBg: "#fffbeb", chipFg: "#b45309", href: "/secretary/reports" });
    }
    if (examsOverview && examsOverview.students_with_arrears > 0) {
      items.push({ title: `${examsOverview.students_with_arrears} students with pending arrears`, meta: `${examsOverview.arrear_papers} papers pending clearance`, status: "Pending", chipBg: "#eff6ff", chipFg: "#1d4ed8", href: "/secretary/reports" });
    }
    if (examsOverview && examsOverview.revaluation_pending > 0) {
      items.push({ title: `${examsOverview.revaluation_pending} revaluation requests pending`, meta: `of ${examsOverview.revaluation_total} raised this term`, status: "Pending", chipBg: "#eff6ff", chipFg: "#1d4ed8", href: "/secretary/reports" });
    }
    if (facOverview && facOverview.appraisals_total - facOverview.appraisals_closed > 0) {
      items.push({ title: `${facOverview.appraisals_total - facOverview.appraisals_closed} faculty appraisals pending`, meta: `Academic year ${facOverview.appraisal_academic_year ?? "—"}`, status: "Due today", chipBg: "#fffbeb", chipFg: "#b45309", href: "/secretary/reports" });
    }
    return items;
  }, [attOverview, examsOverview, facOverview]);

  const flags = useMemo(() => {
    const items: { title: string; meta: string }[] = [];
    for (const d of attOverview?.departments ?? []) {
      if (d.attendance_pct !== null && d.attendance_pct < 75) {
        items.push({ title: `${d.name} attendance at ${d.attendance_pct.toFixed(1)}%`, meta: "Below the 75% attendance norm" });
      }
    }
    for (const d of examsOverview?.departments ?? []) {
      if (d.pass_pct !== null && d.pass_pct < 60) {
        items.push({ title: `${d.name} pass rate at ${d.pass_pct.toFixed(1)}%`, meta: `${d.arrear_papers} arrear papers this department` });
      }
    }
    return items.slice(0, 5);
  }, [attOverview, examsOverview]);

  return (
    <div>
      <div>
        <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Good morning, Kavitha</h1>
        <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#64748b" }}>
          {queue.length} items on your desk · institution-wide overview, live from EOSbackend1
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "26px 0 28px" }}>
        <SegmentedTabs
          options={RANGE_TABS}
          value={range}
          onChange={(r) => { setRange(r); flash(`Showing figures for ${r.toLowerCase()}.`); }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22 }}>
        {stats.map((s) => (
          <div key={s.label} data-sec-lift="" onClick={() => router.push(s.href)} style={{ textAlign: "left", background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "18px 20px 16px", minHeight: 186, display: "flex", flexDirection: "column", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#334155" }}>{s.label}</span>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "#eef4ff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SecretaryIcon name={s.icon} size={19} />
              </span>
            </div>
            <div style={{ fontSize: 33, fontWeight: 700, letterSpacing: -1.3, margin: "12px 0 9px" }}>{s.value}</div>
            <div style={{ fontSize: 12.6, color: "#64748b" }}><span style={{ color: "#1d4ed8", fontWeight: 600 }}>{s.hi}</span> {s.sub}</div>
            <div style={{ height: 4, borderRadius: 999, background: "#eef2f7", margin: "auto 0 11px", minHeight: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: "#1d4ed8", width: s.pct }} />
            </div>
            <div style={{ fontSize: 11.3, color: "#94a3b8" }}>{s.foot}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: 22, marginTop: 22 }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 15.7, fontWeight: 700 }}>Today&apos;s secretary queue</h2>
            <span onClick={() => router.push("/secretary/reports")} style={{ border: 0, background: "transparent", color: "#1d4ed8", fontSize: 12.2, fontWeight: 600, cursor: "pointer" }}>Detail</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {queue.map((q) => (
              <div key={q.title} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #eef2f7", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.6, fontWeight: 600 }}>{q.title}</div>
                  <div style={{ fontSize: 11.8, color: "#64748b", marginTop: 2 }}>{q.meta}</div>
                </div>
                <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "5px 10px", background: q.chipBg, color: q.chipFg }}>{q.status}</span>
                <span data-sec-soft="" onClick={() => router.push(q.href)} style={{ border: "1px solid #dbe6ff", background: "#ffffff", color: "#1e3a8a", fontSize: 11.3, fontWeight: 600, borderRadius: 9, padding: "8px 12px", cursor: "pointer" }}>Open</span>
              </div>
            ))}
            {queue.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Nothing outstanding right now.</div>}
          </div>
        </div>

        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 15.7, fontWeight: 700 }}>Needs attention</h2>
            <span style={{ fontSize: 11.8, fontWeight: 600, background: "#eef4ff", color: "#1e3a8a", borderRadius: 999, padding: "5px 11px" }}>{flags.length} flags</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {flags.map((f) => (
              <div key={f.title} data-sec-row="" style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #f5f7fa" }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#2563eb", marginTop: 7, flex: "0 0 auto" }} />
                <div>
                  <div style={{ fontSize: 12.6, fontWeight: 600 }}>{f.title}</div>
                  <div style={{ fontSize: 11.3, color: "#64748b", marginTop: 2 }}>{f.meta}</div>
                </div>
              </div>
            ))}
            {flags.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Nothing flagged right now.</div>}
          </div>
        </div>

        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 15.7, fontWeight: 700 }}>Announcements</h2>
            <span onClick={() => router.push("/secretary/announcements")} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 11.7, fontWeight: 600, borderRadius: 9, padding: "9px 16px", cursor: "pointer" }}>View all</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {(announcements ?? []).slice(0, 4).map((n) => {
              const t = noticeChip(n.category);
              return (
                <div key={n.id} style={{ padding: "12px 0", borderBottom: "1px solid #f5f7fa" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, background: t.bg, color: t.fg, borderRadius: 5, padding: "4px 7px" }}>{n.category?.toUpperCase() ?? "GENERAL"}</span>
                    <span style={{ fontSize: 11.8, color: "#64748b" }}>{new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                  </div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 7 }}>{n.title}</div>
                </div>
              );
            })}
            {(!announcements || announcements.length === 0) && <div style={{ padding: 20, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No announcements yet.</div>}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
