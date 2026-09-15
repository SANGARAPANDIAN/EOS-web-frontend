"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { NavGroup } from "@/modules/types";
import { advisorModuleConfig, ADVISOR_NAV } from "./nav";
import type { AdvisorIconKind } from "./icons";
import { useMyFacultyProfile, useIsClassAdvisor } from "./api/profile";
import { useHandledClasses } from "./api/classes";
import { usePendingStudentLeaveCount, usePendingStudentOdCount } from "./api/requests";

// All content below is live from EOSbackend1 — no hardcoded sample values.
// Fields the backend has no source of truth for at all (publications count,
// feedback score) are omitted entirely rather than invented; see
// advisor-backend-wiring memory for the full field-by-field map.

const ICON_MAP: Record<AdvisorIconKind, string> = {
  dashboard: "dashboard",
  reports: "monitoring",
  announcements: "campaign",
  attendance: "event_available",
  leave: "beach_access",
  od: "directions_walk",
  assignment: "assignment_turned_in",
  subject: "menu_book",
  cia: "school",
  results: "bar_chart",
  venue: "location_on",
  payroll: "payments",
  payslip: "receipt_long",
  appraisal: "military_tech",
  library: "local_library",
  search: "search",
};

export function AdvisorShell({ children }: { children: React.ReactNode }) {
  const [profileOpen, setProfileOpen] = useState(false);

  const myProfile = useMyFacultyProfile();
  const { isAdvisor, isLoading: advisorLoading, classes: menteeClasses } = useIsClassAdvisor();
  const handledClasses = useHandledClasses();
  const pendingLeave = usePendingStudentLeaveCount();
  const pendingOd = usePendingStudentOdCount();

  // /me/profile (which would supply phone/status/raw name split) is
  // unreachable for a faculty JWT due to a confirmed backend route
  // collision — see api/profile.ts. Identity comes from /me/my-profile alone.
  const displayName = myProfile.data?.name ?? "";
  const designation = myProfile.data?.designation ?? "";
  const departmentName = myProfile.data?.department?.name ?? "";
  const departmentCode = myProfile.data?.department?.code ?? "";
  const primaryMentee = menteeClasses[0];

  const navGroups: NavGroup[] = useMemo(
    () =>
      ADVISOR_NAV.filter((g) => !g.advisorOnly || (!advisorLoading && isAdvisor)).map((group) => ({
        label: group.label,
        items: group.items.map((item) => ({
          key: item.key,
          label: item.label,
          icon: ICON_MAP[item.icon],
          href: item.href,
          badgeKey: item.badgeKey === "pendingLeave" ? "leaveRequestsPending" : item.badgeKey === "pendingOd" ? "odRequestsPending" : undefined,
        })),
      })),
    [advisorLoading, isAdvisor],
  );

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
    <>
      <AppShell
        moduleConfig={{ ...advisorModuleConfig, navGroups }}
        onIdentityClick={() => setProfileOpen(true)}
        header={{
          studentName: displayName,
          registerNumber: [designation, departmentCode].filter(Boolean).join(" · ") || undefined,
          searchPlaceholder: "Search students, classes, assignments...",
          programLabel: isAdvisor && primaryMentee ? `Class Mentor · ${primaryMentee.label}` : undefined,
          // No academic-calendar/section-context endpoint exists for faculty —
          // omitting the AY/semester pill is more honest than an unbacked value.
          showNotifications: true,
        }}
        navBadges={{
          leaveRequestsPending: pendingLeave.data || undefined,
          odRequestsPending: pendingOd.data || undefined,
        }}
      >
        {children}
      </AppShell>

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
                  {displayName
                    .replace(/^Dr\.?\s+/i, "")
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
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
    </>
  );
}
