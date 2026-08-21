"use client";

import { AppShell } from "@/components/layout/AppShell";
import { mediaRoomModuleConfig } from "@/modules/media-room/nav";
import { useMyIdentity } from "@/modules/media-room/api/identity";
import { useMediaRequests } from "@/modules/media-room/api/mediaRequests";
import { useAcademicCalendarEvents } from "@/modules/media-room/api/calendarEvents";

const COVERAGE_WORTHY = new Set(["event", "institution", "placement"]);

export function MediaRoomShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();
  const pending = useMediaRequests("pending", 1);
  const events = useAcademicCalendarEvents();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingCount = (events.data ?? []).filter(
    (e) => new Date(e.event_date) >= today && COVERAGE_WORTHY.has(e.event_type),
  ).length;

  return (
    <AppShell
      moduleConfig={mediaRoomModuleConfig}
      header={{
        studentName: identity.data?.name,
        registerNumber: "Media room",
        programLabel: "Media room head",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
      }}
      navBadges={{
        mrPendingRequests: pending.data && pending.data.meta.total > 0 ? pending.data.meta.total : undefined,
        mrUpcomingEvents: upcomingCount > 0 ? upcomingCount : undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
