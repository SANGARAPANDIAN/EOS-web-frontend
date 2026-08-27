"use client";

import { AppShell } from "@/components/layout/AppShell";
import { secretaryModuleConfig } from "./nav";
import { useMyIdentity } from "@/modules/student/api/profile";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";

// Migrated off the fully inline-styled, hand-rolled shell (header + aside)
// onto the shared AppShell/Sidebar/Topbar used by every other role module.
//
// - Notifications: the old local NotificationPanel + useUnreadNotificationCount
//   wiring is gone — the shared Topbar now fetches its own live unread count
//   and renders the same NotificationPanel internally via showNotifications.
// - The year-cycle pill (`cycleYear()`) and click-to-flip semester toggle were
//   fake/manual state that never reflected real dates — replaced with real
//   computed values via viewedAcademicYearLabel/currentInstitutionSemesterParity
//   (same helpers CoeTopbar uses), matching every other migrated module.
// - The "New request" `+` icon-link and the settings gear had no shared
//   Topbar equivalent and were single-purpose extras — dropped, same call
//   already made for Principal's inert icons and Billing's help popover.
// - The hardcoded `department = "CSE"` literal is replaced with the real
//   department off GET /me/my-profile (useMyIdentity — the same generic
//   identity hook HoD/Principal shells already use), which also gives us a
//   real display name for the sidebar footer instead of nothing.
export function SecretaryShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();

  const now = new Date();
  const academicYear = viewedAcademicYearLabel(now.getFullYear(), now.getMonth());
  const semesterParity = currentInstitutionSemesterParity(now);
  const department = identity.data?.department ?? "—";

  return (
    <AppShell
      moduleConfig={secretaryModuleConfig}
      programIcon="shield"
      header={{
        studentName: identity.data?.name,
        registerNumber: `Department Secretary · ${department}`,
        searchPlaceholder: "Search students, requests, faculty, documents...",
        programLabel: `Secretary · ${department}`,
        academicYearLabel: academicYear,
        semesterParityLabel: semesterParity,
        showNotifications: true,
      }}
    >
      {children}
    </AppShell>
  );
}
