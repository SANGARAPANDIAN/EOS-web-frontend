"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNow } from "@/lib/hooks/useNow";
import { useEdcEntrepreneurship, isBeyondIdeaStage, type EdcEntrepreneurshipRow } from "@/modules/edc/api/entrepreneurship";
import { useIncubations } from "@/modules/edc/api/incubations";
import { useStartupIdeas } from "@/modules/edc/api/startupIdeas";
import { useEdcAnnouncements, type EdcAnnouncementRow } from "@/modules/edc/api/announcements";
import { barSx, pillSx } from "@/modules/edc/genericPage";

// Rebuilt from real EOSbackend1 data — the design's DASHBOARD fake-data
// object (fakeData.ts) is no longer used anywhere on this page. Every
// number below is derived live from the same queries the rest of the module
// already uses (useEdcEntrepreneurship/useIncubations/useStartupIdeas/
// useEdcAnnouncements) — no invented KPI, no static count. Sections the
// design had that have no honest backend basis (an "applicant funnel"
// status/tone per venture, a literal "3 open" queue badge) are replaced
// with what the real data actually supports.

function lifecycleStage(v: EdcEntrepreneurshipRow): string {
  if (v.product_launched) return "Product launched";
  if (v.mvp_launched) return "MVP";
  if (v.prototype_developed) return "Prototype";
  return "Idea";
}

const LIFECYCLE_COLORS: Record<string, string> = {
  Idea: "#94A3B8",
  Prototype: "#3B6FD4",
  MVP: "#1D4ED8",
  "Product launched": "#0F172A",
};

