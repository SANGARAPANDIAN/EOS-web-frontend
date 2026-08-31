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
  // Omits the department/course segment entirely while academicProfile is
  // still loading, rather than a "—" placeholder — course_id is a required
  // FK (see prisma/schema.prisma), so course_name is never actually empty
  // once loaded; showing a dash here only ever meant "still loading" and
  // read as a confusing, permanent-looking gap next to the semester number.
  // "Semester N" alone still keeps the pill's slot non-empty during that
  // brief window, so the topbar layout doesn't shift (same concern as
  // HodShell.tsx's roleDeptLabel, which keeps its own "—" fallback since
  // that one prefixes a fixed "HoD · " label instead of standing alone).
  const programLabel = [academicProfile.data?.course_name, semester ? `Semester ${semester}` : null]
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

  // "Hostel" / "In / out request" only make sense for an actual resident —
  // hidden for a day scholar rather than left pointing at a feature that
  // isn't theirs. Held back (not shown) until student_type has actually
  // loaded, so a hosteller never sees a one-frame flash of these items
  // disappearing.
  const isHosteller = academicProfile.data?.student_type === "hosteller";
  const moduleConfig = useMemo(
    () => ({
      ...studentModuleConfig,
      navGroups: studentModuleConfig.navGroups.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.hostellerOnly || isHosteller),
      })),
    }),
    [isHosteller],
  );

  return (
    <AppShell
      moduleConfig={moduleConfig}
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
