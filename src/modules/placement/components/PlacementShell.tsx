"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { PlacementSidebar } from "./PlacementSidebar";
import { PlacementTopbar } from "./PlacementTopbar";

const ALLOWED_ROLES = new Set(["placement", "admin"]);
const COLLAPSE_STORAGE_KEY = "eos.placement.sidebar.collapsed";

export function PlacementShell({ children }: { children: React.ReactNode }) {
  const { session, status, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1",
  );

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const allowed = session != null && ALLOWED_ROLES.has(session.user.role);

  useEffect(() => {
    if (status === "loading") return; // not hydrated yet — do nothing
    if (session == null) {
      router.replace("/login");
      return;
    }
    if (!allowed) {
      router.replace("/");
    }
  }, [status, session, allowed, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (session == null || !allowed) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-surface">
      <PlacementTopbar userEmail={session.user.email} role={session.user.role} onLogout={logout} />
      <div className="flex min-h-0 flex-1">
        <PlacementSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        <main className="min-w-0 flex-1 overflow-y-auto px-[26px] pt-6 pb-12">{children}</main>
      </div>
    </div>
  );
}
