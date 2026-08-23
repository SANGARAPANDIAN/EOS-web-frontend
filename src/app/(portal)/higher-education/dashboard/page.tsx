"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge, Button, Icon, ProgressBar, EmptyState, DataTable, SegmentedTabs, type DataTableColumn } from "@/components/ui";
import { useHigherEducationDashboard, type HigherEducationDashboard } from "@/modules/higher-education/api/dashboard";
import { useAnnouncements } from "@/modules/shared/api/announcements";
import { useDeleteAnnouncement } from "@/modules/higher-education/api/announcements";
import { NewAnnouncementModal, AnnouncementCard } from "@/modules/higher-education/components/AnnouncementParts";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatLongDate, greetingForHour } from "@/lib/utils/date";

/** Applied to every card/tile on this dashboard, matching the Transport dashboard's hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

const PERIOD_OPTIONS = [
  { key: "this_year", label: "This year" },
  { key: "last_year", label: "Last year" },
];

type DepartmentRow = HigherEducationDashboard["departmentRows"][number];

function formatRupees(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default function HigherEducationDashboardPage() {
  const { session } = useAuth();
  const dashboard = useHigherEducationDashboard();
  const announcements = useAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();
  const data = dashboard.data;
  const isLoading = dashboard.isLoading;
  const actionItemsCount = data?.needsAttention.length ?? 0;
  const [period, setPeriod] = useState("this_year");
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const recentAnnouncements = (announcements.data ?? []).slice(0, 3);

  const departmentColumns: DataTableColumn<DepartmentRow>[] = [
    { key: "dept", header: "Department", render: (row) => <span className="font-bold text-ink">{row.dept}</span> },
    { key: "aspirants", header: "Aspirants", align: "right", render: (row) => <span className="font-mono text-body">{row.aspirants}</span> },
    { key: "admits", header: "Admits", align: "right", render: (row) => <span className="font-mono text-ink">{row.admits}</span> },
    { key: "abroad", header: "Abroad", align: "right", render: (row) => <span className="font-mono text-body">{row.abroad}</span> },
    { key: "conv", header: "Conv.", align: "right", render: (row) => <span className="font-bold text-primary">{row.conversion}</span> },
  ];

  const maxDestinationCount = data ? Math.max(1, ...data.destinations.map((d) => d.count)) : 1;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">{greetingForHour()}, Dr. Kalaiselvi</h1>
        <p className="mt-1 text-[13px] text-muted">
          {formatLongDate()} · {isLoading ? "—" : data?.finalYearEligible ?? 0} final-year students eligible this cycle
        </p>
      </div>

      {data && !data.extended && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          Aspirant tracking columns aren&apos;t set up yet on student_higher_education — this dashboard will populate once they are.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedTabs options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        {data && actionItemsCount > 0 && (
          <div className="flex items-center gap-2 rounded-pill border border-border-accent bg-accent-50 px-4 py-2.5 text-[13.5px] font-bold text-primary-dark">
            <Icon name="error" size={18} />
            {actionItemsCount} item{actionItemsCount === 1 ? "" : "s"} need your action today
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Link href="/higher-education/aspirants" className={`min-w-0 block rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Registered aspirants</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="school" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : data?.kpis.aspirants.total ?? 0}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-primary">{isLoading ? "—" : data?.kpis.aspirants.withinIndia ?? 0}</span>
            <span className="text-[13px] text-muted">within India · {data?.kpis.aspirants.abroad ?? 0} overseas</span>
          </div>
        </Link>

        <Link href="/higher-education/applications" className={`min-w-0 block rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Applications filed</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="description" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : data?.kpis.applicationsFiled ?? "Not tracked yet"}
          </div>
          <div className="mt-3 text-[13px] text-muted">
            {data?.extended ? "aspirants who have submitted their application" : "enable aspirant tracking to see this"}
          </div>
        </Link>

        <div className={`min-w-0 rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Admits confirmed</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="verified" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : data?.kpis.admits?.total ?? "Not tracked yet"}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            {data?.kpis.admits && (
              <>
                <span className="text-[14px] font-extrabold text-primary">{data.kpis.admits.abroad}</span>
                <span className="text-[13px] text-muted">abroad · {data.kpis.admits.withinIndia} within India</span>
              </>
            )}
          </div>
        </div>

        <Link href="/higher-education/scholarships" className={`min-w-0 block rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14.5px] font-bold text-body">Scholarship secured</div>
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
              <Icon name="savings" size={19} className="text-primary" />
            </div>
          </div>
          <div className="mt-3.5 text-[40px] font-extrabold tracking-[-.03em] leading-none text-ink">
            {isLoading ? "—" : data?.kpis.scholarship ? formatRupees(data.kpis.scholarship.totalValue) : "Not tracked yet"}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            {data?.kpis.scholarship && (
              <>
                <span className="text-[14px] font-extrabold text-primary">{data.kpis.scholarship.fundedCount}</span>
                <span className="text-[13px] text-muted">students funded</span>
              </>
            )}
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-4 items-start">
        <Card className={HOVERABLE}>
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Higher education command center</h2>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[13px] font-semibold text-muted">Final-year eligible</div>
              <div className="mt-1 text-[26px] font-extrabold text-ink">{data?.commandCenter.finalYearEligible ?? 0}</div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-muted">Universities in play</div>
              <div className="mt-1 text-[26px] font-extrabold text-ink">{data?.commandCenter.universitiesInPlay ?? 0}</div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-muted">Highest scholarship</div>
              <div className="mt-1 text-[26px] font-extrabold text-ink">
                {data?.commandCenter.highestScholarship != null ? formatRupees(data.commandCenter.highestScholarship) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-muted">Average scholarship</div>
              <div className="mt-1 text-[26px] font-extrabold text-ink">
                {data?.commandCenter.averageScholarship != null ? formatRupees(data.commandCenter.averageScholarship) : "—"}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[13px] font-semibold text-muted">
              <span>Admissions confirmed</span>
              <span className="font-mono text-ink-soft">
                {data?.commandCenter.admissionsConfirmed ?? 0} / {data?.commandCenter.admissionsTotal ?? 0}
              </span>
            </div>
            <ProgressBar
              percent={
                data && data.commandCenter.admissionsTotal > 0
                  ? Math.round((data.commandCenter.admissionsConfirmed / data.commandCenter.admissionsTotal) * 100)
                  : 0
              }
              height={8}
              className="mt-2"
            />
          </div>
        </Card>

        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Needs attention</h2>
            <Badge tone="accentDark">{data?.needsAttention.length ?? 0} flags</Badge>
          </div>
          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.needsAttention.length === 0 ? (
            <EmptyState message="You're all caught up." />
          ) : (
            <div className="flex flex-col gap-3">
              {data.needsAttention.map((flag, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-[13.5px] font-bold text-ink">{flag.title}</div>
                    <div className="text-[12px] text-muted">{flag.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Announcements</h2>
            <Button variant="primarySmall" className="w-auto" onClick={() => setShowNewAnnouncement(true)}>
              New
            </Button>
          </div>
          {announcements.isLoading ? (
            <EmptyState message="Loading…" />
          ) : recentAnnouncements.length === 0 ? (
            <EmptyState message="No announcements yet." />
          ) : (
            <div className="flex flex-col gap-2.5 -mx-1">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="px-1">
                  <AnnouncementCard announcement={a} canDelete={a.posted_by_user_id === session?.user.id} onDelete={() => deleteAnnouncement.mutate(a.id)} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showNewAnnouncement && <NewAnnouncementModal onClose={() => setShowNewAnnouncement(false)} />}

      <div className="grid grid-cols-[1.35fr_1fr] gap-4 items-start">
        <Card className={HOVERABLE}>
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">Progression pipeline</h2>
          {!data?.progressionPipeline ? (
            <EmptyState message="Aspirant tracking not set up yet." />
          ) : (
            <div className="flex flex-col gap-3.5">
              {data.progressionPipeline.map((stage) => (
                <div key={stage.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[13.5px]">
                    <span className="font-semibold text-body">{stage.label}</span>
                    <span className="font-mono text-ink">{stage.count}</span>
                  </div>
                  <ProgressBar percent={stage.percent} height={7} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <h2 className="mb-4 text-[17px] font-extrabold text-ink">Destinations</h2>
          {!data || data.destinations.length === 0 ? (
            <EmptyState message="No destination countries recorded yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {data.destinations.map((d) => (
                <div key={d.country}>
                  <div className="mb-1.5 flex items-center justify-between text-[13.5px]">
                    <span className="font-semibold text-body">{d.country}</span>
                    <span className="font-mono text-ink">{d.count}</span>
                  </div>
                  <ProgressBar percent={Math.round((d.count / maxDestinationCount) * 100)} height={6} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        <Card className={HOVERABLE}>
          <div className="mb-1">
            <h2 className="text-[17px] font-extrabold text-ink">Deadlines this fortnight</h2>
            <p className="mt-0.5 text-[12.5px] text-subtle">Interview dates on record for the next 14 days</p>
          </div>
          {isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.interviewsUpcoming.length === 0 ? (
            <EmptyState message="No interviews scheduled in the next 14 days." />
          ) : (
            <div className="mt-2 flex flex-col">
              {data.interviewsUpcoming.map((item, i) => (
                <div key={i} className="flex items-center gap-3.5 border-t border-divider py-3 first:border-0">
                  <span className="w-[58px] shrink-0 font-mono text-[12.5px] text-primary">{item.date}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold text-ink">{item.studentName}</div>
                    {item.university && <div className="text-[12.5px] text-subtle">{item.university}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={`overflow-hidden p-0 ${HOVERABLE}`}>
          <div className="p-[18px_20px] pb-3">
            <h2 className="text-[17px] font-extrabold text-ink">Department-wise aspirants</h2>
            <p className="mt-0.5 text-[12.5px] text-subtle">Registered · admits confirmed · conversion</p>
          </div>
          <DataTable
            columns={departmentColumns}
            data={data?.departmentRows ?? []}
            rowKey={(row) => row.dept}
            emptyMessage={isLoading ? "Loading…" : "No aspirants recorded yet."}
            hoverableRows
          />
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 items-start">
        <Card className={HOVERABLE}>
          <h2 className="mb-3.5 text-[17px] font-extrabold text-ink">Test readiness</h2>
          {!data || data.testReadiness.length === 0 ? (
            <EmptyState message="No test scores recorded yet." />
          ) : (
            <div className="flex flex-col gap-3 text-[14px]">
              {data.testReadiness.map((row) => (
                <div key={row.testName} className="flex items-center justify-between gap-3">
                  <span className="text-muted">{row.testName}</span>
                  <span className="font-bold text-ink">
                    {row.enrolled} enrolled · mean {row.meanScore}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <h2 className="mb-3.5 text-[17px] font-extrabold text-ink">Counselling load</h2>
          <EmptyState message="Not tracked yet — no counselling-session data source exists." />
        </Card>

        <Card className={`border-border-accent ${HOVERABLE}`}>
          <h2 className="mb-3.5 text-[17px] font-extrabold text-primary">Documents vault</h2>
          {!data?.applicationReadiness ? (
            <EmptyState message="Aspirant tracking not set up yet." />
          ) : (
            <div className="flex flex-col gap-3 text-[14px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">SOPs finalized</span>
                <span className="font-bold text-primary">
                  {data.applicationReadiness.sopFinalized} / {data.applicationReadiness.total}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Recommendation letters issued</span>
                <span className="font-bold text-primary">
                  {data.applicationReadiness.recommendationIssued} / {data.applicationReadiness.total}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Research output recorded</span>
                <span className="font-bold text-primary">{data.applicationReadiness.researchRecorded}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Internship details recorded</span>
                <span className="font-bold text-primary">{data.applicationReadiness.internshipRecorded}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
