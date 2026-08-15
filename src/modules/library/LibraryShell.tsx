"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { LibrarySidebar } from "@/modules/library/components/LibrarySidebar";
import { LibraryTopbar } from "@/modules/library/components/LibraryTopbar";
import { useDashboardSummary } from "@/modules/library/api/dashboard";

const COLLAPSE_STORAGE_KEY = "eos.library.sidebar.collapsed";

export function LibraryShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1",
  );

  // Live catalogue size, not a static number — a nav badge that disagreed
  // with the page it links to would erode trust in every other figure here.
  const dashboard = useDashboardSummary();

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (!session) return null;

  if (session.user.role !== "library") {
    return <AccessDenied role={session.user.role} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-admin-tint font-sans text-admin-ink">
      <LibrarySidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        badges={{ totalBooks: dashboard.data?.total_books }}
        userEmail={session.user.email}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <LibraryTopbar onOpenMobileNav={() => setMobileOpen(true)} />
        <div className="flex flex-1 flex-col gap-5 px-7 pt-[26px] pb-14">{children}</div>
      </main>
    </div>
  );
}
