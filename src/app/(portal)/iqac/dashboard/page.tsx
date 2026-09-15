"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SegmentedTabs, SkeletonStatTiles, SkeletonBlock } from "@/components/ui";
import { useIqacDashboard } from "@/modules/iqac/api/dashboard";
import { QUALITY_DOMAINS } from "@/modules/iqac/qualityDomains";

const PERIODS = ["Today", "This term", "This year"] as const;
const PERIOD_TABS = PERIODS.map((p) => ({ key: p, label: p }));

/** Where each real attention-flag type is actually shown in the IQAC module — 'fees'/'course_completion' route to the closest topically-relevant page since neither has its own dedicated IQAC view yet. */
const FLAG_DESTINATIONS: Record<string, string> = {
  attendance: "/iqac/quality/academic/attendance",
  fees: "/iqac/students",
  workload: "/iqac/faculty",
  course_completion: "/iqac/quality/academic/results",
};

/** Metrics with a real, wired-up "this year" value — drives the honest data-coverage bar per domain (not a fabricated readiness score). */
const REAL_METRIC_KEYS: Record<string, string[]> = {
  academic: ["attendance", "results", "cgpa", "course-attainment", "program-attainment"],
  student: ["placements", "awards"],
  faculty: ["publications"],
  accreditation: ["nba-progress"],
};

function HeroCard({ label, value, foot, onClick }: { label: string; value: string | number; foot: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`hover-lift flex flex-col gap-2.5 rounded-card border border-border-default bg-surface p-[18px] text-left ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="text-[14px] font-bold text-muted">{label}</div>
      <div className="text-[36px] font-extrabold leading-none tracking-[-.03em] text-ink">{value}</div>
      <div className="text-[13px] font-semibold text-body">{foot}</div>
    </Tag>
  );
}

function GlanceTile({ label, value, sub, foot, onClick }: { label: string; value: string | number; sub?: string; foot?: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`hover-lift flex flex-col gap-1.5 rounded-[11px] border border-border-default bg-surface p-3.5 text-left ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="text-[12px] font-bold text-muted">{label}</div>
      <div className="text-[21px] font-extrabold tracking-[-.01em] text-ink">{value}</div>
      {sub && <div className="text-[12px] font-bold text-body">{sub}</div>}
      {foot && <div className="text-[11px] font-semibold text-subtle">{foot}</div>}
    </Tag>
  );
}

