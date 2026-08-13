"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, StatCard, Button, Badge, EmptyState, SegmentedTabs, Spinner, SkeletonStatTiles, SkeletonBlock } from "@/components/ui";
import { useHodDashboard } from "@/modules/hod/api/dashboard";
import { formatLongDate, greetingForHour, formatDayAndTime } from "@/lib/utils/date";

const RANGE_TABS = [
  { key: "today", label: "Today" },
  { key: "term", label: "This term" },
];

export default function HodDashboardPage() {
  const [range, setRange] = useState<"today" | "term">("today");
  const dashboard = useHodDashboard(range);
  const d = dashboard.data;
  const firstName = d?.faculty.name.split(" ").slice(-1)[0];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {dashboard.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load dashboard data — {dashboard.error instanceof Error ? dashboard.error.message : "please try again."}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">
            {greetingForHour()}
            {d ? `, ${d.faculty.name}` : firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {formatLongDate(new Date(), true)}
            {d ? ` · ${d.department.name} · figures for ${range === "term" ? "this term" : "today"}` : ""}
          </p>
        </div>
        <SegmentedTabs
          options={RANGE_TABS}
          value={range}
          onChange={(key) => setRange(key === "term" ? "term" : "today")}
        />
      </div>

      {dashboard.isLoading && !d ? (
        <div className="flex flex-col gap-5">
          <SkeletonStatTiles count={4} />
          <div className="grid grid-cols-[1fr_1.15fr_1.2fr] gap-4">
            <SkeletonBlock />
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
          <SkeletonBlock />
        </div>
      ) : (
        <>
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          className="hod-hover-card"
          label={range === "term" ? "Student attendance this term" : "Student attendance today"}
          value={d ? `${d.student_attendance.percentage}%` : "—"}
          sub={
            d
              ? range === "term"
                ? `${d.student_attendance.present.toLocaleString("en-IN")} present-marks of ${d.student_attendance.on_roll.toLocaleString("en-IN")} recorded this term`
                : `${d.student_attendance.present.toLocaleString("en-IN")} present of ${d.student_attendance.on_roll.toLocaleString("en-IN")} on roll`
              : undefined
          }
          barPercent={d?.student_attendance.percentage}
        />
        <StatCard
          className="hod-hover-card"
          label={range === "term" ? "Faculty attendance this term" : "Faculty attendance today"}
          value={d ? `${d.faculty_attendance.percentage}%` : "—"}
          sub={
            d
              ? range === "term"
                ? `${d.faculty_attendance.reported} attendance-days of ${d.faculty_attendance.on_roll} recorded this term`
                : `${d.faculty_attendance.reported} reported of ${d.faculty_attendance.on_roll} on rolls`
              : undefined
          }
          barPercent={d?.faculty_attendance.percentage}
        />
        <StatCard
          className="hod-hover-card"
          label="Average CGPA"
          value={d?.average_cgpa.value ?? (dashboard.isLoading ? "—" : "N/A")}
          delta={
            d?.average_cgpa.change != null
              ? `${d.average_cgpa.change >= 0 ? "+" : ""}${d.average_cgpa.change}`
              : undefined
          }
          sub="against last semester"
        />
        <StatCard
          className="hod-hover-card"
          label="Placements"
          value={d?.placements.placed_count ?? (dashboard.isLoading ? "—" : "—")}
          sub={d ? `of ${d.placements.eligible_count} eligible final-year students` : undefined}
          barPercent={
            d && d.placements.eligible_count > 0
              ? Math.round((d.placements.placed_count / d.placements.eligible_count) * 100)
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-[1fr_1.15fr_1.2fr] gap-4">
        <Card className={!d || d.up_next.length === 0 ? "hod-hover-card" : undefined}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-ink">Up next</h2>
            <Link href="/hod/employee/timetable">
              <Button variant="text">Full timetable</Button>
            </Link>
          </div>
          {!d || d.up_next.length === 0 ? (
            <EmptyState loading={dashboard.isLoading} size={32} message="No more periods left today." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {d.up_next.map((slot, i) => (
                <div
                  key={slot.id}
                  className="hod-hover-card flex items-center gap-3.5 rounded-[11px] border border-border-default px-3.5 py-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-icon-chip text-[13px] font-extrabold text-primary">
                    {slot.period_label}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">
                      {slot.subject_code} {slot.subject_name}
                    </div>
                    <div className="text-[12px] text-muted">
                      {slot.class_label} · {slot.start_time} – {slot.end_time}
                    </div>
                  </div>
                  <Badge tone={i === 0 ? "accent" : "neutral"}>{i === 0 ? "Next" : "Later"}</Badge>
                </div>
              ))}
            </div>
          )}
          {d && (
            <Link href="/hod/my-class/attendance" className="mt-3 block">
              <Button variant="primary">Mark attendance</Button>
            </Link>
          )}
        </Card>

        <Card className="hod-hover-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-ink">Needs attention</h2>
            {d && d.needs_attention.flags.length > 0 && (
              <Badge tone="accentDark">{d.needs_attention.flags.length} flags</Badge>
            )}
          </div>
          {!d || d.needs_attention.flags.length === 0 ? (
            <EmptyState loading={dashboard.isLoading} size={32} message="You're all caught up." />
          ) : (
            <div className="flex flex-col gap-3">
              {d.needs_attention.flags.map((f, i) => (
                <div key={`${f.type}-${i}`} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-[13px] font-bold text-ink">{f.title}</div>
                    <div className="text-[11.5px] text-muted">{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-extrabold text-ink">Announcements</h2>
              {/* Background refresh (e.g. a new announcement just got posted) — the
                  previous list stays fully visible underneath, this is just a cue
                  that it's being brought up to date, not a full-list replacement. */}
              {dashboard.isFetching && !dashboard.isLoading && <Spinner size={14} className="text-subtle" />}
            </div>
            <Link href="/hod/announcements">
              <Button variant="primarySmall">View all</Button>
            </Link>
          </div>
          {!d || d.announcements.length === 0 ? (
            <EmptyState loading={dashboard.isLoading} size={32} message="No announcements yet." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {d.announcements.map((a) => (
                <div
                  key={a.id}
                  className="hod-hover-row flex flex-col gap-1.5 rounded-[11px] border border-border-default px-3.5 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{a.tag}</Badge>
                    <span className="text-[11px] text-subtle">{formatDayAndTime(a.posted_at)}</span>
                  </div>
                  <div className="text-[13.5px] font-bold text-ink">{a.title}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-extrabold text-ink">
              My department · {d?.department.code ?? ""}
            </h2>
            <p className="text-[12px] text-muted">
              {d
                ? `Head of department view · ${d.my_department.class_count} classes · ${d.my_department.student_count.toLocaleString("en-IN")} students · ${d.my_department.faculty_count} faculty`
                : "Head of department view"}
            </p>
          </div>
          <Link href="/hod/class-records">
            <Button variant="text">Department board</Button>
          </Link>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <StatCard
            className="hod-hover-card"
            label="Attendance"
            value={d ? `${d.my_department.attendance_percent}%` : "—"}
            sub="term to date"
          />
          <StatCard
            className="hod-hover-card"
            label="Below 75%"
            value={d?.my_department.below_threshold_count ?? "—"}
            sub="condonation needed"
          />
          <StatCard
            className="hod-hover-card"
            label="Average CGPA"
            value={d?.my_department.average_cgpa ?? "—"}
            sub="current semester"
          />
          <StatCard
            className="hod-hover-card"
            label="Arrears"
            value={d?.my_department.arrears_count ?? "—"}
            sub="students affected"
          />
          <StatCard
            className="hod-hover-card"
            label="Placed"
            value={d ? `${d.my_department.placed_count} / ${d.my_department.eligible_count}` : "—"}
            sub="eligible final-year"
          />
          <StatCard
            className="hod-hover-card"
            label="Pending requests"
            value={d?.my_department.pending_requests_count ?? "—"}
            sub="leave · OD"
          />
        </div>
      </Card>
        </>
      )}
    </div>
  );
}
