"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import type { TopbarSearchResult } from "@/components/layout/Topbar";
import { principalModuleConfig } from "@/modules/principal/nav";
import { useMyIdentity } from "@/modules/principal/api/profile";
import { usePrincipalDashboardSummary } from "@/modules/principal/api/dashboard";
import { useUniversalSearch } from "@/modules/principal/api/search";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

export function PrincipalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const identity = useMyIdentity();
  const summary = usePrincipalDashboardSummary();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const search = useUniversalSearch(debouncedQuery.length >= 2 ? debouncedQuery : "");

  const results: TopbarSearchResult[] = useMemo(() => {
    const data = search.data;
    if (!data) return [];
    return [
      ...data.students.map((s) => ({
        section: "Student",
        title: s.name,
        sub: [s.register_no, s.department_code].filter(Boolean).join(" · "),
        onSelect: () => router.push(`/principal/students?q=${encodeURIComponent(s.register_no ?? s.name)}`),
      })),
      ...data.faculty.map((f) => ({
        section: "Faculty",
        title: f.name,
        sub: [f.designation, f.department_code].filter(Boolean).join(" · "),
        onSelect: () => router.push(`/principal/faculty?q=${encodeURIComponent(f.name)}`),
      })),
      ...data.departments.map((d) => ({
        section: "Department",
        title: d.name,
        sub: d.code,
        onSelect: () => router.push(`/principal/departments?id=${d.id}`),
      })),
      ...data.approvals.map((a) => ({
        section: "Approval",
        title: `${a.faculty_name} · ${a.summary}`,
        sub: `${a.kind.toUpperCase()} · ${a.status}`,
        onSelect: () => router.push(`/principal/approvals?q=${encodeURIComponent(a.faculty_name)}`),
      })),
      ...data.announcements.map((a) => ({
        section: "Announcement",
        title: a.title,
        sub: "Announcement",
        onSelect: () => router.push("/principal/announcements"),
      })),
    ];
  }, [search.data, router]);

  return (
    <AppShell
      moduleConfig={principalModuleConfig}
      programIcon="verified_user"
      header={{
        studentName: identity.data?.name,
        registerNumber: identity.data?.designation ?? "Principal",
        programLabel: "Principal · Institution",
        // No academic-calendar data is wired into the Principal module yet —
        // omitting the AY/semester pill is more honest than showing an
        // unbacked value (same reasoning the old PrincipalTopbar documented).
        showNotifications: true,
      }}
      search={{
        placeholder: "Search students, faculty, departments, approvals, announcements…",
        query,
        onQueryChange: setQuery,
        results,
        isLoading: search.isLoading,
      }}
      // Ported from the old bespoke PrincipalTopbar's "+" quick-actions
      // dropdown (real, working links — not a fabricated addition) onto the
      // shared Topbar's quickCreate slot, so the action survives the switch
      // to AppShell instead of being silently dropped.
      quickCreate={{
        items: [
          { label: "Add event", onSelect: () => router.push("/principal/calendar?action=add-event") },
          { label: "New announcement", onSelect: () => router.push("/principal/announcements?action=new") },
        ],
      }}
      navBadges={{
        principalStudentsTotal: summary.data?.students.total_active,
        principalFacultyTotal: summary.data?.faculty.total_active,
      }}
    >
      {children}
    </AppShell>
  );
}
