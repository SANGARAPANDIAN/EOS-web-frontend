"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BILLING_NAV } from "./nav";
import { BillingIcon } from "./icons";
import { useFeePaymentsDashboard, groupDashboardByStudent, useFinanceOverview } from "./api/fees";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMyRoles } from "@/lib/auth/roles";
import { getModuleConfig } from "@/modules/registry";
import { ROLE_LABEL } from "@/lib/config";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useUnreadNotificationCount,
  useNotificationsPanel,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  usePinNotification,
  useUnpinNotification,
} from "@/modules/shared/api/notifications";

// Pixel-exact port of the shell (header + aside) from
// "Billing Module - Web/Billing Admin.dc.html" (lines 27-187). Fake-data
// skeleton pass — pixel-exact frontend first, real EOSbackend1 wiring is a
// later pass, same process used for the Secretary/EDC modules.

// Real alert entries, computed from live data available in this component
// (unsettledConcessions/pendingDD) rather than a hardcoded fake list —
// Refunds and Reconciliation were removed from this module entirely, so
// no alert can reference either any more.

export function BillingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, switchRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<"quick" | "bell" | "help" | null>(null);
  const [switching, setSwitching] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const rolesRef = useRef<HTMLDivElement>(null);

  const roles = useMyRoles();
  const otherRoles = (roles.data ?? []).filter((r) => r.name !== session?.user.role);

  useEffect(() => {
    if (!rolesOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (rolesRef.current && !rolesRef.current.contains(e.target as Node)) setRolesOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [rolesOpen]);

  async function handleSwitchRole(roleId: number) {
    setSwitching(true);
    try {
      const newSession = await switchRole(roleId);
      setRolesOpen(false);
      const target = getModuleConfig(newSession.user.role);
      router.push(target ? `${target.basePath}/dashboard` : "/login");
    } finally {
      setSwitching(false);
    }
  }

  const activeId = BILLING_NAV.flatMap((g) => g.items).find((item) => pathname?.startsWith(item.href))?.id;

  // Real sidebar badge counts — was a hardcoded "1,240"/"8"/"3" before.
  const { data: dashboardRows } = useFeePaymentsDashboard();
  const studentCount = groupDashboardByStudent(dashboardRows ?? []).length;
  const { data: overview } = useFinanceOverview();
  const unsettledConcessions = overview?.operationalInsights.concessionSummary.unsettled_count ?? 0;
  const pendingDD = overview?.executiveKPIs.pendingEducationLoanDD ?? 0;

  // Real, centralized notification system (same backend every other portal
  // in this platform uses — /me/notifications/*) rather than a billing-only
  // ad-hoc list. Supports real mark-read, mark-all-read, pin/unpin.
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notifPanel } = useNotificationsPanel();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const pinNotif = usePinNotification();
  const unpinNotif = useUnpinNotification();


  const badgeSx = { marginLeft: "auto", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, fontWeight: 600, color: "#475569", background: "#f1f5f9", borderRadius: 6, padding: "2px 7px" } as const;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>
      <header style={{ height: 72, flex: "0 0 72px", display: "flex", alignItems: "center", gap: 18, padding: "0 22px", background: "#fff", borderBottom: "1px solid #e6e9ef", position: "relative", zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, width: 240, flex: "0 0 240px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: "#0f2d6b", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800 }}>♛</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: -0.2 }}>Sri Eshwar</div>
            <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>College of Engineering</div>
          </div>
        </div>
        <button onClick={() => setCollapsed((v) => !v)} title="Collapse navigation" style={{ width: 38, height: 38, flex: "0 0 38px", borderRadius: 10, border: "1px solid #e6e9ef", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}>
          <BillingIcon name="menu" size={17} />
        </button>
        <div style={{ flex: 1, maxWidth: 580, position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 15, display: "flex", color: "#94a3b8" }}>
            <BillingIcon name="search" size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, receipts, structures..."
            style={{ width: "100%", padding: "11px 74px 11px 42px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13.5, outline: "none", background: "#fff" }}
          />
          <span style={{ position: "absolute", right: 12, background: "#f1f5f9", border: "1px solid #e6e9ef", borderRadius: 6, padding: "3px 7px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#64748b" }}>Ctrl K</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9", borderRadius: 9, padding: "9px 15px", fontSize: 13.5, fontWeight: 700, color: "#1e3a8a" }}>
            <BillingIcon name="shield" size={15} />
            Billing · Institution
          </div>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 9, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div style={{ padding: "9px 14px", fontSize: 13.5, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace", background: "#fff" }}>2026–27</div>
            <div style={{ padding: "9px 15px", fontSize: 13.5, fontWeight: 700, background: "#152f6d", color: "#fff" }}>Odd Semester</div>
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenu((m) => (m === "quick" ? null : "quick"))} title="Quick actions" style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #e6e9ef", background: "#fff", color: "#334155", fontSize: 18, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            {menu === "quick" && (
              <div style={{ position: "absolute", top: 46, right: 0, width: 240, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 18px 40px rgba(15,23,42,.18)", padding: 8, zIndex: 60 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.08, color: "#64748b", padding: "8px 10px 6px" }}>QUICK ACTIONS</div>
                {[
                  { label: "Receive a payment", href: "/billing/students" },
                  { label: "Add fee structure", href: "/billing/structures" },
                  { label: "Add quota", href: "/billing/quota" },
                  { label: "Add education loan DD", href: "/billing/students" },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => { setMenu(null); router.push(a.href); }}
                    style={{ width: "100%", textAlign: "left", padding: "9px 10px", border: 0, background: "transparent", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer", color: "#0f172a" }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenu((m) => (m === "bell" ? null : "bell"))} title="Notifications" style={{ position: "relative", width: 38, height: 38, borderRadius: 10, border: "1px solid #e6e9ef", background: "#fff", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BillingIcon name="bell" size={16} />
              {(unreadCount?.count ?? 0) > 0 && (
                <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: 999, background: "#1d4ed8", border: "1.5px solid #fff" }} />
              )}
            </button>
            {menu === "bell" && (
              <div style={{ position: "absolute", top: 46, right: 0, width: 360, maxHeight: 420, overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 18px 40px rgba(15,23,42,.18)", padding: 10, zIndex: 60 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px 8px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.08, color: "#64748b" }}>NOTIFICATIONS</div>
                  {(notifPanel ?? []).some((n) => !n.is_read) && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      disabled={markAllRead.isPending}
                      style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {(notifPanel ?? []).length === 0 && (
                  <div style={{ padding: "9px 8px", fontSize: 12.5, color: "#94a3b8" }}>No notifications right now.</div>
                )}
                {(notifPanel ?? []).map((n) => (
                  <div key={n.id} style={{ display: "flex", gap: 10, padding: "9px 8px", borderRadius: 8, background: n.is_read ? "transparent" : "#f8faff" }}>
                    <div style={{ width: 6, height: 6, borderRadius: 999, background: n.is_read ? "#cbd5e1" : "#1d4ed8", marginTop: 6, flex: "0 0 6px" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{n.title}</div>
                      <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{n.message}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                        {!n.is_read && (
                          <button onClick={() => markRead.mutate(n.id)} style={{ background: "transparent", border: 0, color: "#1d4ed8", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Mark read</button>
                        )}
                        <button
                          onClick={() => (n.is_pinned ? unpinNotif.mutate(n.id) : pinNotif.mutate(n.id))}
                          style={{ background: "transparent", border: 0, color: n.is_pinned ? "#b45309" : "#64748b", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
                        >
                          {n.is_pinned ? "Unpin" : "Pin"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenu((m) => (m === "help" ? null : "help"))} title="Settings" style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #e6e9ef", background: "#fff", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BillingIcon name="gear" size={16} />
            </button>
            {menu === "help" && (
              <div style={{ position: "absolute", top: 46, right: 0, width: 270, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 18px 40px rgba(15,23,42,.18)", padding: 14, zIndex: 60 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Billing desk help</div>
                <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.55 }}>Counter hours 09:00–16:30. Reconciliation cut-off is 17:00 daily. For gateway disputes raise a ticket with the receipt number.</div>
                <div style={{ fontSize: 12.5, marginTop: 10, fontWeight: 600 }}>Finance office · extn 214</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }} onClick={() => setMenu(null)}>
        <aside style={{ width: collapsed ? 68 : 240, flex: "0 0 auto", background: "#fff", borderRight: "1px solid #eef1f6", padding: "10px 10px", overflowY: "auto", transition: "width .15s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 6px" }}>
            {!collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.09, color: "#94a3b8" }}>OVERVIEW</div>}
            <button onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }} title="Collapse navigation" style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>«</button>
          </div>
          {BILLING_NAV.map((g, gi) => (
            <div key={g.label}>
              {gi > 0 && !collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.09, color: "#94a3b8", padding: "18px 12px 6px" }}>{g.label.toUpperCase()}</div>}
              {g.items.map((it) => {
                const active = activeId === it.id;
                return (
                  <Link key={it.id} href={it.href} style={{ textDecoration: "none" }}>
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, fontWeight: active ? 700 : 500,
                        background: active ? "#eef3ff" : "transparent", color: active ? "#1d4ed8" : "#334155", cursor: "pointer", marginTop: 2,
                      }}
                    >
                      <BillingIcon name={it.icon} size={16} />
                      {!collapsed && <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>}
                      {!collapsed && it.badgeKey && <span style={badgeSx}>{it.badgeKey === "students" ? studentCount.toLocaleString("en-IN") : it.badgeKey === "concessions" ? unsettledConcessions : pendingDD}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}

          <div
            style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 22, paddingTop: 14, borderTop: "1px solid #eef1f6" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar name={session?.user.email || "Billing"} className="bg-[#152f6d]" />
            {!collapsed && (
              <>
                <div style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {session?.user.email ?? "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Billing</div>
                </div>
                {otherRoles.length > 0 && (
                  <div ref={rolesRef} className="relative">
                    <IconButton icon="swap_horiz" size={34} iconSize={17} title="Switch role" onClick={() => setRolesOpen((v) => !v)} />
                    {rolesOpen && (
                      <div className="absolute bottom-[calc(100%+6px)] right-0 z-30 min-w-[210px] overflow-hidden rounded-card border border-border-default bg-surface py-1.5 shadow-modal">
                        <div className="px-4 pb-1 pt-1.5 text-[10.5px] font-extrabold tracking-[.09em] text-subtle">SWITCH ROLE</div>
                        {otherRoles.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            disabled={switching}
                            onClick={() => handleSwitchRole(r.id)}
                            className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-nav-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {ROLE_LABEL[r.name] ?? r.description ?? r.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <IconButton icon="logout" size={34} iconSize={17} title="Log out" onClick={() => setConfirmingLogout(true)} />
              </>
            )}
          </div>

          <ConfirmDialog
            open={confirmingLogout}
            title="Sign out?"
            description="You'll need to log in again to access the Billing portal."
            confirmLabel="Sign out"
            cancelLabel="Cancel"
            destructive
            onConfirm={logout}
            onCancel={() => setConfirmingLogout(false)}
          />
        </aside>

        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "26px 32px 60px" }} onClick={(e) => e.stopPropagation()}>
          {children}
        </main>
      </div>
    </div>
  );
}
