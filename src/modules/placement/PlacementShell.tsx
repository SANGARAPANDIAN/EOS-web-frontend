"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { PlacementSidebar } from "@/modules/placement/components/PlacementSidebar";
import { PlacementTopbar } from "@/modules/placement/components/PlacementTopbar";
import { useEligibleStudents } from "@/modules/placement/api/students";
import { useCompanies } from "@/modules/placement/api/companies";
import { useDrives } from "@/modules/placement/api/drives";

const COLLAPSE_STORAGE_KEY = "eos.placement.sidebar.collapsed";

export function PlacementShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1",
  );

  // Live counts, not static numbers — nav badges that disagreed with the
  // pages they link to would erode trust in every other figure here.
  const students = useEligibleStudents();
  const companies = useCompanies({ page_size: 1 });
  const drives = useDrives();

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (!session) return null;

  if (session.user.role !== "placement") {
    return <AccessDenied role={session.user.role} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-admin-tint font-sans text-admin-ink">
      <PlacementSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        badges={{
          students: students.data?.length,
          companies: companies.data?.total,
          drives: drives.data?.length,
        }}
        userEmail={session.user.email}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <PlacementTopbar onOpenMobileNav={() => setMobileOpen(true)} />
        <div className="flex flex-1 flex-col gap-5 px-7 pt-[26px] pb-14">{children}</div>
      </main>
    </div>
  );
}
