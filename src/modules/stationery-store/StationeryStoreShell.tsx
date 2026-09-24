"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { stationeryStoreModuleConfig } from "./nav";
import { useStationeryDashboard } from "./api/dashboard";

export function StationeryStoreShell({ children }: { children: React.ReactNode }) {
  const { data } = useStationeryDashboard();

  const navBadges = useMemo(
    () => ({
      stationeryLowStock: data?.low_stock_products.length || undefined,
      stationeryPendingOrders: data?.summary.pending_orders || undefined,
    }),
    [data],
  );

  return (
    <AppShell
      moduleConfig={stationeryStoreModuleConfig}
      programIcon="storefront"
      header={{
        programLabel: "Stationery Store · Admin",
        searchPlaceholder: "Search products, orders, students…",
        showNotifications: true,
      }}
      navBadges={navBadges}
    >
      {children}
    </AppShell>
  );
}
