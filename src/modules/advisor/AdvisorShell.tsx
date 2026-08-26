"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BrandMark } from "@/components/layout/SidebarBrandHeader";
import { ADVISOR_NAV } from "./nav";
import { AdvisorIcon } from "./icons";
import { useMyFacultyProfile, useIsClassAdvisor } from "./api/profile";
import { useHandledClasses } from "./api/classes";
import { usePendingStudentLeaveCount, usePendingStudentOdCount } from "./api/requests";
import { useUnreadNotificationCount } from "@/modules/shared/api/notifications";
import { NotificationPanel } from "@/components/layout/NotificationPanel";

// Standalone, pixel-accurate port of the sidebar/header/profile-drawer shell
// from "Advisor (Final) - Web/Faculty Portal.dc.html" — deliberately NOT
// built on the shared AppShell/Sidebar (those render a different, generic
// layout with Material Symbols icons). Every color/size/spacing value below
// is copied directly from that file's inline styles, not approximated.
//
// All content below is now live from EOSbackend1 — no hardcoded sample
// values remain. Fields the backend has no source of truth for at all
// (publications count, feedback score) are omitted entirely rather than
// invented; see advisor-backend-wiring memory for the full field-by-field map.
function initialsOf(name: string | undefined) {
  if (!name) return "";
  const parts = name.replace(/^Dr\.?\s+/i, "").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AdvisorShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const myProfile = useMyFacultyProfile();
  const { isAdvisor, isLoading: advisorLoading, classes: menteeClasses } = useIsClassAdvisor();
  const handledClasses = useHandledClasses();
  const pendingLeave = usePendingStudentLeaveCount();
  const pendingOd = usePendingStudentOdCount();
  const unreadCount = useUnreadNotificationCount();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // /me/profile (which would supply phone/status/raw name split) is
  // unreachable for a faculty JWT due to a confirmed backend route
  // collision — see api/profile.ts. Identity comes from /me/my-profile alone.
  const displayName = myProfile.data?.name ?? "";
  const designation = myProfile.data?.designation ?? "";
  const departmentName = myProfile.data?.department?.name ?? "";
  const departmentCode = myProfile.data?.department?.code ?? "";
  const initials = initialsOf(displayName);
  const primaryMentee = menteeClasses[0];

  const visibleNav = useMemo(
    () => (advisorLoading ? ADVISOR_NAV.filter((g) => !g.advisorOnly) : ADVISOR_NAV.filter((g) => !g.advisorOnly || isAdvisor)),
    [advisorLoading, isAdvisor],
  );

  const badgeValue = (key: "pendingLeave" | "pendingOd") =>
    key === "pendingLeave" ? pendingLeave.data ?? 0 : pendingOd.data ?? 0;

  const profileFields = [
    myProfile.data?.work_email ? { label: "Email", value: myProfile.data.work_email } : null,
    departmentName ? { label: "Department", value: departmentCode ? `${departmentName} (${departmentCode})` : departmentName } : null,
    myProfile.data?.date_of_joining
      ? { label: "Date of joining", value: new Date(myProfile.data.date_of_joining).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) }
      : null,
    myProfile.data?.reporting_to ? { label: "Reporting to", value: myProfile.data.reporting_to } : null,
    isAdvisor && primaryMentee
      ? {
          label: "Mentoring class",
          value: [primaryMentee.label, `${primaryMentee.students.length} students`].filter(Boolean).join(" · "),
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];


  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: "#0F172A",
        background: "#FFFFFF",
      }}
    >
      <aside
        style={{
          width: collapsed ? 76 : 266,
          flex: collapsed ? "0 0 76px" : "0 0 266px",
          background: "#FFFFFF",
          borderRight: "1px solid #E6EAF0",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          transition: "width 0.16s ease, flex-basis 0.16s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "18px 12px" : "18px 20px",
            borderBottom: "1px solid #EEF1F6",
          }}
        >
          <BrandMark subtitle="Faculty Portal" collapsed={collapsed} />
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "14px 12px 24px" }}>
          {visibleNav.map((group) => (
            <div key={group.label}>
              <div style={{ display: "flex", alignItems: "center", padding: collapsed ? "16px 4px 8px" : "16px 12px 8px", justifyContent: collapsed ? "center" : "flex-start" }}>
                {!collapsed && (
                  <div style={{ flex: 1, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", color: "#94A3B8" }}>
                    {group.label}
                  </div>
                )}
                {group.chevron && (
                  <div
                    onClick={() => setCollapsed((c) => !c)}
                    role="button"
                    aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                    title={collapsed ? "Expand navigation" : "Collapse navigation"}
                    style={{ fontSize: 13, fontWeight: 800, color: "#94A3B8", cursor: "pointer" }}
                  >
                    {collapsed ? "»" : "«"}
                  </div>
                )}
              </div>
              {group.items.map((item) => {
                const active = pathname?.startsWith(item.href) ?? false;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    data-advisor-lift=""
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: 13,
                      padding: collapsed ? "10px 0" : "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      marginBottom: 2,
                      background: active ? "#DBEAFE" : "transparent",
                      color: active ? "#1D4ED8" : "#475569",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 20,
                        height: 20,
                        flex: "0 0 20px",
                      }}
                    >
                      <AdvisorIcon kind={item.icon} />
                    </div>
                    {!collapsed && <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{item.label}</div>}
                    {!collapsed && item.badgeKey && badgeValue(item.badgeKey) > 0 && (
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#1D4ED8", background: "#EFF6FF", borderRadius: 6, padding: "2px 7px" }}>
                        {badgeValue(item.badgeKey)}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div
          style={{
            borderTop: "1px solid #EEF1F6",
            padding: collapsed ? "12px 8px" : "12px 14px",
            display: "flex",
            flexDirection: collapsed ? "column" : "row",
            alignItems: "center",
            gap: 9,
          }}
        >
          <div
            onClick={() => setProfileOpen(true)}
            title={collapsed ? displayName : undefined}
            style={{ display: "flex", alignItems: "center", gap: 11, flex: collapsed ? "0 0 auto" : 1, minWidth: 0, cursor: "pointer" }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                flex: "0 0 34px",
                borderRadius: "50%",
                background: "#DBEAFE",
                color: "#1D4ED8",
                fontWeight: 800,
                fontSize: 12.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </div>
                <div style={{ fontSize: 11, color: "#7C8899", fontWeight: 500 }}>
                  {[designation, departmentCode].filter(Boolean).join(" · ")}
                </div>
              </div>
            )}
          </div>

          <IconButton icon="logout" size={34} iconSize={17} title="Log out" onClick={() => setConfirmingLogout(true)} />
        </div>
      </aside>

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out?"
        description="You'll need to log in again to access the Faculty portal."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />

      {profileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 80,
          }}
        >
          <div onClick={() => setProfileOpen(false)} style={{ flex: 1 }} />
          <div
            style={{
              width: 440,
              maxWidth: "92vw",
              background: "#fff",
              height: "100vh",
              overflowY: "auto",
              boxShadow: "-16px 0 48px rgba(15,23,42,0.16)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "22px 24px",
                borderBottom: "1px solid #EEF1F6",
                position: "sticky",
                top: 0,
                background: "#fff",
              }}
            >
              <div style={{ flex: 1, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Faculty profile</div>
              <div
                onClick={() => setProfileOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  border: "1px solid #E2E8F0",
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#64748B",
                  cursor: "pointer",
                }}
              >
                ×
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: "50%",
                    background: "#DBEAFE",
                    color: "#1D4ED8",
                    fontWeight: 800,
                    fontSize: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 66px",
                  }}
                >
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{displayName}</div>
                  <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginTop: 4 }}>
                    {[designation, departmentName].filter(Boolean).join(" · ")}
                  </div>
                  {isAdvisor && primaryMentee && (
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 9,
                        padding: "5px 12px",
                        borderRadius: 20,
                        background: "#EFF6FF",
                        border: "1px solid #DBEAFE",
                        color: "#1D4ED8",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                      }}
                    >
                      CLASS ADVISOR · {primaryMentee.label}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8", marginTop: 26 }}>
                DETAILS
              </div>
              <div style={{ marginTop: 10 }}>
                {profileFields.map((p) => (
                  <div
                    key={p.label}
                    style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "12px 0", borderBottom: "1px solid #F4F6FA" }}
                  >
                    <div style={{ width: 140, flex: "0 0 140px", fontSize: 12.5, fontWeight: 600, color: "#94A3B8" }}>
                      {p.label}
                    </div>
                    <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{p.value}</div>
                  </div>
                ))}
                {profileFields.length === 0 && (
                  <div style={{ padding: "12px 0", fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>Loading profile…</div>
                )}
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8", marginTop: 26 }}>
                CLASSES HANDLED
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
                {(handledClasses.data ?? []).map((c) => (
                  <div key={`${c.class_id}-${c.subject_id}`} style={{ padding: "12px 14px", border: "1px solid #EEF1F6", borderRadius: 11, fontSize: 13, fontWeight: 700 }}>
                    {[c.section, c.subject_code, c.subject_name].filter(Boolean).join(" · ")}
                  </div>
                ))}
                {handledClasses.data?.length === 0 && (
                  <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>No classes assigned yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", minWidth: 0 }}>
        <header
          style={{
            height: 66,
            flex: "0 0 66px",
            background: "#FFFFFF",
            borderBottom: "1px solid #E6EAF0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "0 26px",
          }}
        >
          <div
            style={{
              flex: "1 1 120px",
              minWidth: 0,
              maxWidth: 520,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 40,
              padding: "0 14px",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              background: "#F8FAFC",
            }}
          >
            <AdvisorIcon kind="search" width={15} height={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input
              placeholder="Search students, classes, assignments…"
              style={{
                flex: "1 1 0",
                minWidth: 0,
                border: 0,
                outline: 0,
                background: "transparent",
                fontFamily: "inherit",
                fontSize: 13.5,
                color: "#0F172A",
              }}
            />
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "#94A3B8",
                background: "#EDF1F7",
                borderRadius: 6,
                padding: "3px 7px",
                whiteSpace: "nowrap",
              }}
            >
              Ctrl K
            </div>
          </div>

          {/* Spacer — pushes the Class Mentor chip + bell to the far right
              edge of the header. Without this, since the search box only
              grows to maxWidth:520, the chip+bell floated left of a large
              empty gap instead of sitting flush right. */}
          <div style={{ flex: 1 }} />

          {/* Academic-year/semester pill has no backend source (no
              faculty-section-context endpoint exists) — flagged in
              advisor-backend-wiring memory as a real gap, not silently
              faked. The "Class Mentor" chip below IS live: it renders only
              when useIsClassAdvisor() confirms an active class_mentors row.
              The bell IS live too — real unread count from
              GET /me/notifications/unread-count, dropdown from
              GET /me/notifications/panel (see NotificationPanel.tsx). */}
          {isAdvisor && primaryMentee && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 38,
                padding: "0 14px",
                border: "1px solid #DBEAFE",
                background: "#EFF6FF",
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 700,
                color: "#1D4ED8",
                whiteSpace: "nowrap",
                flex: "0 0 auto",
              }}
            >
              Class Mentor · {primaryMentee.label}
            </div>
          )}
          <div style={{ position: "relative", flex: "0 0 38px" }}>
            <div
              onClick={() => setNotificationsOpen((v) => !v)}
              style={{
                position: "relative",
                width: 38,
                height: 38,
                border: "1px solid #E2E8F0",
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 10-12 0c0 4.5-1.5 6-1.5 6h15S18 12.5 18 8z" />
                <path d="M10.3 18.5a2 2 0 003.4 0" />
              </svg>
              {!!unreadCount.data?.count && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#1D4ED8",
                    border: "1.5px solid #fff",
                  }}
                />
              )}
            </div>
            {notificationsOpen && <NotificationPanel onClose={() => setNotificationsOpen(false)} />}
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "28px 26px 60px", background: "#FFFFFF" }}>{children}</div>
      </main>
    </div>
  );
}
