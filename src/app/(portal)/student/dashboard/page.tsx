"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, StatCard, Button, Badge, EmptyState, Icon, DateTile, NavTile } from "@/components/ui";
import { useMyIdentity, useMyAcademicCalendar } from "@/modules/student/api/profile";
import { useMyAttendance } from "@/modules/student/api/attendance";
import { useMyCgpa } from "@/modules/student/api/examResults";
import { useMyFees } from "@/modules/student/api/fees";
import { useMyExamSchedule } from "@/modules/student/api/examSchedule";
import { useMyTimetableForDay } from "@/modules/student/api/timetable";
import { usePendingLmsTasks } from "@/modules/student/api/lms";
import { useUpcomingDrives } from "@/modules/student/api/placements";
import { useFeedbackForms } from "@/modules/student/api/feedback";
import { useMyBorrowRecords } from "@/modules/student/api/library";
import { useMyHostelRoom } from "@/modules/student/api/hostel";
import { useMyClearanceRequests } from "@/modules/student/api/hallTicketClearance";
import { useMyLeaves } from "@/modules/student/api/leave";
import { useMyOdRequests } from "@/modules/student/api/od";
import { useAnnouncements } from "@/modules/shared/api/announcements";
import { ATTENDANCE_THRESHOLD_PERCENT, APPLICATION_STATUS_LABEL, classesToReachThreshold } from "@/lib/config";
import {
  formatLongDate,
  formatRelativeTime,
  formatDisplayDate,
  greetingForHour,
  todayDateOnly,
  todayBackendDayOfWeek,
} from "@/lib/utils/date";

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

