"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { secretaryModuleConfig } from "./nav";
import { useMyIdentity } from "@/modules/student/api/profile";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";
import { usePurchaseRequests, useServiceRequests } from "./api/procurement";
import { useMediaRequests } from "./api/mediaRequests";
import { useVenueBookings } from "./api/venues";
import { useOutpasses } from "./api/outpass";
import { useDocuments } from "./api/documents";
import { useMyLeaves, useMyOds } from "./api/selfService";

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
// - The "New request" `+` icon-link was a single-purpose extra with no
//   shared Topbar equivalent — dropped, same call already made for
//   Principal's inert icons and Billing's help popover. The settings gear
//   WAS dropped for the same reason at the time, but this module's real,
//   backend-wired /secretary/settings page (attendance digest, escalation
//   alerts, etc.) now wires into the shared Topbar's opt-in `settingsHref`.
// - The hardcoded `department = "CSE"` literal is replaced with the real
//   department off GET /me/my-profile (useMyIdentity — the same generic
//   identity hook HoD/Principal shells already use), which also gives us a
//   real display name for the sidebar footer instead of nothing.
// - Sidebar badge counts are real, live pending counts (previously static
//   fake numbers copied from the design mockup with no backend behind
//   them) — same "shell fetches the live counts, nav.ts only names the
//   key" pattern every other migrated module's badgeKey already uses.
//   "Students" has no real "pending" concept anywhere in the schema, so it
//   gets no badge rather than a fabricated one.
export function SecretaryShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();

  const now = new Date();
  const academicYear = viewedAcademicYearLabel(now.getFullYear(), now.getMonth());
  const semesterParity = currentInstitutionSemesterParity(now);
  const department = identity.data?.department ?? "—";

  const { data: popRequests } = usePurchaseRequests();
  const { data: sopRequests } = useServiceRequests("pending");
  const { data: mediaRequests } = useMediaRequests("pending");
  const { data: venueBookings } = useVenueBookings("pending");
  const { data: outpasses } = useOutpasses("pending");
  const { data: documents } = useDocuments();
  const { data: myLeaves } = useMyLeaves();
  const { data: myOds } = useMyOds();

  const navBadges = useMemo(
    () => ({
      secretaryPop: popRequests
        ? popRequests.filter((r) => r.status === "pending_hod" || r.status === "pending_finance").length
        : undefined,
      secretarySop: sopRequests?.length,
      secretaryMedia: mediaRequests?.meta.total,
      secretaryVenue: venueBookings?.meta.total,
      secretaryOutpass: outpasses?.meta.total,
      secretaryDocs: documents?.data.filter((d) => d.status === "pending").length,
      secretaryEmpLeave: myLeaves?.filter((l) => l.overall_status === "pending").length,
      secretaryEmpOd: myOds?.filter((o) => o.overall_status === "pending").length,
    }),
    [popRequests, sopRequests, mediaRequests, venueBookings, outpasses, documents, myLeaves, myOds],
  );

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
        settingsHref: "/secretary/settings",
      }}
      navBadges={navBadges}
    >
      {children}
    </AppShell>
  );
}
