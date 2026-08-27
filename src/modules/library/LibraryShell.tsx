"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import type { TopbarSearchResult } from "@/components/layout/Topbar";
import { libraryModuleConfig } from "@/modules/library/nav";
import { useDashboardSummary } from "@/modules/library/api/dashboard";

export function LibraryShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Live catalogue size, not a static number — a nav badge that disagreed
  // with the page it links to would erode trust in every other figure here.
  const dashboard = useDashboardSummary();

  const [query, setQuery] = useState("");

  // Doubles as a lightweight "jump to page" — filters the nav's flat item
  // list by label, entirely client-side, so there's no loading state.
  const results: TopbarSearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return libraryModuleConfig.navGroups
      .flatMap((group) => group.items)
      .filter((item) => item.label.toLowerCase().includes(q))
      .map((item) => ({
        section: "Page",
        title: item.label,
        sub: item.href,
        onSelect: () => router.push(item.href),
      }));
  }, [query, router]);

  return (
    <AppShell
      moduleConfig={libraryModuleConfig}
      programIcon="local_library"
      header={{
        programLabel: "Library · Institution",
        showNotifications: true,
      }}
      search={{
        placeholder: "Jump to a page — books, issue, reports…",
        query,
        onQueryChange: setQuery,
        results,
        isLoading: false,
      }}
      navBadges={{
        totalBooks: dashboard.data?.total_books,
      }}
    >
      {children}
    </AppShell>
  );
}
