"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { FINANCE_NAV } from "./nav";
import { FinanceIcon } from "./icons";
import { useFinanceDashboard } from "./api/finance";
import { useFeeStudents, groupFeeStudents } from "./api/fees";
import { useAuth } from "@/lib/auth/AuthContext";
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

// Chrome matched to the Secretary portal, which is this platform's reference
// shell: 80px header, 48px controls on a 12px radius, #e5e9f2 hairlines, and
// the same collapse/notification/role-switch behaviour. Only the module's own
// content differs (Finance nav, Finance badges, the live fund balance) so the
// two portals read as one product.

export function FinanceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<"quick" | "bell" | "help" | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  // Longest-prefix wins: /finance/fees/students must highlight "Students",
  // not "Fees Overview" (/finance/fees), which also prefix-matches it.
  const activeId = FINANCE_NAV.flatMap((g) => g.items)
    .filter((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id;

  // Real sidebar badge counts, from the same dashboard endpoint the Dashboard
  // page uses — never hardcoded figures.
  const { data: dash } = useFinanceDashboard();
  // Students still owing, from the same real fee endpoint the Fees pages read.
  const { data: feeRows } = useFeeStudents();
  const feeOutstanding = groupFeeStudents(feeRows ?? []).filter((s) => s.outstanding_amount > 0).length;

  // Real derived context for the header. July-June academic year, and the odd
  // semester is July-December — no hardcoded term string anywhere.
  const now = new Date();
  const yearStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const derivedYear = `${yearStart}\u2013${String((yearStart + 1) % 100).padStart(2, "0")}`;
  const academicYearLabel = dash?.fund?.academic_year
    ? dash.fund.academic_year.replace("-", "\u2013")
    : derivedYear;
  const semesterLabel = now.getMonth() >= 6 ? "Odd Semester" : "Even Semester";

  const badgeValue = (key?: string) => {
    if (key === "popPending") return dash?.queues.pop_pending ?? 0;
    if (key === "sopPending") return dash?.queues.sop_pending ?? 0;
    if (key === "awaitingAllotment") return dash?.delivery.pending_allotment ?? 0;
    if (key === "feeOutstanding") return feeOutstanding;
    return 0;
  };

  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notifPanel } = useNotificationsPanel();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const pinNotif = usePinNotification();
  const unpinNotif = useUnpinNotification();

  const badgeSx = { marginLeft: "auto", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, fontWeight: 600, color: "#475569", background: "#f1f5f9", borderRadius: 6, padding: "2px 7px" } as const;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>
      <header style={{ height: 72, flex: "0 0 72px", display: "flex", alignItems: "center", gap: 18, padding: "0 22px", background: "#fff", borderBottom: "1px solid #e5e9f2", position: "relative", zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, width: 240, flex: "0 0 240px" }}>
          {/* The real college crest, the same /college-logo.png asset every
              other shell and the login page use — not a placeholder glyph. */}
          <Image
            src="/college-logo.png"
            alt="Sri Eshwar College of Engineering"
            width={38}
            height={38}
            priority
            style={{ width: 38, height: 38, objectFit: "contain", flex: "0 0 38px" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: -0.2 }}>Sri Eshwar</div>
            <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>College of Engineering</div>
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 580, position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 15, display: "flex", color: "#94a3b8" }}>
            <FinanceIcon name="search" size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search proposals, orders, vendors..."
            style={{ width: "100%", padding: "11px 74px 11px 42px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13.5, outline: "none", background: "#fff" }}
          />
          <span style={{ position: "absolute", right: 12, background: "#f1f5f9", border: "1px solid #e5e9f2", borderRadius: 6, padding: "3px 7px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#64748b" }}>Ctrl K</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <div data-fin-lift="" style={{ display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9", borderRadius: 9, padding: "9px 15px", fontSize: 13.5, fontWeight: 700, color: "#1e3a8a", whiteSpace: "nowrap" }}>
            <FinanceIcon name="shield" size={15} />
            Finance · Institution
          </div>
          {/* Academic year + semester, both derived from today's date (Indian
              academic year runs July-June; the odd semester is July-December).
              The year prefers the open fund's own academic_year when one
              exists, so the header agrees with the money it is reporting. */}
          <div data-fin-lift="" style={{ display: "flex", alignItems: "center", borderRadius: 9, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div style={{ padding: "9px 14px", fontSize: 13.5, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace", background: "#fff", color: "#334155", whiteSpace: "nowrap" }}>
              {academicYearLabel}
            </div>
            <div style={{ padding: "9px 15px", fontSize: 13.5, fontWeight: 700, background: "#152f6d", color: "#fff", whiteSpace: "nowrap" }}>
              {semesterLabel}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <button data-fin-lift="" onClick={() => setMenu((m) => (m === "quick" ? null : "quick"))} title="Quick actions" style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #e5e9f2", background: "#fff", color: "#334155", fontSize: 18, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            {menu === "quick" && (
              <div style={{ position: "absolute", top: 46, right: 0, width: 250, background: "#fff", border: "1px solid #e5e9f2", borderRadius: 14, boxShadow: "0 18px 40px rgba(15,23,42,.18)", padding: 8, zIndex: 60 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.08, color: "#64748b", padding: "8px 10px 6px" }}>QUICK ACTIONS</div>
                {[
                  { label: "Set / edit total amount", href: "/finance/overview" },
                  { label: "Review POP approvals", href: "/finance/pop-approval" },
                  { label: "Review SOP approvals", href: "/finance/sop-approval" },
                  { label: "Track POP deliveries", href: "/finance/pop-tracking" },
                  { label: "Fees overview", href: "/finance/fees" },
                  { label: "Student fee records", href: "/finance/fees/students" },
                  { label: "Post an announcement", href: "/finance/announcements" },
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
            <button data-fin-lift="" onClick={() => setMenu((m) => (m === "bell" ? null : "bell"))} title="Notifications" style={{ position: "relative", width: 38, height: 38, borderRadius: 10, border: "1px solid #e5e9f2", background: "#fff", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FinanceIcon name="bell" size={16} />
              {(unreadCount?.count ?? 0) > 0 && (
                <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: 999, background: "#1d4ed8", border: "1.5px solid #fff" }} />
              )}
            </button>
            {menu === "bell" && (
              <div style={{ position: "absolute", top: 46, right: 0, width: 360, maxHeight: 420, overflowY: "auto", background: "#fff", border: "1px solid #e5e9f2", borderRadius: 14, boxShadow: "0 18px 40px rgba(15,23,42,.18)", padding: 10, zIndex: 60 }} onClick={(e) => e.stopPropagation()}>
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
            <button data-fin-lift="" onClick={() => setMenu((m) => (m === "help" ? null : "help"))} title="Settings" style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #e5e9f2", background: "#fff", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FinanceIcon name="gear" size={16} />
            </button>
            {menu === "help" && (
              <div style={{ position: "absolute", top: 46, right: 0, width: 290, background: "#fff", border: "1px solid #e5e9f2", borderRadius: 14, boxShadow: "0 18px 40px rgba(15,23,42,.18)", padding: 14, zIndex: 60 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Finance desk help</div>
                <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.55 }}>
                  Approvals draw from the current year&apos;s fund and are recorded in an append-only ledger — an approval can never be posted twice, and the balance can never go below zero.
                </div>
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
          {FINANCE_NAV.map((g, gi) => (
            <div key={g.label}>
              {gi > 0 && !collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.09, color: "#94a3b8", padding: "18px 12px 6px" }}>{g.label.toUpperCase()}</div>}
              {g.items.map((it) => {
                const active = activeId === it.id;
                const count = badgeValue(it.badgeKey);
                return (
                  <Link key={it.id} href={it.href} style={{ textDecoration: "none" }}>
                    <div
                      data-fin-nav-item
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, fontSize: 13.5, fontWeight: active ? 700 : 500,
                        background: active ? "#eef4ff" : "transparent", color: active ? "#1d4ed8" : "#334155", cursor: "pointer", marginTop: 2,
                      }}
                    >
                      <FinanceIcon name={it.icon} size={16} />
                      {!collapsed && <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>}
                      {/* Only render a badge when there is genuinely something
                          waiting — a "0" chip is noise. */}
                      {!collapsed && it.badgeKey && count > 0 && <span style={badgeSx}>{count}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}

          <div
            style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 22, paddingTop: 14, borderTop: "1px solid #e5e9f2" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar name={session?.user.email || "Finance"} className="bg-[#152f6d]" />
            {!collapsed && (
              <>
                <div style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {session?.user.email ?? "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Finance</div>
                </div>
                <IconButton icon="logout" size={34} iconSize={17} title="Log out" onClick={() => setConfirmingLogout(true)} />
              </>
            )}
          </div>

          <ConfirmDialog
            open={confirmingLogout}
            title="Sign out?"
            description="You'll need to log in again to access the Finance portal."
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