const LEGAL_LABELS: Record<string, string> = {
  private_limited: "Private Limited",
  llp: "LLP",
  proprietorship: "Proprietorship",
  unregistered: "Unregistered",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function EdcDashboardPage() {
  const router = useRouter();
  const ventures = useEdcEntrepreneurship();
  const incubations = useIncubations();
  const ideas = useStartupIdeas();
  const announcements = useEdcAnnouncements();

  const loading = ventures.isLoading;
  const rows = ventures.data ?? [];
  const startupsCount = rows.filter(isBeyondIdeaStage).length;
  const incubatedCount = incubations.data?.length ?? 0;
  const ideasPending = (ideas.data ?? []).filter((i) => i.review_status === "Under Review").length;

  const kpis = [
    { label: "EDC Students", icon: "groups", value: rows.length, note: "Registered ventures, institution-wide", href: "/edc/entrepreneurs" },
    { label: "Startups", icon: "rocket_launch", value: startupsCount, note: "Beyond idea stage", href: "/edc/startups" },
    { label: "In Incubation", icon: "psychiatry", value: incubatedCount, note: "Admitted into the centre", href: "/edc/incubation" },
    { label: "Startup Ideas", icon: "lightbulb", value: ideas.data?.length ?? 0, note: `${ideasPending} awaiting review`, href: "/edc/ideas" },
  ];

  const lifecycleCounts = rows.reduce<Record<string, number>>((acc, v) => {
    const s = lifecycleStage(v);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const lifecycle = ["Idea", "Prototype", "MVP", "Product launched"].map((label) => ({
    label,
    value: lifecycleCounts[label] ?? 0,
    pct: rows.length ? Math.round(((lifecycleCounts[label] ?? 0) / rows.length) * 100) : 0,
    color: LIFECYCLE_COLORS[label],
  }));

  const legalCounts = rows.reduce<Record<string, number>>((acc, v) => {
    const key = v.registration_type ?? "unregistered";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const registeredCount = rows.filter((v) => v.registration_type && v.registration_type !== "unregistered").length;
  const legal = Object.keys(LEGAL_LABELS).map((key) => ({
    label: LEGAL_LABELS[key],
    value: legalCounts[key] ?? 0,
    pct: rows.length ? Math.round(((legalCounts[key] ?? 0) / rows.length) * 100) : 0,
  }));

  const recent = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

  const now = useNow();
  const needsAttention = [
    ...rows
      .filter((v) => !v.mentor_faculty_id && !v.external_mentor_name)
      .slice(0, 3)
      .map((v) => ({ title: v.business_name, note: "No mentor assigned yet" })),
    ...(incubations.data ?? [])
      .filter((i) => i.next_review_date && new Date(i.next_review_date).getTime() < now)
      .slice(0, 3)
      .map((i) => ({ title: i.business_name ?? "Incubated venture", note: "Review is overdue" })),
  ].slice(0, 5);

  const recentAnnouncements = (announcements.data ?? []).slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1560 }}>
      <div>
        <h1 style={{ margin: "0 0 8px", fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 }}>EDC Dashboard</h1>
        <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {loading && <div style={{ color: "#94A3B8", fontSize: 14 }}>Loading real-time data…</div>}
      {ventures.isError && (
        <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, color: "#DC2626", fontWeight: 600, fontSize: 13.5 }}>
          {ventures.error instanceof Error ? ventures.error.message : "Failed to load dashboard data."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            data-edc-lift=""
            style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "18px 20px 16px", display: "flex", flexDirection: "column", gap: 11, textDecoration: "none", color: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "#475569" }}>{k.label}</span>
              <span className="ms" style={{ width: 32, height: 32, borderRadius: 9, background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flex: "none" }}>
                {k.icon}
              </span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: "#94A3B8" }}>{k.note}</div>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18 }}>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Venture Overview</h3>
            <Link href="/edc/entrepreneurs" style={{ fontSize: 13, fontWeight: 600 }}>View ventures</Link>
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#7B8AA0" }}>Distribution of the {rows.length} registered ventures across stages.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {lifecycle.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ fontWeight: 600, color: "#334155" }}>{s.label}</span>
                  <span style={{ fontWeight: 700 }}>{s.value}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "#E9EEF6" }}>
                  <div style={barSx(s.pct, s.color)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Legal Identity</h3>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>{registeredCount} of {rows.length} registered</span>
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#7B8AA0" }}>Legal structure of the ventures registered with the cell.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {legal.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ fontWeight: 600, color: "#334155" }}>{s.label}</span>
                  <span style={{ fontWeight: 700 }}>{s.value}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "#E9EEF6" }}>
                  <div style={barSx(s.pct)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1fr)", gap: 18 }}>
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 16px" }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Recent Venture Registrations</h3>
            <div style={{ flex: 1 }} />
            <Link href="/edc/entrepreneurs" style={{ fontSize: 13, fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.9fr 0.9fr 1fr 1fr", padding: "10px 24px", background: "#fff", borderTop: "1px solid #EEF2F7", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
            <span>VENTURE</span>
            <span>FOUNDER</span>
            <span>DEPT</span>
            <span>STAGE</span>
            <span>LEGAL IDENTITY</span>
            <span style={{ textAlign: "right" }}>REGISTERED</span>
          </div>
          {recent.length === 0 && !loading && (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No ventures registered yet.</div>
          )}
          {recent.map((r) => (
            <div
              key={r.id}
              data-edc-row=""
              onClick={() => router.push(`/edc/entrepreneurs/${r.id}`)}
              style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.9fr 0.9fr 1fr 1fr", alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #EEF2F7", fontSize: 13.5, cursor: "pointer" }}
            >
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.business_name}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sector ?? "—"}</div>
              </div>
              <span style={{ fontWeight: 500, color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.student.name}>{r.student.name}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#475569" }}>{r.student.department?.code ?? "—"}</span>
              <span><span style={pillSx("blue")}>{lifecycleStage(r)}</span></span>
              <span style={{ color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.registration_type ? LEGAL_LABELS[r.registration_type] : "Unregistered"}</span>
              <span style={{ textAlign: "right", color: "#64748B", fontSize: 12.5 }}>{timeAgo(r.created_at)}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Needs attention</h3>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", background: "#E9EEF6", borderRadius: 99, padding: "3px 10px" }}>{needsAttention.length} flags</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {needsAttention.length === 0 && <div style={{ fontSize: 13, color: "#94A3B8" }}>Nothing needs attention right now.</div>}
              {needsAttention.map((f, i) => (
                <div key={`${f.title}-${i}`} style={{ display: "flex", gap: 10 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: "#1D4ED8", marginTop: 6, flex: "none" }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.title}</div>
                    <div style={{ fontSize: 12.5, color: "#7B8AA0" }}>{f.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Announcements</h3>
              <Link href="/edc/announcements" style={{ fontSize: 12.5, fontWeight: 600 }}>View all</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {recentAnnouncements.length === 0 && <div style={{ fontSize: 13, color: "#94A3B8" }}>No announcements yet.</div>}
              {recentAnnouncements.map((a: EdcAnnouncementRow) => (
                <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{timeAgo(a.created_at)}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
