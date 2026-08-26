"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useCoeDashboardSummary, type DashboardPeriod } from "@/modules/coe/api/dashboard";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { exportToPdf } from "@/lib/utils/pdf-export";

const PERIOD_TABS: { key: DashboardPeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "cycle", label: "This cycle" },
  { key: "year", label: "This year" },
];

const QUICK_ACTIONS = [
  { label: "New exam", href: "/coe/exam-management" },
  { label: "New timetable", href: "/coe/timetables" },
  { label: "Allocate halls", href: "/coe/halls-seating" },
  { label: "Compose announcement", href: "/coe/notifications" },
  { label: "Publish results", href: "/coe/results-management" },
];

export default function CoeDashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("cycle");
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error } = useCoeDashboardSummary(period);

  useEffect(() => {
    if (!quickActionsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) setQuickActionsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickActionsOpen]);

  async function handleExport() {
    if (!data) return;
    setExporting(true);
    try {
      await exportToPdf({
        title: "Examination control centre",
        subtitle: `${data.totalCourses} courses · ${data.departmentsCount} departments`,
        sections: [
          {
            type: "keyValue",
            title: "Cycle summary",
            rows: [
              ["Total exams", `${data.exams.total}`],
              ["Registered students", `${data.registeredStudents.total}`],
              ["Eligible students", `${data.eligibleStudents.total}`],
              ["Pending valuation", `${data.pendingValuation.total - data.pendingValuation.valued}`],
              ["Pending results", `${data.pendingResults.total}`],
              ["Exam fee collected", `₹${data.examFeeCollected.total}`],
            ],
          },
          {
            type: "table",
            title: "Upcoming exams",
            columns: [
              { header: "Date", key: "date" },
              { header: "Course", key: "course" },
              { header: "Candidates", key: "candidates" },
              { header: "Halls", key: "halls" },
              { header: "Status", key: "status" },
            ],
            rows: data.upcomingExamsTable.map((r) => ({ date: r.date, course: `${r.subjectCode} · ${r.subjectName}`, candidates: r.candidates, halls: r.halls, status: r.status })),
          },
        ],
        filename: "coe-dashboard.pdf",
      });
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 animate-pop-in">
        <CoePageHeader title="Dashboard" subtitle="Loading dashboard..." />
        <Card className="p-4">
          <SkeletonRows count={10} />
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-5 animate-pop-in">
        <CoePageHeader title="Dashboard" subtitle="Error" />
        <Card className="p-5 text-red-500">Failed to load dashboard data. Ensure backend is running.</Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-pop-in pb-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Examination control centre</h1>
          <p className="text-[14px] text-muted mt-1">
            {data.totalCourses} courses · {data.departmentsCount} departments ·{" "}
            {data.upcomingExams.daysToFirstSitting > 0 ? `next sitting in ${data.upcomingExams.daysToFirstSitting} days` : "no upcoming sitting scheduled"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-surface border border-border-default p-1 text-[13px] font-semibold">
            {PERIOD_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setPeriod(t.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  period === t.key ? "bg-primary text-white shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" className="w-auto bg-white border-border-default text-ink" disabled={exporting} onClick={handleExport}>
            {exporting ? "Exporting…" : "Export"}
          </Button>
          <div ref={quickActionsRef} className="relative">
            <Button variant="primary" className="w-auto bg-primary flex items-center gap-1.5" onClick={() => setQuickActionsOpen((v) => !v)}>
              <Icon name="bolt" size={16} />
              Quick actions
            </Button>
            {quickActionsOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[200px] overflow-hidden rounded-card border border-border-default bg-surface py-1.5 shadow-modal">
                {QUICK_ACTIONS.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    onClick={() => setQuickActionsOpen(false)}
                    className="block px-4 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-nav-hover"
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Card 1 */}
        <StatCard href="/coe/exam-management" title="Total exams" icon={<Icon name="description" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.exams.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-blue-600">
            {data.exams.scheduledInCycle} scheduled in this cycle
          </div>
          <ProgressBar color="bg-blue-600" percentage={(data.exams.scheduledInCycle / (data.exams.total || 1)) * 100} />
          <div className="mt-3 text-[12.5px] text-muted">
            {data.exams.completed} completed · {data.exams.inDraft} in draft
          </div>
        </StatCard>

        {/* Card 2 */}
        <StatCard href="/coe/timetables" title="Upcoming exams" icon={<Icon name="calendar_month" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.upcomingExams.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-blue-600">
            {data.upcomingExams.daysToFirstSitting} days to the first sitting
          </div>
          <div className="mt-5 pt-0.5 text-[12.5px] text-muted">
            {data.upcomingExams.coursesCount} courses across {data.upcomingExams.programmesCount} programmes
          </div>
        </StatCard>

        {/* Card 3 */}
        <StatCard href="/coe/exam-registration" title="Registered students" icon={<Icon name="group" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.registeredStudents.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-green-600">
            {formatNumber(data.registeredStudents.confirmed)} confirmed of {formatNumber(data.registeredStudents.total)} applied
          </div>
          <ProgressBar color="bg-green-500" percentage={(data.registeredStudents.confirmed / (data.registeredStudents.total || 1)) * 100} />
          <div className="mt-3 text-[12.5px] text-muted">
            {formatNumber(data.registeredStudents.awaitingFee)} awaiting fee confirmation
          </div>
        </StatCard>

        {/* Card 4 */}
        <StatCard href="/coe/attendance-eligibility" title="Eligible students" icon={<Icon name="how_to_reg" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.eligibleStudents.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-green-600">
            {data.eligibleStudents.percentage.toFixed(1)}% of registered candidates
          </div>
          <ProgressBar color="bg-green-500" percentage={data.eligibleStudents.percentage} />
          <div className="mt-3 text-[12.5px] text-muted">
            {formatNumber(data.eligibleStudents.detained)} detained · {formatNumber(data.eligibleStudents.condonation)} on condonation
          </div>
        </StatCard>

        {/* Card 5 */}
        <StatCard href="/coe/exam-registration" title="Pending registrations" icon={<Icon name="hourglass_empty" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.pendingRegistrations.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-orange-600">
            {formatNumber(data.pendingRegistrations.closeIn3Days)} close in the next 3 days
          </div>
          <div className="mt-5 pt-0.5 text-[12.5px] text-muted">
            {formatNumber(data.pendingRegistrations.heldForFee)} held for fee · {formatNumber(data.pendingRegistrations.forApproval)} for approval
          </div>
        </StatCard>

        {/* Card 6 */}
        <StatCard href="/coe/halls-seating" title="Hall allocation" icon={<Icon name="map" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{data.hallAllocation.allocated} / {data.hallAllocation.total}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-blue-600">
            {formatNumber(data.hallAllocation.seatsAllotted)} seats allotted of {formatNumber(data.hallAllocation.seatsTotal)}
          </div>
          <ProgressBar color="bg-green-500" percentage={(data.hallAllocation.seatsAllotted / (data.hallAllocation.seatsTotal || 1)) * 100} />
          <div className="mt-3 text-[12.5px] text-muted">
            {data.hallAllocation.pendingPlans} seating plans still pending
          </div>
        </StatCard>

        {/* Card 7 */}
        <StatCard href="/coe/invigilators" title="Invigilation duties" icon={<Icon name="shield" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.invigilation.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-blue-600">
            {formatNumber(data.invigilation.acknowledged)} acknowledged of {formatNumber(data.invigilation.total)} assigned
          </div>
          <ProgressBar color="bg-green-500" percentage={(data.invigilation.acknowledged / (data.invigilation.total || 1)) * 100} />
          <div className="mt-3 text-[12.5px] text-muted">
            {data.invigilation.slotsOpen} slots open · {data.invigilation.conflicts} conflicts flagged
          </div>
        </StatCard>

        {/* Card 8 */}
        <StatCard href="/coe/exam-valuation" title="Pending valuation" icon={<Icon name="edit" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.pendingValuation.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-orange-600">
            {formatNumber(data.pendingValuation.valued)} scripts valued of {formatNumber(data.pendingValuation.total)}
          </div>
          <div className="mt-5 pt-0.5 text-[12.5px] text-muted">
            {data.pendingValuation.percentageRemaining.toFixed(1)}% remaining · {data.pendingValuation.activeValuators} valuators active
          </div>
        </StatCard>

        {/* Card 9 */}
        <StatCard href="/coe/results-management" title="Pending results" icon={<Icon name="checklist" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.pendingResults.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-blue-600">
            {formatNumber(data.pendingResults.computedCourses)} courses computed of {formatNumber(data.pendingResults.totalCourses)}
          </div>
          <div className="mt-5 pt-0.5 text-[12.5px] text-muted">
            {data.pendingResults.sheetsAtPassBoard} sheets at the pass board
          </div>
        </StatCard>

        {/* Card 10 */}
        <StatCard href="/coe/revaluation-retotaling" title="Revaluation requests" icon={<Icon name="autorenew" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.revaluation.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-green-600">
            {formatNumber(data.revaluation.feePaid)} fee paid of {formatNumber(data.revaluation.total)} applied
          </div>
          <ProgressBar color="bg-blue-600" percentage={(data.revaluation.feePaid / (data.revaluation.total || 1)) * 100} />
          <div className="mt-3 text-[12.5px] text-muted">
            {formatNumber(data.revaluation.unpaid)} unpaid · {formatNumber(data.revaluation.revised)} revised so far
          </div>
        </StatCard>

        {/* Card 11 */}
        <StatCard href="/coe/supplementary-arrear" title="Arrear students" icon={<Icon name="person_off" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">{formatNumber(data.arrearStudents.total)}</div>
          <div className="mt-2 text-[13.5px] font-semibold text-orange-600">
            {formatNumber(data.arrearStudents.registered)} registered for the arrear sitting
          </div>
          <ProgressBar color="bg-blue-600" percentage={(data.arrearStudents.registered / (data.arrearStudents.total || 1)) * 100} />
          <div className="mt-3 text-[12.5px] text-muted">
            {formatNumber(data.arrearStudents.notRegistered)} not yet registered · closes {data.arrearStudents.closesOn}
          </div>
        </StatCard>

        {/* Card 12 */}
        <StatCard href="/coe/exam-finance" title="Exam fee collected" icon={<Icon name="payments" size={16} className="text-primary" />}>
          <div className="text-[32px] font-extrabold text-ink leading-tight">₹{(data.examFeeCollected.total / 10000000).toFixed(2)} Cr</div>
          <div className="mt-2 text-[13.5px] font-semibold text-green-600">
            {data.examFeeCollected.percentage.toFixed(1)}% of ₹{( (data.examFeeCollected.total + data.examFeeCollected.outstanding) / 10000000).toFixed(2)} Cr demand raised
          </div>
          <ProgressBar color="bg-green-500" percentage={data.examFeeCollected.percentage} />
          <div className="mt-3 text-[12.5px] text-muted">
            ₹{(data.examFeeCollected.outstanding / 100000).toFixed(1)} L outstanding from {formatNumber(data.examFeeCollected.outstandingStudents)} students
          </div>
        </StatCard>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold text-ink">Exam cycle progress</h2>
          <span className="text-[12.5px] text-muted">Stage {data.examCycle.currentStage} of {data.examCycle.totalStages}</span>
        </div>
        <div className="mt-4 grid grid-cols-9 gap-2">
          {data.examCycle.stages.map((s) => (
            <div key={s.key} className="flex flex-col gap-1.5">
              <div
                className={cn(
                  "h-[6px] rounded-full",
                  s.status === "complete" ? "bg-primary" : s.status === "current" ? "bg-blue-300" : "bg-surface-tint",
                )}
              />
              <span className={cn("text-[11px] font-semibold leading-tight", s.status === "pending" ? "text-subtle" : "text-ink-soft")}>{s.label}</span>
              <span className="text-[10.5px] leading-tight text-subtle">{s.sublabel}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 items-start">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Upcoming exams</span>
            <span className="text-[12.5px] text-muted">{data.upcomingExamsTable.length} sessions</span>
          </div>
          {data.upcomingExamsTable.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No upcoming sessions scheduled yet.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-3 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[80px]">Date</div>
                <div className="flex-1">Course</div>
                <div className="w-[90px] text-right">Candidates</div>
                <div className="w-[60px] text-right">Halls</div>
                <div className="w-[90px] text-right">Status</div>
              </div>
              {data.upcomingExamsTable.map((row, i) => (
                <div key={`${row.date}-${row.subjectCode}-${i}`} className="flex items-center gap-3 border-b border-divider px-5 py-3 last:border-0">
                  <div className="w-[80px] text-[12.5px] font-semibold text-ink">{row.date.slice(8, 10)} {new Date(row.date).toLocaleDateString("en-IN", { month: "short" })}</div>
                  <div className="flex-1">
                    <span className="text-[13px] font-extrabold text-primary">{row.subjectCode}</span>{" "}
                    <span className="text-[12.5px] text-ink">{row.subjectName}</span>
                  </div>
                  <div className="w-[90px] text-right text-[12.5px] text-ink">{formatNumber(row.candidates)}</div>
                  <div className="w-[60px] text-right text-[12.5px] text-ink">{row.halls}</div>
                  <div className="w-[90px] text-right">
                    <span
                      className={cn(
                        "rounded-[6px] px-2 py-0.5 text-[10.5px] font-bold uppercase",
                        row.status === "published" ? "bg-green-50 text-green-700" : row.status === "scheduled" ? "bg-blue-50 text-blue-700" : "bg-surface-tint text-subtle",
                      )}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Needs your action</span>
            {data.needsYourAction.length > 0 && <span className="text-[12px] font-bold text-danger-fg">{data.needsYourAction.length} open</span>}
          </div>
          {data.needsYourAction.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">Nothing needs your attention right now.</p>
          ) : (
            <div className="flex flex-col">
              {data.needsYourAction.map((item) => (
                <div key={item.key} className="border-b border-divider px-5 py-3.5 last:border-0">
                  <div className="text-[12px] font-extrabold uppercase tracking-wide text-primary">{item.title}</div>
                  <p className="mt-1 text-[12.5px] text-ink">{item.description}</p>
                  <Link href={item.href} className="mt-1.5 inline-block text-[12px] font-bold text-primary hover:underline">
                    Open →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-4 items-start">
        <Card>
          <span className="text-[15px] font-extrabold text-ink">Valuation progress by department</span>
          {data.valuationByDepartment.length === 0 ? (
            <p className="mt-3 text-[13px] text-subtle">No script bundles allotted yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {data.valuationByDepartment.map((d) => (
                <div key={d.departmentCode}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-bold text-ink">{d.departmentCode}</span>
                    <span className="text-muted">
                      {d.valued}/{d.total} · {d.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-pill bg-surface-tint">
                    <div className="h-full rounded-pill bg-primary" style={{ width: `${Math.min(100, d.percentage)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <span className="text-[15px] font-extrabold text-ink">Exam fee collection</span>
          <p className="mt-0.5 text-[12px] text-subtle">Real paid transactions by month</p>
          {data.feeCollectionTrend.length === 0 ? (
            <p className="mt-3 text-[13px] text-subtle">No fee transactions recorded yet.</p>
          ) : (
            <div className="mt-4 flex items-end gap-3" style={{ height: 110 }}>
              {(() => {
                const max = Math.max(1, ...data.feeCollectionTrend.map((m) => m.total));
                return data.feeCollectionTrend.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="w-full rounded-t-[4px] bg-primary" style={{ height: `${Math.max(4, (m.total / max) * 90)}px` }} />
                    <span className="text-[10.5px] text-subtle">{m.month.slice(5, 7)}/{m.month.slice(2, 4)}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-divider px-5 py-3.5 text-[15px] font-extrabold text-ink">Recent activity</div>
        {data.recentActivity.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No recent activity yet.</p>
        ) : (
          <div className="flex flex-col">
            {data.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-divider px-5 py-3 last:border-0">
                <span className="w-[52px] shrink-0 text-[11.5px] text-subtle">
                  {new Date(a.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="w-[90px] shrink-0 rounded-[6px] bg-surface-tint px-2 py-0.5 text-center text-[10px] font-bold uppercase text-muted">{a.type}</span>
                <span className="text-[12.5px] text-ink">{a.description}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ href, title, icon, children }: { href: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="block">
      <Card className="p-5 flex flex-col justify-between shadow-sm border border-border-default bg-white rounded-xl h-full transition-shadow hover:shadow-md hover:border-border-accent cursor-pointer">
        <div className="flex items-center justify-between mb-4 text-muted">
          <h3 className="text-[13.5px] font-medium text-ink-soft">{title}</h3>
          <div className="p-1.5 bg-blue-50 rounded-md">
            {icon}
          </div>
        </div>
        <div>
          {children}
        </div>
      </Card>
    </Link>
  );
}

function ProgressBar({ color, percentage }: { color: string; percentage: number }) {
  return (
    <div className="h-[4px] w-full bg-surface-tint rounded-full mt-2.5 mb-1 overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} />
    </div>
  );
}