export default function IqacDashboardPage() {
  const router = useRouter();
  const overview = useIqacDashboard();
  const d = overview.data;
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("This year");

  const flagCount = d?.attention_flags.length ?? 0;

  const domainCoverage = QUALITY_DOMAINS.map((domain) => {
    const realCount = REAL_METRIC_KEYS[domain.key]?.length ?? 0;
    return {
      key: domain.key,
      label: domain.label,
      pct: Math.round((realCount / domain.metrics.length) * 100),
      realCount,
      total: domain.metrics.length,
    };
  });

  // "real" = backed by a real Prisma-sourced field on `d`, not a hardcoded "not tracked" placeholder.
  // onClick only set when a page actually shows this data — MoUs/Funded projects/ratio have no
  // dedicated IQAC page yet (department_mous/department_research_funding aren't surfaced anywhere),
  // so those stay non-clickable rather than linking to a page that doesn't back them.
  const glanceTiles: { label: string; value: string | number; sub?: string; foot?: string; real: boolean; onClick?: () => void }[] = [
    { label: "Programmes", value: d?.programmes_total ?? "—", real: true, onClick: () => router.push("/iqac/departments") },
    { label: "Student : Faculty", value: d?.student_faculty_ratio != null ? `${d.student_faculty_ratio}:1` : "—", real: true },
    {
      label: "Higher studies",
      value: d?.higher_studies_count ?? "—",
      sub: d?.higher_studies_percentage != null ? `${d.higher_studies_percentage}%` : undefined,
      real: true,
      onClick: () => router.push("/iqac/higher-education"),
    },
    { label: "Publications", value: d?.publications_total ?? "—", real: true, onClick: () => router.push("/iqac/quality/faculty/publications") },
    { label: "MoUs", value: d?.mous_total ?? "—", real: true },
    {
      label: "Funded projects",
      value: d?.funded_projects_count ?? "—",
      sub: d ? `₹${(d.funded_projects_amount / 100000).toFixed(1)} L` : undefined,
      real: true,
    },
    { label: "Patents", value: d?.patents_total ?? "—", real: true, onClick: () => router.push("/iqac/quality/faculty/patents") },
  ];

  if (overview.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonBlock className="h-[74px]" />
        <SkeletonStatTiles count={4} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <SkeletonBlock />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-pop-in">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[36px] font-extrabold tracking-[-.02em] text-ink">IQAC</h1>
        <p className="text-[15px] font-medium text-muted">
          Institutional quality metrics · {d?.students_total ?? "—"} students · {d?.departments_total ?? "—"} departments ·{" "}
          {d?.programmes_total ?? "—"} programmes
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <SegmentedTabs options={PERIOD_TABS} value={period} onChange={setPeriod} />
        <div className="ml-auto flex items-center gap-2.5 rounded-full border border-primary-border bg-surface px-4.5 py-2.5 text-[14px] font-bold text-primary">
          <span className="size-2 rounded-full bg-primary" />
          {flagCount} {flagCount === 1 ? "item" : "items"} flagged for review
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <HeroCard label="Total students" value={d?.students_total ?? "—"} foot="active on roll" onClick={() => router.push("/iqac/students")} />
        <HeroCard label="Total faculty" value={d?.faculty_total ?? "—"} foot="active teaching staff" onClick={() => router.push("/iqac/faculty")} />
        <HeroCard
          label="Placement %"
          value={d?.placement_percentage != null ? `${d.placement_percentage}%` : "—"}
          foot={`${d?.placed_count ?? 0} placed`}
          onClick={() => router.push("/iqac/quality/student/placements")}
        />
        <HeroCard label="Departments" value={d?.departments_total ?? "—"} foot={`${d?.programmes_total ?? "—"} programmes`} onClick={() => router.push("/iqac/departments")} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-card border border-border-default bg-surface">
          <div className="flex items-center gap-2.5 px-5 pb-3.5 pt-[18px]">
            <h3 className="text-[16px] font-extrabold text-ink">Domain data coverage</h3>
            <button type="button" onClick={() => router.push("/iqac/reports")} className="ml-auto text-[13px] font-bold text-primary hover:underline">
              Scorecard
            </button>
          </div>
          {domainCoverage.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => router.push(`/iqac/quality/${s.key}/${QUALITY_DOMAINS.find((q) => q.key === s.key)?.metrics[0].key}`)}
              className="hover-lift flex items-center gap-3.5 border-t border-divider px-5 py-3.5 text-left"
            >
              <span className="flex-1 text-[14px] font-bold text-ink">{s.label}</span>
              <span className="h-1.5 w-24 flex-none overflow-hidden rounded-full bg-surface-tint">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, s.pct)}%` }} />
              </span>
              <span className="w-16 text-right font-mono text-[13px] text-body">
                {s.realCount}/{s.total}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col rounded-card border border-border-default bg-surface">
          <div className="flex items-center gap-2.5 px-5 pb-3.5 pt-[18px]">
            <h3 className="text-[16px] font-extrabold text-ink">Needs attention</h3>
            <span className="ml-auto rounded-full bg-surface-tint px-2.5 py-1 text-[12px] font-bold text-primary">
              {d?.attention_flags.length ?? 0} flags
            </span>
          </div>
          {(d?.attention_flags ?? []).map((f, i) => {
            const dest = FLAG_DESTINATIONS[f.type];
            const Tag = dest ? "button" : "div";
            return (
              <Tag
                key={i}
                type={dest ? "button" : undefined}
                onClick={dest ? () => router.push(dest) : undefined}
                className={`flex gap-3 border-t border-divider px-5 py-3.5 text-left ${dest ? "hover-lift cursor-pointer" : ""}`}
              >
                <span className="mt-1.5 size-2 flex-none rounded-full bg-primary" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-ink">{f.title}</span>
                  <span className="text-[13px] font-medium text-subtle">{f.description}</span>
                </div>
              </Tag>
            );
          })}
          {d && d.attention_flags.length === 0 && <div className="px-5 py-6 text-center text-[13px] font-semibold text-subtle">Nothing flagged right now.</div>}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-card border border-border-default bg-surface p-5">
        <div className="flex items-center gap-3">
          <h3 className="text-[16px] font-extrabold text-ink">Institution at a glance</h3>
          <span className="text-[13px] font-semibold text-subtle">
            {glanceTiles.filter((t) => t.real).length} of {glanceTiles.length} tracked metrics real
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {glanceTiles.map((t) => (
            <GlanceTile key={t.label} label={t.label} value={t.value} sub={t.sub} foot={t.foot} />
          ))}
        </div>
      </div>
    </div>
  );
}