export default function StudentDashboardPage() {
  const identity = useMyIdentity();
  const academicCalendar = useMyAcademicCalendar();
  const today = todayDateOnly();
  const attendanceFrom = academicCalendar.data?.start_date ?? undefined;
  const attendance = useMyAttendance(attendanceFrom, attendanceFrom ? today : undefined);
  const cgpa = useMyCgpa(academicCalendar.data?.semester ?? null);
  const fees = useMyFees();
  const examSchedule = useMyExamSchedule();
  const todayDay = todayBackendDayOfWeek();
  const todayTimetable = useMyTimetableForDay(todayDay);
  const announcements = useAnnouncements();
  const pendingLms = usePendingLmsTasks();
  const upcomingDrives = useUpcomingDrives();
  const feedbackForms = useFeedbackForms();
  const borrowedBooks = useMyBorrowRecords("borrowed");
  const hostelRoom = useMyHostelRoom();
  const clearances = useMyClearanceRequests();
  const leaves = useMyLeaves();
  const odRequests = useMyOdRequests();

  const firstName = identity.data?.name?.split(" ")[0];

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

  const totalDue = useMemo(() => fees.data?.demands.reduce((sum, d) => sum + d.due, 0), [fees.data]);
  const totalFees = useMemo(() => fees.data?.demands.reduce((sum, d) => sum + d.total, 0), [fees.data]);
  const totalPaid = useMemo(() => fees.data?.demands.reduce((sum, d) => sum + d.paid, 0), [fees.data]);
  const pendingFeeHeads = useMemo(() => fees.data?.demands.filter((d) => d.due > 0).length ?? 0, [fees.data]);

  const upcomingSlots = useMemo(() => {
    if (!todayTimetable.data) return [];
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return todayTimetable.data.slots.filter((slot) => {
      const [h, m] = slot.end_time.split(":").map(Number);
      return h * 60 + m >= nowMinutes;
    });
  }, [todayTimetable.data]);
  const shownSlots = upcomingSlots.slice(0, 2);
  const periodsToday = todayTimetable.data?.slots.length ?? (todayDay === null ? 0 : undefined);

  const worstAttendanceSubject = useMemo(() => {
    const rows = attendance.data?.by_subject ?? [];
    const atRisk = rows.filter((s) => s.percentage < ATTENDANCE_THRESHOLD_PERCENT);
    if (atRisk.length === 0) return null;
    return atRisk.sort((a, b) => a.percentage - b.percentage)[0];
  }, [attendance.data]);

  const pendingFeedbackForms = useMemo(() => feedbackForms.data?.filter((f) => !f.completed) ?? [], [feedbackForms.data]);

  const overdueBooks = useMemo(() => {
    const rows = borrowedBooks.data ?? [];
    return rows.filter((r) => r.status === "borrowed" && r.due_date < today).sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [borrowedBooks.data, today]);

  const pendingClearances = useMemo(() => clearances.data?.data.filter((c) => c.effective_status === "pending") ?? [], [clearances.data]);
  const pendingLeaves = useMemo(() => leaves.data?.data.filter((l) => l.status === "pending") ?? [], [leaves.data]);
  const pendingOd = useMemo(
    () => odRequests.data?.data.filter((r) => r.overall_status === "pending_mentor" || r.overall_status === "pending_hod") ?? [],
    [odRequests.data],
  );

  const flags = useMemo<Flag[]>(() => {
    const list: Flag[] = [];
    if (worstAttendanceSubject) {
      const toRecover = classesToReachThreshold(worstAttendanceSubject.present, worstAttendanceSubject.total, ATTENDANCE_THRESHOLD_PERCENT);
      list.push({
        key: "attendance",
        shortLabel: "attendance",
        title: `${worstAttendanceSubject.subject_name} attendance at ${worstAttendanceSubject.percentage}%`,
        description: `Below the ${ATTENDANCE_THRESHOLD_PERCENT}% requirement · ${toRecover} class${toRecover === 1 ? "" : "es"} to recover`,
        href: "/student/attendance",
      });
    }
    if (totalDue !== undefined && totalDue > 0) {
      list.push({
        key: "fees",
        shortLabel: "fee balance",
        title: `₹${totalDue.toLocaleString("en-IN")} fee outstanding`,
        description: `${pendingFeeHeads} fee head${pendingFeeHeads === 1 ? "" : "s"} pending this semester`,
        href: "/student/fees",
      });
    }
    if (pendingFeedbackForms.length > 0) {
      list.push({
        key: "feedback",
        shortLabel: "course feedback",
        title: `${pendingFeedbackForms.length} course feedback form${pendingFeedbackForms.length === 1 ? "" : "s"} pending`,
        description: pendingFeedbackForms.map((f) => f.title).join(", "),
        href: "/student/feedback",
      });
    }
    if (overdueBooks.length > 0) {
      list.push({
        key: "library",
        shortLabel: "library book",
        title: `${overdueBooks.length} library book${overdueBooks.length === 1 ? "" : "s"} overdue`,
        description: `Return "${overdueBooks[0].title}" · was due ${formatDisplayDate(overdueBooks[0].due_date)}`,
        href: "/student/library",
      });
    }
    return list;
  }, [worstAttendanceSubject, totalDue, pendingFeeHeads, pendingFeedbackForms, overdueBooks]);

  const nextDrive = upcomingDrives.data?.[0];

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    if (pendingLms.pending.length > 0) {
      const task = pendingLms.pending[0];
      if (task.due_date) {
        items.push({
          date: task.due_date,
          title: `${task.title} due`,
          meta: `${task.subject_code} · LMS upload`,
          href: "/student/lms",
        });
      }
    }
    if (nextExamGroup) {
      items.push({
        date: nextExamGroup.firstDate,
        title: `${nextExamGroup.examType} begins`,
        meta: `${nextExamGroup.count} paper${nextExamGroup.count === 1 ? "" : "s"} over ${nextExamGroup.days} day${nextExamGroup.days === 1 ? "" : "s"}`,
        href: "/student/exam-schedule",
      });
    }
    if (nextDrive) {
      items.push({
        date: nextDrive.scheduled_date,
        title: `${nextDrive.company_name} placement drive`,
        meta: APPLICATION_STATUS_LABEL[nextDrive.application_status] ?? nextDrive.application_status,
        href: "/student/placements",
      });
    }
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [pendingLms.pending, nextExamGroup, nextDrive]);

  const daysUntilNextExam = upcomingExams[0]
    ? Math.round((new Date(upcomingExams[0].exam_date).getTime() - new Date(today).getTime()) / 86_400_000)
    : null;

  const openRequestsCount = pendingLeaves.length + pendingOd.length;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">
            {greetingForHour()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {formatLongDate()}
            {periodsToday !== undefined && (
              <> · {periodsToday === 0 ? "No classes today" : `${periodsToday} period${periodsToday === 1 ? "" : "s"} today`}</>
            )}
          </p>
        </div>
        {flags.length > 0 && (
          <div className="flex items-center gap-2 whitespace-nowrap rounded-pill border border-border-accent bg-accent-50 px-3.5 py-2 text-[12.5px] font-bold text-primary-dark">
            <Icon name="error" size={16} />
            {flags.length} item{flags.length === 1 ? "" : "s"} need you: {flags.map((f) => f.shortLabel).join(", ")}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Attendance"
          icon="fact_check"
          value={attendance.data ? `${attendance.data.overall.percentage}%` : "—"}
          sub={
            attendance.data
              ? `${attendance.data.overall.present}/${attendance.data.overall.total_days} days · ${
                  attendance.data.overall.percentage >= ATTENDANCE_THRESHOLD_PERCENT ? "+" : ""
                }${Math.round((attendance.data.overall.percentage - ATTENDANCE_THRESHOLD_PERCENT) * 10) / 10}% requirement`
              : undefined
          }
          barPercent={attendance.data?.overall.percentage}
          thresholdPercent={ATTENDANCE_THRESHOLD_PERCENT}
        />
        <StatCard
          label="CGPA"
          icon="workspace_premium"
          value={cgpa.cgpa ?? (cgpa.isLoading ? "—" : "N/A")}
          sub={
            cgpa.previous && cgpa.latest
              ? `${cgpa.latest.gpa! >= cgpa.previous.gpa! ? "+" : ""}${Math.round((cgpa.latest.gpa! - cgpa.previous.gpa!) * 100) / 100} vs semester ${cgpa.previous.semester}`
              : cgpa.latest
                ? `Semester ${cgpa.latest.semester} result`
                : undefined
          }
        />
        <StatCard
          label="Next placement drive"
          icon="work"
          value={
            <span className="text-[20px]">{nextDrive?.company_name ?? (upcomingDrives.isLoading ? "—" : "None scheduled")}</span>
          }
          sub={nextDrive ? `${formatDisplayDate(nextDrive.scheduled_date)} · ${APPLICATION_STATUS_LABEL[nextDrive.application_status] ?? nextDrive.application_status}` : undefined}
        />
        <StatCard
          label="Fee outstanding"
          icon="payments"
          value={totalDue !== undefined ? `₹${totalDue.toLocaleString("en-IN")}` : "—"}
          sub={totalDue !== undefined ? (totalDue > 0 ? `${pendingFeeHeads} head${pendingFeeHeads === 1 ? "" : "s"} pending` : "All paid up") : undefined}
        />
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-ink">Up next today</h2>
            <Link href="/student/timetable">
              <Button variant="text">Full timetable</Button>
            </Link>
          </div>
          {todayDay === null ? (
            <EmptyState message="No classes scheduled on Sunday." />
          ) : shownSlots.length === 0 ? (
            <EmptyState message={todayTimetable.isLoading ? "Loading…" : "No more periods left today."} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {shownSlots.map((slot) => (
                <div key={slot.period_number} className="flex items-center gap-3.5 rounded-[11px] border border-border-default px-3.5 py-3">
                  <div className="w-16 shrink-0 text-[14px] font-extrabold text-primary">{slot.start_time}</div>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{slot.subject.name}</div>
                    <div className="text-[12px] text-muted">
                      P{slot.period_number} · {slot.faculty.name}
                    </div>
                  </div>
                  <Badge tone="accent">Upcoming</Badge>
                </div>
              ))}
              {upcomingSlots.length > shownSlots.length && (
                <div className="text-[12px] text-subtle">
                  {upcomingSlots.length - shownSlots.length} more class{upcomingSlots.length - shownSlots.length === 1 ? "" : "es"} after this · day
                  ends {upcomingSlots.at(-1)!.end_time}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-ink">Announcements</h2>
            <Link href="/student/announcements">
              <Button variant="text">View all</Button>
            </Link>
          </div>
          {!announcements.data || announcements.data.length === 0 ? (
            <EmptyState message={announcements.isLoading ? "Loading…" : "No announcements yet."} />
          ) : (
            <div className="flex flex-col gap-3">
              {announcements.data.slice(0, 4).map((a) => (
                <div key={a.id} className="flex flex-col gap-1 border-b border-divider pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="accent">{a.target_audience.replace(/_/g, " ")}</Badge>
                    <span className="text-[11px] text-subtle">{formatRelativeTime(a.created_at)}</span>
                  </div>
                  <div className="text-[13.5px] font-bold text-ink">{a.title}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-[1.1fr_1.1fr_1fr] gap-4">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-ink">Needs attention</h2>
            {flags.length > 0 && <Badge tone="accentDark">{flags.length} flags</Badge>}
          </div>
          {flags.length === 0 ? (
            <EmptyState message="You're all caught up." />
          ) : (
            <div className="flex flex-col gap-3">
              {flags.map((f) => (
                <Link key={f.key} href={f.href} className="flex gap-2.5 hover:opacity-80">
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
          <h2 className="mb-3 text-[16px] font-extrabold text-ink">Upcoming</h2>
          {timeline.length === 0 ? (
            <EmptyState message={pendingLms.isLoading || examSchedule.isLoading ? "Loading…" : "Nothing on the horizon."} />
          ) : (
            <div className="flex flex-col gap-3">
              {timeline.map((item, i) => (
                <Link key={i} href={item.href} className="flex items-center gap-3 hover:opacity-80">
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

        <Card>
          <div className="text-[13px] font-bold text-body">Fee balance</div>
          <div className="mt-1.5 text-[26px] font-extrabold tracking-[-.03em] text-ink">
            {totalDue !== undefined ? `₹${totalDue.toLocaleString("en-IN")}` : "—"}
          </div>
          <div className="text-[12px] text-muted">
            {academicCalendar.data?.semester ? `Outstanding for Semester ${academicCalendar.data.semester}` : "Outstanding fees"}
          </div>
          {totalFees !== undefined && totalFees > 0 && (
            <div className="mt-3 h-[6px] overflow-hidden rounded-[4px] bg-surface-tint">
              <div className="h-full rounded-[4px] bg-primary" style={{ width: `${(100 * (totalPaid ?? 0)) / totalFees}%` }} />
            </div>
          )}
          {totalFees !== undefined && (
            <div className="mt-1.5 text-[11.5px] text-muted">
              ₹{(totalPaid ?? 0).toLocaleString("en-IN")} paid of ₹{totalFees.toLocaleString("en-IN")}
            </div>
          )}
          <Link href="/student/fees">
            <Button className="mt-4">Pay fees</Button>
          </Link>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-[16px] font-extrabold text-ink">My campus</h2>
          <span className="text-[12px] text-subtle">status today</span>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <NavTile
            icon="assignment"
            label="Assignments"
            value={pendingLms.isLoading ? "—" : pendingLms.pending.length}
            sub={pendingLms.pending[0]?.due_date ? `nearest ${formatDisplayDate(pendingLms.pending[0].due_date)}` : "All caught up"}
            href="/student/lms"
          />
          <NavTile
            icon="event_note"
            label="Exams"
            value={daysUntilNextExam !== null ? `${daysUntilNextExam} day${daysUntilNextExam === 1 ? "" : "s"}` : "—"}
            sub={nextExamGroup ? `${nextExamGroup.examType} from ${formatDisplayDate(nextExamGroup.firstDate)}` : "None scheduled"}
            href="/student/exam-schedule"
          />
          <NavTile
            icon="local_library"
            label="Library"
            value={borrowedBooks.isLoading ? "—" : (borrowedBooks.data?.length ?? 0)}
            sub={overdueBooks.length > 0 ? `${overdueBooks.length} overdue` : "On time"}
            href="/student/library"
          />
          <NavTile
            icon="apartment"
            label="Hostel"
            value={hostelRoom.isLoading ? "—" : hostelRoom.data?.is_hostel_resident ? hostelRoom.data.room_number ?? "—" : "Day scholar"}
            sub={hostelRoom.data?.is_hostel_resident ? hostelRoom.data.hostel_name : "Not a hostel resident"}
            href="/student/hostel"
          />
          <NavTile
            icon="task_alt"
            label="No due"
            value={clearances.isLoading ? "—" : pendingClearances.length}
            sub={pendingClearances.length > 0 ? "clearances pending" : "All clear"}
            href="/student/no-due"
          />
          <NavTile
            icon="inbox"
            label="Requests"
            value={leaves.isLoading || odRequests.isLoading ? "—" : openRequestsCount}
            sub={`${pendingLeaves.length} leave · ${pendingOd.length} OD`}
            href="/student/leave"
          />
        </div>
      </Card>
    </div>
  );
}
