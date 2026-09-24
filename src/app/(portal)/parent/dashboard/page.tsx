"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, StatCard, Badge, EmptyState, Skeleton, DateTile } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildAcademicCalendar } from "@/modules/parent/api/calendar";
import { useChildAttendance } from "@/modules/parent/api/attendance";
import { useChildFees } from "@/modules/parent/api/fees";
import { useChildTimetableForDay } from "@/modules/parent/api/timetable";
import { useChildUpcomingDrives } from "@/modules/parent/api/placements";
import { useChildCgpa, useChildPerformance } from "@/modules/parent/api/performance";
import { useChildPendingLmsTasks } from "@/modules/parent/api/lms";
import { useChildExamSchedule } from "@/modules/parent/api/examSchedule";
import { useChildLeaves } from "@/modules/parent/api/leave";
import { useChildOdRequests } from "@/modules/parent/api/od";
import { useChildBonafideRequests } from "@/modules/parent/api/bonafide";
import { useChildBorrowRecords } from "@/modules/parent/api/library";
import { useAnnouncements } from "@/modules/shared/api/announcements";
import {
  ATTENDANCE_THRESHOLD_PERCENT,
  APPLICATION_STATUS_LABEL,
  classesToReachThreshold,
  isPassingPercentage,
} from "@/lib/config";
import { todayDateOnly, todayBackendDayOfWeek, formatDisplayDate, formatDayAndTime, greetingForHour } from "@/lib/utils/date";
import { sectionLabel } from "@/lib/utils/academic";
import { cn } from "@/lib/utils/cn";

interface Flag {
  key: string;
  shortLabel: string;
  title: string;
  description: string;
  href: string;
}

interface TimelineItem {
  date: string;
  title: string;
  meta: string;
  href: string;
}

const ROW_HOVER = "transition-colors hover:bg-nav-hover";

