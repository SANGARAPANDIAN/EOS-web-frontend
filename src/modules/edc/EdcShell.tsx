"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { EDC_NAV } from "./nav";
import { useEdcAnnouncements } from "./api/announcements";
import { useEdcEntrepreneurship, isBeyondIdeaStage } from "./api/entrepreneurship";
import { useStartupIdeas } from "./api/startupIdeas";
import { useIncubations } from "./api/incubations";
import { useEdcEvents } from "./api/events";
import { useEdcDocuments } from "./api/documents";

// Pixel-exact port of the shell (aside + header) from
// "EDC Module - Web/EDC Portal.dc.html" — every color/size/spacing value
// below is copied directly from that file's inline styles. Backend wiring
// is being done page-by-page: the Announcements nav badge is real now
// (useEdcAnnouncements), everything else in the shell (user chip,
// notifications dropdown, semester pill, other nav badges) is still the
// design's own fake/placeholder data, pending its own connected pass.
//
// Icons are literal Material Symbols Outlined ligatures (class="ms"), same
// as the design source — font loaded via <link> in this route's layout.tsx,
// not next/font, since it's scoped to this module only.

// No generic notification table has any real trigger point for this
// module — EDC_COORDINATOR is the AUTHOR of its own announcements/events,
// not a recipient, and the announcements audience list has no real
// student/founder fan-out to notify (see api/announcements.ts). Rather
// than leave the bell fake or wire it to a table nothing ever writes to,
// it shows LIVE DERIVED alerts computed from the same real data the
// Dashboard's "Needs attention" panel already uses: overdue incubation
// reviews, documents still pending verification, ideas awaiting review,
// and events happening within the next 7 days. Every item here is a real
// row from a real endpoint, just not persisted as its own notification.
interface EdcAlert {
  title: string;
  meta: string;
  href: string;
}

