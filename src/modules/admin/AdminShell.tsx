"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { AppShell } from "@/components/layout/AppShell";
import type { TopbarSearchResult } from "@/components/layout/Topbar";
import { adminModuleConfig } from "@/modules/admin/nav";
import { useStudentCount } from "@/modules/admin/api/students";
import { useFacultyCount } from "@/modules/admin/api/faculty";
import { usePendingServiceRequestCount } from "@/modules/admin/api/serviceRequests";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Live roll count, not a static number — a nav badge that disagreed with
  // the page it links to would be the first thing to erode trust in every
  // other figure on this console.
  const studentCount = useStudentCount({});
  const facultyCount = useFacultyCount();
  const pendingSopCount = usePendingServiceRequestCount();

  // "Jump to a page" search — filters the nav's flat item list by label,
  // same behavior AdminTopbar had, just rendered through the shared results
  // dropdown instead of a bare input that only reacted to Enter.
  const results: TopbarSearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return adminModuleConfig.navGroups
      .flatMap((group) => group.items)
      .filter((item) => item.label.toLowerCase().includes(q))
      .map((item) => ({
        section: "Page",
        title: item.label,
        sub: item.href,
        onSelect: () => router.push(item.href),
      }));
  }, [query, router]);

  if (!session) return null;

  if (session.user.role !== "admin") {
    return <AccessDenied role={session.user.role} />;
  }

  return (
    <AppShell
      moduleConfig={adminModuleConfig}
      programIcon="verified_user"
      header={{
        programLabel: "Admin · Institution",
        showNotifications: true,
      }}
      search={{
        placeholder: "Jump to a page — students, reports, admissions…",
        query,
        onQueryChange: setQuery,
        results,
        isLoading: false,
      }}
      navBadges={{
        studentCount: studentCount.data,
        facultyCount: facultyCount.data,
        adminSopPending: pendingSopCount.data,
      }}
    >
      {children}
    </AppShell>
  );
}
