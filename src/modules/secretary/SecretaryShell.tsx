"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SECRETARY_NAV } from "./nav";
import { SecretaryIcon } from "./icons";
import { initialsOf } from "./helpers";

// Pixel-exact port of the shell (header + aside) from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 27-108. Every
// color/size/spacing value below is copied directly from that file's
// inline styles. Skeleton pass — real EOSbackend1 wiring (badge counts,
// notifications, search) is a later pass, same process as the EDC module.
//
// Icons are hand-drawn stroke SVGs (see icons.tsx's `SecretaryIcon`, ported
// from the design's own `ic()` method) — NOT a ligature font, unlike EDC's
// Material Symbols Outlined.

// Ported verbatim from source's `topFlags` notification list (line 3150-3153)
// — each row's onClick navigates to its related screen (this.go(...)).
const NOTIFICATIONS = [
  { title: "3 SOP requests awaiting a decision", meta: "Oldest raised 8 days ago", href: "/secretary/sop" },
  { title: "Attendance not saved for III-B · Hour 1", meta: "Register locks at 4.15 pm", href: "/secretary/attendance" },
  { title: "2 media requests unconfirmed", meta: "Alumni panel post · publish by 20 Aug", href: "/secretary/media" },
  { title: "3 documents unverified", meta: "Course file window closes 20 Aug", href: "/secretary/docs" },
];

