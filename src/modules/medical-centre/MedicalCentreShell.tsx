"use client";

import { AppShell } from "@/components/layout/AppShell";
import { medicalCentreModuleConfig } from "@/modules/medical-centre/nav";
import { useMedicalCentreDashboard } from "@/modules/medical-centre/api/dashboard";
import { currentInstitutionSemesterParity, viewedAcademicYearLabel } from "@/lib/utils/date";

// Nav badge counts come from the real dashboard endpoint
// (GET /me/medical-centre-dashboard), which reads medical_visits, sick_room_beds
// and pharmacy_stock. They were previously static mock values; nothing on this
// shell is hardcoded data any more.
//
// Sidebar identity comes from the real logged-in session (Sidebar/
// SidebarUserFooter falls back to the session email when studentName is
// omitted) — no fake medical-officer name here.

export function MedicalCentreShell({ children }: { children: React.ReactNode }) {
  // "today" is the range the badges describe — a waiting count is only
  // meaningful for right now.
  const dashboard = useMedicalCentreDashboard("today");
  const kpis = dashboard.data?.kpis;

  const now = new Date();

  return (
    <AppShell
      moduleConfig={medicalCentreModuleConfig}
      header={{
        registerNumber: "Medical Centre",
        programLabel: "Medical officer",
        // Derived from the current date rather than pinned to one hardcoded
        // academic year, so the header does not silently go stale.
        academicYearLabel: viewedAcademicYearLabel(now.getFullYear(), now.getMonth()),
        semesterParityLabel: currentInstitutionSemesterParity(now),
      }}
      // Badges are omitted (not zeroed) until the fetch resolves, so the
      // sidebar never flashes a confident "0 waiting" that is really "unknown".
      navBadges={
        kpis
          ? {
              mcOpdWaiting: kpis.opdWaiting,
              mcBedsOccupied: kpis.bedsOccupied,
              mcLowStock: kpis.lowStockCount,
            }
          : undefined
      }
    >
      {children}
    </AppShell>
  );
}
