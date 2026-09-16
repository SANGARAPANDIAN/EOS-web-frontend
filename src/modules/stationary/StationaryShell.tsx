"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { stationaryModuleConfig } from "./nav";
import { useStationaryStats } from "./api/requests";
import { useMachines } from "./api/operations";

export function StationaryShell({ children }: { children: React.ReactNode }) {
  const { data: stats } = useStationaryStats();
  const { data: machines } = useMachines();

  const machinesDown = machines?.filter((m) => m.status !== "working").length;

  const navBadges = useMemo(
    () => ({
      stationaryPendingRequests: stats?.pending_count || undefined,
      stationaryMachinesDown: machinesDown || undefined,
    }),
    [stats, machinesDown],
  );

  return (
    <AppShell
      moduleConfig={stationaryModuleConfig}
      programIcon="print"
      header={{
        programLabel: "Stationary · Print Shop",
        searchPlaceholder: "Search job ID, requester, document…",
        showNotifications: true,
      }}
      navBadges={navBadges}
    >
      {children}
    </AppShell>
  );
}