export function SecretaryShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("2026-27");
  const [semester, setSemester] = useState<"Odd Semester" | "Even Semester">("Odd Semester");

  const department = "CSE";
  const secretaryName = "Ms. R. Kavitha";
  const initials = initialsOf(secretaryName);

  const activeId = SECRETARY_NAV.flatMap((g) => g.items).find((item) => pathname?.startsWith(item.href))?.id;

  function cycleYear() {
    const ys = ["2024-25", "2025-26", "2026-27"];
    setYear((y) => ys[(ys.indexOf(y) + 1) % ys.length]);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff" }}>
      <header style={{ height: 80, flex: "0 0 80px", background: "#ffffff", borderBottom: "1px solid #e5e9f2", display: "flex", alignItems: "center", gap: 20, padding: "0 28px", position: "sticky", top: 0, zIndex: 40, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, width: 292, flex: "0 1 auto", minWidth: 168, overflow: "hidden" }}>
          <div style={{ width: 40, height: 44, borderRadius: "6px 6px 20px 20px", background: "#1e3a8a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.2, fontWeight: 700, letterSpacing: 0.5 }}>SE</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: -0.2 }}>Sri Eshwar</div>
            <div style={{ fontSize: 11.8, color: "#64748b", fontWeight: 500 }}>College of Engineering</div>
          </div>
        </div>
        <div
          data-sec-lift=""
          onClick={() => setCollapsed((v) => !v)}
          title="Toggle navigation"
          style={{ width: 48, height: 48, flex: "0 0 auto", borderRadius: 12, border: "1px solid #e5e9f2", background: "#ffffff", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <SecretaryIcon name="menu" size={20} />
        </div>
        <div style={{ flex: "1 1 220px", minWidth: 220, maxWidth: 660, position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 16, display: "flex", color: "#94a3b8" }}>
            <SecretaryIcon name="search" size={17} />
          </span>
          <input
            data-sec-lift=""
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students, requests, faculty, documents..."
            style={{ width: "100%", minWidth: 0, textOverflow: "ellipsis", height: 48, border: "1px solid #e5e9f2", borderRadius: 12, padding: "0 78px 0 46px", fontSize: 13.1, color: "#0f172a", background: "#ffffff" }}
          />
          <span style={{ position: "absolute", right: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.8, color: "#64748b", background: "#f1f5f9", borderRadius: 6, padding: "4px 7px" }}>Ctrl K</span>
        </div>
        <div style={{ marginLeft: "auto", flex: "0 0 auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div data-sec-lift="" style={{ display: "flex", alignItems: "center", gap: 9, height: 48, padding: "0 20px", border: "1px solid #e5e9f2", borderRadius: 12, background: "#ffffff", color: "#1d4ed8", fontSize: 13.1, fontWeight: 600, whiteSpace: "nowrap" }}>
            <span style={{ display: "flex" }}><SecretaryIcon name="shield" size={16} /></span>
            Secretary · {department}
          </div>
          <div data-sec-lift="" style={{ display: "flex", height: 48, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e9f2" }}>
            <button onClick={cycleYear} style={{ border: 0, background: "#ffffff", padding: "0 18px", fontSize: 13.1, fontWeight: 500, color: "#0f172a", whiteSpace: "nowrap", cursor: "pointer" }}>{year}</button>
            <button onClick={() => setSemester((v) => (v === "Odd Semester" ? "Even Semester" : "Odd Semester"))} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", padding: "0 22px", fontSize: 13.1, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" }}>{semester}</button>
          </div>
          <Link href="/secretary/sop">
            <div data-sec-lift="" title="New request" style={{ width: 48, height: 48, borderRadius: 12, border: "1px solid #e5e9f2", background: "#ffffff", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SecretaryIcon name="plus" size={20} />
            </div>
          </Link>
          <div data-sec-lift="" onClick={() => setNotifOpen((v) => !v)} title="Notifications" style={{ width: 48, height: 48, borderRadius: 12, border: "1px solid #e5e9f2", background: "#ffffff", color: "#334155", cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SecretaryIcon name="bell" size={18} />
            <span style={{ position: "absolute", top: 11, right: 12, width: 8, height: 8, borderRadius: 999, background: "#2563eb" }} />
            {notifOpen && (
              <div style={{ position: "absolute", top: 62, right: 0, width: 340, background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, boxShadow: "0 18px 40px rgba(15,23,42,0.13)", zIndex: 60, textAlign: "left" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #eef2f7", fontSize: 12.2, fontWeight: 700 }}>Notifications</div>
                {NOTIFICATIONS.map((n) => (
                  <button
                    key={n.title}
                    data-sec-row=""
                    onClick={() => { setNotifOpen(false); router.push(n.href); }}
                    style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "transparent", borderBottom: "1px solid #f5f7fa", padding: "12px 16px", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: 11.7, fontWeight: 600, color: "#0f172a" }}>{n.title}</div>
                    <div style={{ fontSize: 11.8, color: "#64748b", marginTop: 2 }}>{n.meta}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href="/secretary/settings">
            <div data-sec-lift="" title="Settings" style={{ width: 48, height: 48, borderRadius: 12, border: "1px solid #e5e9f2", background: "#ffffff", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SecretaryIcon name="gear" size={18} />
            </div>
          </Link>
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "stretch", flex: 1, minHeight: 0 }}>
        <aside style={{ width: collapsed ? 88 : 292, flex: "0 0 auto", background: "#ffffff", borderRight: "1px solid #e5e9f2", display: "flex", flexDirection: "column", position: "sticky", top: 80, height: "calc(100vh - 80px)", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "22px 16px 10px" }}>
            {SECRETARY_NAV.map((g, gi) => (
              <div key={g.label} style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 10px" }}>
                  {!collapsed && <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, color: "#94a3b8", textTransform: "uppercase" }}>{g.label}</span>}
                  {gi === 0 && (
                    <span data-sec-collapse="" onClick={() => setCollapsed((v) => !v)} title="Collapse navigation" style={{ border: 0, background: "transparent", color: "#94a3b8", fontSize: 12.2, cursor: "pointer", padding: "0 2px" }}>«</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {g.items.map((it) => {
                    const active = activeId === it.id;
                    return (
                      <Link key={it.id} href={it.href} style={{ textDecoration: "none" }}>
                        <div
                          data-sec-nav-item={active ? undefined : ""}
                          style={{
                            display: "flex", alignItems: "center", gap: 12, width: "100%", background: active ? "#eef4ff" : "transparent",
                            color: active ? "#1e3a8a" : "#334155", padding: "12px 12px", borderRadius: 10, fontSize: 13.1, fontWeight: active ? 600 : 500, cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", color: active ? "#1e3a8a" : "#64748b" }}>
                            <SecretaryIcon name={it.icon} />
                          </span>
                          {!collapsed && <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>}
                          {!collapsed && it.badge && (
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, fontWeight: 500, color: "#475569", background: active ? "#eef2f7" : "#f1f5f9", borderRadius: 6, padding: "3px 7px" }}>{it.badge}</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <Link href="/secretary/settings" style={{ textDecoration: "none", color: "inherit" }}>
            <div data-sec-nav-item="" style={{ borderTop: "1px solid #eef2f7", background: "#ffffff", width: "100%", textAlign: "left", padding: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: "#1e3a8a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.7, fontWeight: 700, flex: "none" }}>{initials}</div>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13.1, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{secretaryName}</div>
                  <div style={{ fontSize: 11.8, color: "#64748b" }}>Department Secretary · {department}</div>
                </div>
              )}
              {!collapsed && <span style={{ color: "#94a3b8", fontSize: 12.2 }}>›</span>}
            </div>
          </Link>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: "34px 40px 60px" }}>{children}</main>
      </div>
    </div>
  );
}
