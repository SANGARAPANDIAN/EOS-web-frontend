"use client";

import { AppShell } from "@/components/layout/AppShell";
import { transportModuleConfig } from "@/modules/transport/nav";
import { TRANSPORT_MOCK_SUMMARY } from "@/modules/transport/summary";

// Design-only pass: header identity and nav badge counts are static mock
// values standing in for the real transport-officer profile + live fleet
// counts that will replace them once this module is wired to the backend.

export function TransportShell({ children }: { children: React.ReactNode }) {
  const { busesCount, routesCount, crewCount, maintenanceDueCount, complianceExpiringCount } = TRANSPORT_MOCK_SUMMARY;

  return (
    <AppShell
      moduleConfig={transportModuleConfig}
      header={{
        registerNumber: "Transport in-charge",
        programLabel: "Transport officer",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
        unreadNotifications: 1,
      }}
      navBadges={{
        fleetBuses: busesCount,
        fleetRoutes: routesCount,
        crewCount: crewCount,
        maintenanceDue: maintenanceDueCount,
        complianceExpiring: complianceExpiringCount,
      }}
    >
      {children}
    </AppShell>
  );
}
