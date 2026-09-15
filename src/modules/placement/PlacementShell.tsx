"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import type { TopbarSearchResult } from "@/components/layout/Topbar";
import { placementModuleConfig } from "@/modules/placement/nav";
import { useEligibleStudents } from "@/modules/placement/api/students";
import { useCompanies } from "@/modules/placement/api/companies";
import { useDrives } from "@/modules/placement/api/drives";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

export function PlacementShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const active = debouncedQuery.length >= 2;

  // Live counts, not static numbers — nav badges that disagreed with the
  // pages they link to would erode trust in every other figure here. Also
  // doubles as the federated search source below (students/drives are
  // filtered client-side out of the same full lists; companies are
  // searched server-side).
  const students = useEligibleStudents();
  const drives = useDrives();
  const companies = useCompanies({ q: active ? debouncedQuery : undefined, page_size: 6 });

  const results: TopbarSearchResult[] = useMemo(() => {
    if (!active) return [];
    const needle = debouncedQuery.toLowerCase();

    const studentResults: TopbarSearchResult[] = (students.data ?? [])
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(needle) ||
          s.studentIdNo.toLowerCase().includes(needle) ||
          s.rollNo?.toLowerCase().includes(needle),
      )
      .slice(0, 6)
      .map((s) => ({
        section: "Student",
        title: s.name ?? s.studentIdNo,
        sub: [s.studentIdNo, s.departmentName].filter(Boolean).join(" · "),
        onSelect: () => router.push(`/placement/students/${s.id}`),
      }));

    const companyResults: TopbarSearchResult[] = (companies.data?.data ?? []).slice(0, 6).map((c) => ({
      section: "Company",
      title: c.name,
      sub: c.profileInfo || [c.industry, c.location].filter(Boolean).join(" · ") || "",
      onSelect: () => router.push("/placement/companies"),
    }));

    const driveResults: TopbarSearchResult[] = (drives.data ?? [])
      .filter((d) => d.companyName.toLowerCase().includes(needle) || d.role?.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((d) => ({
        section: "Drive",
        title: [d.companyName, d.role].filter(Boolean).join(" · "),
        sub: d.scheduledDate,
        onSelect: () => router.push(`/placement/drives/${d.id}`),
      }));

    return [...studentResults, ...companyResults, ...driveResults];
  }, [active, debouncedQuery, students.data, companies.data, drives.data, router]);

  return (
    <AppShell
      moduleConfig={placementModuleConfig}
      programIcon="business_center"
      header={{
        programLabel: "Placement Cell",
        showNotifications: true,
      }}
      search={{
        placeholder: "Search students, companies, drives",
        query,
        onQueryChange: setQuery,
        results,
        isLoading: students.isLoading || drives.isLoading || companies.isFetching,
      }}
      quickCreate={{
        items: [{ label: "New drive", onSelect: () => router.push("/placement/drives/new") }],
      }}
      navBadges={{
        placementStudents: students.data?.length,
        placementCompanies: companies.data?.total,
        placementDrives: drives.data?.length,
      }}
    >
      {children}
    </AppShell>
  );
}
