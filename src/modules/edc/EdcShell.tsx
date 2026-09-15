"use client";

import { AppShell } from "@/components/layout/AppShell";
import { edcModuleConfig } from "./nav";
import { useEdcAnnouncements } from "./api/announcements";
import { useEdcEntrepreneurship, isBeyondIdeaStage } from "./api/entrepreneurship";
import { useStartupIdeas } from "./api/startupIdeas";
import { useIncubations } from "./api/incubations";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";

// Composes the shared AppShell (components/layout/AppShell.tsx) instead of
// the old pixel-ported inline-style aside/header — same migration every
// other hand-rolled module shell (HoD/Principal/COE) already went through.
//
// The old bespoke notification bell (client-computed `alerts`: overdue
// incubation reviews, pending document verification, ideas under review,
// events within the next 7 days — none of it backed by the generic
// notifications table) has been relocated to the Dashboard page's "Needs
// attention" card as real page content instead of global chrome — see
// src/app/(portal)/edc/dashboard/page.tsx. showNotifications: true below
// gives EDC the shared Topbar's real generic bell, which it never had before.
export function EdcShell({ children }: { children: React.ReactNode }) {
  // Real counts for Announcements/EDC Students/Startups/Startup
  // Ideas/Incubation — Mentors/Funding still have no backend endpoint, so
  // those nav items get no badge at all (no count is better than a fake one).
  const announcements = useEdcAnnouncements();
  const entrepreneurship = useEdcEntrepreneurship();
  const ideas = useStartupIdeas();
  const incubations = useIncubations();

  const now = new Date();

  return (
    <AppShell
      moduleConfig={edcModuleConfig}
      programIcon="verified_user"
      header={{
        registerNumber: "EDC Coordinator",
        searchPlaceholder: "Search students, ventures, ideas…",
        programLabel: "EDC · Institution",
        academicYearLabel: viewedAcademicYearLabel(now.getFullYear(), now.getMonth()),
        semesterParityLabel: currentInstitutionSemesterParity(now),
        showNotifications: true,
      }}
      navBadges={{
        edcAnnouncements: announcements.data?.length,
        edcStudents: entrepreneurship.data?.length,
        edcStartups: entrepreneurship.data?.filter(isBeyondIdeaStage).length,
        edcIdeas: ideas.data?.length,
        edcIncubations: incubations.data?.length,
      }}
    >
      {children}
    </AppShell>
  );
}