export default function ParentDashboardPage() {
  const { children, isLoading: childrenLoading, selectedChild, selectedChildId } = useSelectedChild();

  const academicCalendar = useChildAcademicCalendar(selectedChildId);
  const today = todayDateOnly();
  const from = academicCalendar.data?.start_date ?? undefined;
  const attendance = useChildAttendance(selectedChildId, from, from ? today : undefined);
  const fees = useChildFees(selectedChildId);
  const todayDay = todayBackendDayOfWeek();
  const dayTimetable = useChildTimetableForDay(selectedChildId, todayDay);
  const drives = useChildUpcomingDrives(selectedChildId);
  const semester = academicCalendar.data?.semester ?? null;
  const cgpa = useChildCgpa(selectedChildId, semester);
  const performance = useChildPerformance(selectedChildId, semester);
  const pendingLms = useChildPendingLmsTasks(selectedChildId);
  const examSchedule = useChildExamSchedule(selectedChildId);
  const leaves = useChildLeaves(selectedChildId);
  const odRequests = useChildOdRequests(selectedChildId);
  const bonafide = useChildBonafideRequests(selectedChildId);
  const borrowedBooks = useChildBorrowRecords(selectedChildId, "borrowed");
  const announcements = useAnnouncements();

  const totalFeeDue = useMemo(() => fees.data?.demands.reduce((sum, d) => sum + d.due, 0) ?? 0, [fees.data]);
  const pendingFeeHeads = useMemo(() => fees.data?.demands.filter((d) => d.due > 0).length ?? 0, [fees.data]);

  const nextEvent = useMemo(() => {
    const events = academicCalendar.data?.events ?? [];
    return events.filter((e) => e.event_date.slice(0, 10) >= today).sort((a, b) => a.event_date.localeCompare(b.event_date))[0] ?? null;
  }, [academicCalendar.data, today]);

  const worstAttendanceSubject = useMemo(() => {
    const rows = attendance.data?.by_subject ?? [];
    const atRisk = rows.filter((s) => s.percentage < ATTENDANCE_THRESHOLD_PERCENT);
    if (atRisk.length === 0) return null;
    return atRisk.sort((a, b) => a.percentage - b.percentage)[0];
  }, [attendance.data]);

  const arrearsCount = useMemo(() => {
    const subjects = performance.data?.semester_exam?.subjects ?? [];
    return subjects.filter((s) => !isPassingPercentage((s.scored / s.max) * 100)).length;
  }, [performance.data]);

  const overdueBooks = useMemo(() => {
    const rows = borrowedBooks.data ?? [];
    return rows.filter((r) => r.status === "borrowed" && r.due_date < today).sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [borrowedBooks.data, today]);

  const pendingLeaves = useMemo(() => leaves.data?.data.filter((l) => l.status === "pending") ?? [], [leaves.data]);
  const pendingOd = useMemo(
    () => odRequests.data?.data.filter((r) => r.overall_status === "pending_mentor" || r.overall_status === "pending_hod") ?? [],
    [odRequests.data],
  );
  const pendingBonafide = useMemo(() => bonafide.data?.data.filter((b) => b.status === "pending") ?? [], [bonafide.data]);

  const flags = useMemo<Flag[]>(() => {
    const list: Flag[] = [];
    if (worstAttendanceSubject) {
      const toRecover = classesToReachThreshold(worstAttendanceSubject.present, worstAttendanceSubject.total, ATTENDANCE_THRESHOLD_PERCENT);
      list.push({
        key: "attendance",
        shortLabel: "attendance",
        title: `${worstAttendanceSubject.subject_name} attendance at ${worstAttendanceSubject.percentage}%`,
        description: `Below the ${ATTENDANCE_THRESHOLD_PERCENT}% requirement · ${toRecover} class${toRecover === 1 ? "" : "es"} to recover`,
        href: "/parent/attendance",
      });
    }
    if (totalFeeDue > 0) {
      list.push({
        key: "fees",
        shortLabel: "fee balance",
        title: `₹${totalFeeDue.toLocaleString("en-IN")} fee outstanding`,
        description: `${pendingFeeHeads} fee head${pendingFeeHeads === 1 ? "" : "s"} pending this semester`,
        href: "/parent/fees",
      });
    }
    if (arrearsCount > 0) {
      list.push({
        key: "arrears",
        shortLabel: "arrears",
        title: `${arrearsCount} arrear${arrearsCount === 1 ? "" : "s"} in the latest semester exam`,
        description: "See the full subject-wise breakdown in Performance",
        href: "/parent/performance",
      });
    }
    if (pendingLeaves.length > 0) {
      list.push({
        key: "leave",
        shortLabel: "leave",
        title: `${pendingLeaves.length} leave request${pendingLeaves.length === 1 ? "" : "s"} awaiting approval`,
        description: pendingLeaves[0].reason ?? "No reason given",
        href: "/parent/leave",
      });
    }
    if (pendingOd.length > 0) {
      list.push({
        key: "od",
        shortLabel: "on duty",
        title: `${pendingOd.length} on-duty request${pendingOd.length === 1 ? "" : "s"} awaiting approval`,
        description: pendingOd[0].reason,
        href: "/parent/od",
      });
    }
    if (pendingBonafide.length > 0) {
      list.push({
        key: "bonafide",
        shortLabel: "bonafide",
        title: `${pendingBonafide.length} bonafide request${pendingBonafide.length === 1 ? "" : "s"} in progress`,
        description: pendingBonafide[0].reason_text,
        href: "/parent/bonafide",
      });
    }
    if (overdueBooks.length > 0) {
      list.push({
        key: "library",
        shortLabel: "library book",
        title: `${overdueBooks.length} library book${overdueBooks.length === 1 ? "" : "s"} overdue`,
        description: `Return "${overdueBooks[0].title}" · was due ${formatDisplayDate(overdueBooks[0].due_date)}`,
        href: "/parent/library",
      });
    }
    return list;
  }, [worstAttendanceSubject, totalFeeDue, pendingFeeHeads, arrearsCount, pendingLeaves, pendingOd, pendingBonafide, overdueBooks]);

  const nextDrive = drives.data?.[0];

  const upcomingExams = useMemo(() => {
    if (!examSchedule.data) return [];
    return examSchedule.data.filter((row) => row.exam_date >= today).sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  }, [examSchedule.data, today]);

  const nextExamGroup = useMemo(() => {
    if (upcomingExams.length === 0) return null;
    const nextType = upcomingExams[0].exam_type;
    const rows = upcomingExams.filter((e) => e.exam_type === nextType);
    const dates = rows.map((r) => r.exam_date).sort();
    const days = Math.round((new Date(dates.at(-1)!).getTime() - new Date(dates[0]).getTime()) / 86_400_000) + 1;
    return { examType: nextType, firstDate: dates[0], count: rows.length, days };
  }, [upcomingExams]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    if (pendingLms.pending.length > 0) {
      const task = pendingLms.pending[0];
      if (task.due_date) {
        items.push({
          date: task.due_date,
          title: `${task.title} due`,
          meta: `${task.subject_code} · assignment`,
          href: "/parent/lms",
        });
      }
    }
    if (nextExamGroup) {
      items.push({
        date: nextExamGroup.firstDate,
        title: `${nextExamGroup.examType} begins`,
        meta: `${nextExamGroup.count} paper${nextExamGroup.count === 1 ? "" : "s"} over ${nextExamGroup.days} day${nextExamGroup.days === 1 ? "" : "s"}`,
        href: "/parent/exam-schedule",
      });
    }
    if (nextDrive) {
      items.push({
        date: nextDrive.scheduled_date,
        title: `${nextDrive.company_name} placement drive`,
        meta: APPLICATION_STATUS_LABEL[nextDrive.application_status] ?? nextDrive.application_status,
        href: "/parent/placements",
      });
    }
    if (nextEvent) {
      items.push({
        date: nextEvent.event_date,
        title: nextEvent.title,
        meta: nextEvent.event_type === "holiday" ? "Holiday" : "Instruction day",
        href: "/parent/calendar",
      });
    }
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [pendingLms.pending, nextExamGroup, nextDrive, nextEvent]);

  if (!childrenLoading && children.length === 0) {
    return (
      <div className="animate-pop-in">
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Welcome</h1>
        <Card className="mt-4">
          <EmptyState message="No student is linked to this account yet — please contact the college office." />
        </Card>
      </div>
    );
  }

  const overall = attendance.data?.overall;
  const eligible = overall ? overall.percentage >= ATTENDANCE_THRESHOLD_PERCENT : undefined;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{greetingForHour()}</h1>
          {childrenLoading ? (
            <Skeleton className="mt-1.5 h-4 w-48" />
          ) : (
            <p className="mt-1 text-[13.5px] text-muted">
              {selectedChild
                ? `${selectedChild.name} · ${selectedChild.student_id_no}${
                    selectedChild.section
                      ? ` · ${selectedChild.department?.code ?? ""} · ${sectionLabel(selectedChild.semester, selectedChild.section)}`
                      : ""
                  }`
                : " "}
            </p>
          )}
        </div>
        <ChildSwitcher />
      </div>

      <div className="grid grid-cols-4 gap-3.5">
        <StatCard
          label="Attendance"
          icon="fact_check"
          value={overall ? `${overall.percentage}%` : "—"}
          sub={eligible !== undefined ? (eligible ? "Above threshold" : "Below threshold") : undefined}
          barPercent={overall?.percentage}
          thresholdPercent={ATTENDANCE_THRESHOLD_PERCENT}
          href="/parent/attendance"
          loading={attendance.isLoading}
        />
        <StatCard
          label="CGPA"
          icon="workspace_premium"
          value={cgpa.cgpa ?? "—"}
          sub={
            cgpa.previous && cgpa.latest
              ? `${cgpa.latest.gpa! >= cgpa.previous.gpa! ? "+" : ""}${Math.round((cgpa.latest.gpa! - cgpa.previous.gpa!) * 100) / 100} vs semester ${cgpa.previous.semester}`
              : cgpa.latest
                ? `Semester ${cgpa.latest.semester} result`
                : undefined
          }
          href="/parent/performance"
          loading={cgpa.isLoading}
        />
        <StatCard
          label="Fees due"
          icon="payments"
          value={`₹${totalFeeDue.toLocaleString("en-IN")}`}
          sub={totalFeeDue > 0 ? "outstanding" : "fully paid"}
          href="/parent/fees"
          loading={fees.isLoading}
        />
        <StatCard
          label="Today's classes"
          icon="calendar_view_week"
          value={todayDay === null ? "—" : (dayTimetable.data?.slots.length ?? "—")}
          sub={todayDay === null ? "No classes on Sunday" : undefined}
          href="/parent/timetable"
          loading={dayTimetable.isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Needs attention</h2>
            {flags.length > 0 && <Badge tone="accentDark">{flags.length} flags</Badge>}
          </div>
          {flags.length === 0 ? (
            <EmptyState message="Nothing needs attention right now." />
          ) : (
            <div className="flex flex-col gap-3">
              {flags.map((f) => (
                <Link key={f.key} href={f.href} className={cn("flex gap-2.5 rounded-[9px] p-1.5 -m-1.5", ROW_HOVER)}>
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-[13px] font-bold text-ink">{f.title}</div>
                    <div className="text-[11.5px] text-muted">{f.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-[15px] font-extrabold tracking-[-.02em] text-ink">Upcoming</h2>
          {timeline.length === 0 ? (
            <EmptyState message={pendingLms.isLoading || examSchedule.isLoading ? "Loading…" : "Nothing on the horizon."} />
          ) : (
            <div className="flex flex-col gap-3">
              {timeline.map((item, i) => (
                <Link key={i} href={item.href} className={cn("flex items-center gap-3 rounded-[9px] p-1.5 -m-1.5", ROW_HOVER)}>
                  <DateTile isoDate={item.date} />
                  <div>
                    <div className="text-[13px] font-bold text-ink">{item.title}</div>
                    <div className="text-[11.5px] text-muted">{item.meta}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Recent notices</h2>
          <Link href="/parent/announcements" className="text-[12.5px] font-bold text-primary">
            View all
          </Link>
        </div>
        {announcements.isLoading ? (
          <EmptyState message="Loading…" />
        ) : !announcements.data || announcements.data.length === 0 ? (
          <EmptyState message="No notices yet." />
        ) : (
          <div className="flex flex-col gap-3">
            {announcements.data.slice(0, 3).map((a) => (
              <Link key={a.id} href="/parent/announcements" className={cn("block rounded-[9px] p-1.5 -m-1.5", ROW_HOVER)}>
                <div className="text-[11px] text-subtle">{formatDayAndTime(a.created_at)}</div>
                <div className="text-[13px] font-bold text-ink">{a.title}</div>
                <p className="mt-0.5 truncate text-[12px] text-muted">{a.content}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
