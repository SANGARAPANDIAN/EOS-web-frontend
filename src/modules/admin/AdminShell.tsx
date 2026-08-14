"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { AdminSidebar } from "@/modules/admin/components/AdminSidebar";
import { AdminTopbar } from "@/modules/admin/components/AdminTopbar";
import { useStudentCount } from "@/modules/admin/api/students";
import { useFacultyCount } from "@/modules/admin/api/faculty";

const COLLAPSE_STORAGE_KEY = "eos.admin.sidebar.collapsed";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1",
  );

  // Live roll count, not a static number — a nav badge that disagreed with
  // the page it links to would be the first thing to erode trust in every
  // other figure on this console.
  const studentCount = useStudentCount({});
  const facultyCount = useFacultyCount();

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (!session) return null;

  if (session.user.role !== "admin") {
    return <AccessDenied role={session.user.role} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-admin-tint font-sans text-admin-ink">
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        badges={{ studentCount: studentCount.data, facultyCount: facultyCount.data }}
        userEmail={session.user.email}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <AdminTopbar onOpenMobileNav={() => setMobileOpen(true)} />
        <div className="flex flex-1 flex-col gap-5 px-7 pt-[26px] pb-14">{children}</div>
      </main>
    </div>
  );
}
