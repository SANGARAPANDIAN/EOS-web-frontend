"use client";

import { AppShell } from "@/components/layout/AppShell";
import { higherEducationModuleConfig } from "@/modules/higher-education/nav";
import { HIGHER_EDUCATION_MOCK_SUMMARY } from "@/modules/higher-education/summary";

// Design-only pass: nav badge counts are static mock values standing in for
// live aspirant/application/scholarship counts that will replace them once
// this module is wired to the backend. Sidebar identity comes from the real
// logged-in session (Sidebar/SidebarUserFooter falls back to session email
// when studentName is omitted) — no fake coordinator name here.

export function HigherEducationShell({ children }: { children: React.ReactNode }) {
  const { aspirantsCount, applicationsCount, testsCount, universitiesCount, scholarshipsCount } =
    HIGHER_EDUCATION_MOCK_SUMMARY;

  return (
    <AppShell
      moduleConfig={higherEducationModuleConfig}
      header={{
        registerNumber: "Higher Education Cell",
        programLabel: "Higher Education Cell · Coordinator",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
        unreadNotifications: 1,
      }}
      navBadges={{
        heAspirants: aspirantsCount,
        heApplications: applicationsCount,
        heTests: testsCount,
        heUniversities: universitiesCount,
        heScholarships: scholarshipsCount,
      }}
    >
      {children}
    </AppShell>
  );
}
