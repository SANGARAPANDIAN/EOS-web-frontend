"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { sportsAdminModuleConfig } from "@/modules/sports-admin/nav";
import { useSportsAdminIdentity, useSportsAdminNavCounts } from "@/modules/sports-admin/api/me";
import { useSportsSearch } from "@/modules/sports-admin/api/search";
import { useUnreadNotificationCount } from "@/modules/shared/api/notifications";
import { currentInstitutionSemesterParity, viewedAcademicYearLabel } from "@/lib/utils/date";

const QUICK_CREATE_ITEMS = [
  { label: "Add athlete", route: "/sports-admin/athletes" },
  { label: "Create squad", route: "/sports-admin/teams" },
  { label: "New announcement", route: "/sports-admin/announcements" },
  { label: "Add calendar event", route: "/sports-admin/calendar" },
  { label: "Log incident", route: "/sports-admin/injuries" },
];

export function SportsAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const identity = useSportsAdminIdentity();
  const navCounts = useSportsAdminNavCounts();
  const unread = useUnreadNotificationCount();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useSportsSearch(debouncedQuery);

  const searchResults = useMemo(
    () =>
      (search.data ?? []).map((r) => ({
        section: r.section,
        title: r.title,
        sub: r.sub,
        onSelect: () => {
          router.push(r.route);
          setQuery("");
        },
      })),
    [search.data, router],
  );

  const today = useMemo(() => new Date(), []);

  return (
    <AppShell
      moduleConfig={sportsAdminModuleConfig}
      header={{
        studentName: identity.data?.name,
        registerNumber: identity.data?.designation ?? undefined,
        programLabel: "Sports admin · Institution",
        academicYearLabel: viewedAcademicYearLabel(today.getFullYear(), today.getMonth()),
        semesterParityLabel: currentInstitutionSemesterParity(today),
        unreadNotifications: unread.data?.count,
      }}
      search={{
        placeholder: "Search athletes, teams, fixtures, equipment...",
        query,
        onQueryChange: setQuery,
        results: searchResults,
        isLoading: search.isFetching,
      }}
      navBadges={{
        sportsAthletes: navCounts.data?.athletes,
        sportsTeams: navCounts.data?.teams,
        sportsTrialsPending: navCounts.data?.trials_pending,
        sportsOdPending: navCounts.data?.od_pending,
        sportsDisciplines: navCounts.data?.disciplines,
        sportsAchievements: navCounts.data?.achievements,
      }}
      quickCreate={{
        items: QUICK_CREATE_ITEMS.map((item) => ({
          label: item.label,
          onSelect: () => router.push(item.route),
        })),
      }}
      programIcon="shield"
    >
      {children}
    </AppShell>
  );
}
