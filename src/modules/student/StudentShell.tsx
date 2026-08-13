"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { studentModuleConfig } from "@/modules/student/nav";
import { useMyIdentity, useMyAcademicProfile, useMyAcademicCalendar } from "@/modules/student/api/profile";
import { useUnreadNotificationCount } from "@/modules/shared/api/notifications";
import { useAnnouncements } from "@/modules/shared/api/announcements";
import { useMyFees } from "@/modules/student/api/fees";
import { useFeedbackForms } from "@/modules/student/api/feedback";
import { formatCompactCurrency } from "@/lib/utils/format";
import { academicYearLabel } from "@/lib/utils/date";

const RECENT_ANNOUNCEMENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function StudentShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();
  const academicProfile = useMyAcademicProfile();
  const academicCalendar = useMyAcademicCalendar();
  const unread = useUnreadNotificationCount();
  const announcements = useAnnouncements();
  const fees = useMyFees();
  const feedbackForms = useFeedbackForms();

  const semester = academicCalendar.data?.semester ?? undefined;
  // Always a real string from first paint (never undefined while loading)
  // so the pill's slot in the topbar is never absent — conditionally
  // rendering it based on async data made the header's content shift
  // between page loads depending on fetch timing, which read as
  // "inconsistent alignment" (same fix as HodShell.tsx).
  const programLabel = [academicProfile.data?.course_name ?? "—", semester ? `Semester ${semester}` : null]
    .filter(Boolean)
    .join(" · ");

  // There's no per-user read-state for announcements anywhere in the schema
  // (unlike notifications, which has a real is_read column) and no new
  // table can be added to track one — so this isn't "unread", it's a
  // genuinely computed "posted in the last 3 days" count from real
  // created_at timestamps. Same honest-proxy reasoning as the Dashboard's
  // "Needs attention" flags: real signal, just not the exact semantic the
  // original mockup's badge implied.
  const recentAnnouncementsCount = useMemo(() => {
    if (!announcements.data) return 0;
    const cutoff = new Date().getTime() - RECENT_ANNOUNCEMENT_WINDOW_MS;
    return announcements.data.filter((a) => new Date(a.created_at).getTime() >= cutoff).length;
  }, [announcements.data]);

  const totalFeeDue = useMemo(() => fees.data?.demands.reduce((sum, d) => sum + d.due, 0) ?? 0, [fees.data]);
  const pendingFeedbackCount = useMemo(() => feedbackForms.data?.filter((f) => !f.completed).length ?? 0, [feedbackForms.data]);

  return (
    <AppShell
      moduleConfig={studentModuleConfig}
      header={{
        studentName: identity.data?.name,
        registerNumber: academicProfile.data?.register_no ?? undefined,
        programLabel,
        academicYearLabel: academicYearLabel(academicCalendar.data?.start_date ?? null, semester) ?? "—",
        semesterParityLabel:
          semester !== undefined ? (semester % 2 === 1 ? "Odd Semester" : "Even Semester") : "—",
        unreadNotifications: unread.data?.count,
      }}
      navBadges={{
        announcementsRecent: recentAnnouncementsCount > 0 ? recentAnnouncementsCount : undefined,
        feesDue: totalFeeDue > 0 ? formatCompactCurrency(totalFeeDue) : undefined,
        feedbackPending: pendingFeedbackCount > 0 ? pendingFeedbackCount : undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