export function EdcShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [bellOpen, setBellOpen] = useState(false);
  const [semester, setSemester] = useState<"Odd" | "Even">("Odd");
  const [searchQuery, setSearchQuery] = useState("");

  const activeId = EDC_NAV.flatMap((g) => g.items).find((item) => pathname?.startsWith(item.href))?.id;

  // Real counts for Announcements/EDC Students/Startups/Startup
  // Ideas/Incubation — the design's literal badge numbers were fake sample
  // data, all dropped. Mentors/Funding still have no backend endpoint, so
  // that nav badge is not shown at all (no count is better than a fake one).
  const announcements = useEdcAnnouncements();
  const announcementsCount = announcements.data?.length;
  const entrepreneurship = useEdcEntrepreneurship();
  const entrepreneursCount = entrepreneurship.data?.length;
  const startupsCount = entrepreneurship.data?.filter(isBeyondIdeaStage).length;
  const ideas = useStartupIdeas();
  const ideasCount = ideas.data?.length;
  const incubations = useIncubations();
  const incubationCount = incubations.data?.length;
  const events = useEdcEvents();
  const documents = useEdcDocuments();

  const alerts: EdcAlert[] = [];
  for (const i of incubations.data ?? []) {
    if (i.next_review_date && new Date(i.next_review_date).getTime() < Date.now()) {
      alerts.push({ title: "Incubation review overdue", meta: `${i.business_name ?? "A venture"} — was due ${new Date(i.next_review_date).toLocaleDateString()}`, href: `/edc/incubation/${i.id}` });
    }
  }
  for (const d of documents.data ?? []) {
    if (d.verification_status === "Pending") {
      alerts.push({ title: "Document awaiting verification", meta: `${d.file_name}${d.venture_name ? ` — ${d.venture_name}` : ""}`, href: "/edc/documents" });
    }
  }
  for (const idea of ideas.data ?? []) {
    if (idea.review_status === "Under Review") {
      alerts.push({ title: "Startup idea awaiting review", meta: `${idea.title} — ${idea.student.name}`, href: `/edc/ideas/${idea.id}` });
    }
  }
  const soon = Date.now() + 7 * 86_400_000;
  for (const e of events.data ?? []) {
    const t = new Date(e.event_date).getTime();
    if (t >= Date.now() && t <= soon) {
      alerts.push({ title: "Upcoming event", meta: `${e.title} — ${new Date(e.event_date).toLocaleDateString()}`, href: "/edc/events" });
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", minWidth: 1560, overflow: "hidden", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#0F172A", background: "#fff" }}>
      <aside
        style={{
          width: expanded ? 292 : 82,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRight: "1px solid #E6EBF2",
          transition: "width .16s ease",
        }}
      >
        <div style={{ height: 80, flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "0 18px" }}>
          <div
            style={{
              width: 40,
              height: 44,
              borderRadius: 6,
              background: "repeating-linear-gradient(135deg,#ffffff 0 6px,#eff6ff 6px 12px)",
              border: "1px solid #DBE7F7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 8,
              color: "#5B7398",
              flex: "none",
            }}
          >
            crest
          </div>
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>Sri Eshwar</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#7B8AA0", lineHeight: 1 }}>College of Engineering</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 8px" }}>
          {EDC_NAV.map((group, gi) => (
            <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px 8px" }}>
                {expanded && (
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>{group.label}</span>
                )}
                {gi === 0 && (
                  <span
                    className="ms"
                    onClick={() => setExpanded((v) => !v)}
                    style={{ fontSize: 17, color: "#94A3B8", cursor: "pointer" }}
                  >
                    {expanded ? "chevron_left" : "chevron_right"}
                  </span>
                )}
              </div>
              {group.items.map((item) => {
                const active = activeId === item.id;
                const displayCount =
                  item.id === "announcements" ? announcementsCount :
                  item.id === "entrepreneurs" ? entrepreneursCount :
                  item.id === "startups" ? startupsCount :
                  item.id === "ideas" ? ideasCount :
                  item.id === "incubation" ? incubationCount :
                  item.count;
                return (
                  <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
                    <div
                      data-edc-nav-item=""
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: expanded ? "10px 12px" : "10px 0",
                        justifyContent: expanded ? "flex-start" : "center",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: active ? "#EFF6FF" : "transparent",
                        color: active ? "#1D4ED8" : "#334155",
                        fontSize: 14.5,
                        fontWeight: active ? 700 : 600,
                      }}
                    >
                      <span className="ms" style={{ fontSize: 21, width: 22, textAlign: "center", flex: "none", color: active ? "#1D4ED8" : "#94A3B8" }}>
                        {item.icon}
                      </span>
                      {expanded && <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                      {expanded && displayCount !== undefined && (
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: active ? "#1D4ED8" : "#7B8AA0",
                            background: active ? "#DBEAFE" : "#EEF2F7",
                            borderRadius: 99,
                            padding: "2px 8px",
                          }}
                        >
                          {displayCount}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ flex: "none", borderTop: "1px solid #EEF2F7", padding: "12px 14px", display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 99, background: "#1D4ED8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flex: "none" }}>
            PS
          </div>
          {expanded && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>Dr. P. Sundaravadivel</div>
              <div style={{ fontSize: 11.5, color: "#7B8AA0" }}>EDC Coordinator</div>
            </div>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 80, flex: "none", background: "#fff", borderBottom: "1px solid #E6EBF2", display: "flex", alignItems: "center", gap: 16, padding: "0 24px" }}>
          <div
            onClick={() => setExpanded((v) => !v)}
            style={{ width: 44, height: 44, flex: "none", border: "1px solid #E2E8F0", borderRadius: 11, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", cursor: "pointer" }}
          >
            <span className="ms" style={{ fontSize: 22 }}>menu</span>
          </div>
          <div style={{ flex: 1, minWidth: 320, maxWidth: 640, height: 46, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", border: "1px solid #E2E8F0", borderRadius: 12, background: "#fff" }}>
            <span className="ms" style={{ color: "#94A3B8", fontSize: 21 }}>search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students, ventures, ideas…"
              style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "#0F172A" }}
            />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "#94A3B8", border: "1px solid #E2E8F0", background: "#fff", borderRadius: 6, padding: "4px 8px", flex: "none" }}>
              Ctrl K
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none", marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, height: 44, padding: "0 18px", border: "1px solid #DBE4F0", borderRadius: 99, background: "#fff", fontSize: 15, fontWeight: 600, color: "#1D4ED8", whiteSpace: "nowrap", flex: "none" }}>
              <span className="ms" style={{ fontSize: 19 }}>verified_user</span>
              <span>EDC · Institution</span>
            </div>
            <div style={{ display: "flex", height: 44, border: "1px solid #DBE4F0", borderRadius: 10, overflow: "hidden", whiteSpace: "nowrap", flex: "none" }}>
              <div style={{ padding: "0 16px", display: "flex", alignItems: "center", fontSize: 15, fontWeight: 600, color: "#334155", background: "#fff" }}>2026–27</div>
              <div
                onClick={() => setSemester((v) => (v === "Odd" ? "Even" : "Odd"))}
                style={{ padding: "0 16px", display: "flex", alignItems: "center", fontSize: 15, fontWeight: 700, color: "#fff", background: "#1D4ED8", cursor: "pointer" }}
              >
                {semester}
              </div>
            </div>
            <div style={{ width: 44, height: 44, border: "1px solid #DBE4F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}>
              <span className="ms" style={{ fontSize: 21 }}>add</span>
            </div>
            <div
              onClick={() => setBellOpen((v) => !v)}
              style={{ width: 44, height: 44, border: "1px solid #DBE4F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", position: "relative", cursor: "pointer" }}
            >
              <span className="ms" style={{ fontSize: 21 }}>notifications</span>
              {alerts.length > 0 && (
                <span style={{ position: "absolute", top: 6, right: 7, minWidth: 16, height: 16, borderRadius: 99, background: "#DC2626", border: "1.5px solid #fff", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                  {alerts.length > 9 ? "9+" : alerts.length}
                </span>
              )}
              {bellOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: "absolute", top: 52, right: 0, width: 340, maxHeight: 380, overflowY: "auto", background: "#fff", border: "1px solid #E6EBF2", borderRadius: 13, boxShadow: "0 18px 40px rgba(15,23,42,0.14)", padding: 8, zIndex: 40, textAlign: "left" }}
                >
                  <div style={{ padding: "6px 9px 9px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#94A3B8" }}>NEEDS YOUR ATTENTION</div>
                  {alerts.length === 0 && (
                    <div style={{ padding: "18px 13px", fontSize: 13, color: "#94A3B8" }}>Nothing needs attention right now.</div>
                  )}
                  {alerts.map((n, i) => (
                    <Link key={`${n.title}-${i}`} href={n.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div data-edc-row="" style={{ padding: "11px 13px", borderRadius: 9 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{n.title}</div>
                        <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 3 }}>{n.meta}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 44, height: 44, border: "1px solid #DBE4F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}>
              <span className="ms" style={{ fontSize: 21 }}>settings</span>
            </div>
            <div
              onClick={logout}
              title="Log out"
              style={{ width: 44, height: 44, border: "1px solid #DBE4F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626", cursor: "pointer" }}
            >
              <span className="ms" style={{ fontSize: 21 }}>logout</span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "30px 34px 60px" }}>{children}</main>
      </div>
    </div>
  );
}
