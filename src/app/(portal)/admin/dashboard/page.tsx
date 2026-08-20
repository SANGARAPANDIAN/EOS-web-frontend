"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/types/api";
import { Button, PageHeader, KpiCard, SectionCard, PendingNotice, SegmentedPillToggle } from "@/modules/admin/components/ui";
import { DonutChart, VerticalBarChart, HorizontalBarChart } from "@/modules/admin/components/ui/charts";
import { QuickActionsCard } from "@/modules/admin/components/dashboard/QuickActionsCard";
import {
  useActiveStudentCount,
  useAdmissionsPipeline,
  useFacultyCount,
  useFacultyWorkforceComposition,
  useFinanceOverview,
  useStudentsByBatch,
  useStudentsByDepartment,
  useStudentStatusDistribution,
} from "@/modules/admin/api/dashboard";
import { useAdmittedCutoffSummary } from "@/modules/admin/api/admissions";
import { useHostelDashboardSummary, usePlacementStats } from "@/modules/admin/api/analytics";
import { currencyShort, monthShortLabel, percent1 } from "@/modules/admin/lib/format";

const QUICK_ACTIONS = [
  { icon: "person_add", label: "Admit student", note: "Start a new admission" },
  { icon: "currency_rupee", label: "Collect fee", note: "Record a payment" },
  { icon: "workspace_premium", label: "Issue certificate", note: "Bonafide, conduct, transcript" },
  { icon: "send", label: "Send notice", note: "Email / SMS / push" },
];

const ATTENDANCE_RISK_PENDING =
  "Needs a bulk attendance-summary endpoint — the only attendance aggregate today is per-student (GET /students/:id/attendance-summary), and calling it once per enrolled student to find who's below 75% isn't a real institution-wide figure, it's N+1 requests wearing a chart.";
const ACTIVITY_NOT_AVAILABLE = "No audit/event table exists in the schema, so this feed has no real source yet.";

const TIME_RANGES = [
  { value: "today", label: "Today" },
  { value: "term", label: "This term" },
  { value: "year", label: "This year" },
] as const;
type TimeRange = (typeof TIME_RANGES)[number]["value"];

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("term");
  const finance = useFinanceOverview();
  const facultyCount = useFacultyCount();
  const activeStudents = useActiveStudentCount();
  const statusDistribution = useStudentStatusDistribution();
  const studentsByDept = useStudentsByDepartment();
  const studentsByBatch = useStudentsByBatch();
  const admissions = useAdmissionsPipeline();
  const admittedCutoff = useAdmittedCutoffSummary();
  const placement = usePlacementStats();
  const hostel = useHostelDashboardSummary();
  const workforce = useFacultyWorkforceComposition();

  const greetingName = session?.user.email ? session.user.email.split("@")[0] : "there";
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const kpis = finance.data?.executiveKPIs;
  const monthlyTrend = finance.data?.financialAnalytics.monthlyCollectionTrend ?? [];
  const departmentOutstanding = finance.data?.financialAnalytics.departmentOutstanding ?? [];
  const paymentStatus = finance.data?.financialAnalytics.paymentStatusDistribution ?? [];

  const financeError =
    finance.error instanceof ApiError ? finance.error.message : finance.error ? "Failed to load finance data." : null;

  const pipeline = admissions.data;
  const cutoffSummary = admittedCutoff.data;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Good ${timeOfDay}, ${greetingName}`}
        description="Institution overview · Admin Console"
        actions={
          <>
            {/* Every figure below is a point-in-time total, not a windowed query — no
                endpoint here supports "as of today" vs "this year" yet, so this only
                changes which segment looks selected. Kept visible rather than removed
                so the affordance isn't silently missing. */}
            <SegmentedPillToggle options={[...TIME_RANGES]} value={timeRange} onChange={setTimeRange} />
            <Button variant="secondary" disabled title="Export board — not built yet">
              Export board
            </Button>
            <Button variant="primary" disabled title="Quick actions — see the panel below for now">
              Quick actions
            </Button>
          </>
        }
      />

      {financeError && (
        <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          {financeError}
        </div>
      )}

      {/* ---- Core institution KPIs ---- */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active students"
          icon="groups"
          value={activeStudents.data !== undefined ? activeStudents.data : activeStudents.isLoading ? "…" : "—"}
        />
        <KpiCard
          label="Fee collected"
          icon="account_balance_wallet"
          value={kpis ? currencyShort(kpis.totalCollected) : finance.isLoading ? "…" : "—"}
          delta={kpis ? `+${percent1(kpis.collectionPercentage)}` : undefined}
          sub={kpis ? "of demand" : undefined}
        />
        <KpiCard
          label="Fee outstanding"
          icon="warning"
          value={kpis ? currencyShort(kpis.totalOutstanding) : finance.isLoading ? "…" : "—"}
          delta={kpis ? String(kpis.pendingEducationLoanDD) : undefined}
          sub={kpis ? "loan DDs pending" : undefined}
        />
        <KpiCard
          label="Faculty on roll"
          icon="badge"
          value={facultyCount.data ? facultyCount.data.meta.total : facultyCount.isLoading ? "…" : "—"}
        />
      </div>

      {/* ---- Cross-module KPIs — each backed by a real endpoint another admin page
          already relies on (admissions pipeline, faculty attendance overview,
          placement stats, hostel summary), surfaced here as the at-a-glance layer. ---- */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Admissions this cycle"
          icon="person_add"
          value={pipeline ? pipeline.total : admissions.isLoading ? "…" : "—"}
          delta={pipeline ? String(pipeline.admissionConfirmed) : undefined}
          sub={pipeline ? "confirmed" : undefined}
        />
        <KpiCard
          label="Average cutoff"
          icon="calculate"
          value={
            cutoffSummary?.average_cutoff != null
              ? cutoffSummary.average_cutoff
              : admittedCutoff.isLoading
                ? "…"
                : "—"
          }
          delta={cutoffSummary ? String(cutoffSummary.admitted_count) : undefined}
          sub={cutoffSummary ? "students admitted" : undefined}
        />
        <KpiCard
          label="Placement rate"
          icon="work"
          value={placement.data ? percent1(placement.data.placementRate) : placement.isLoading ? "…" : "—"}
          delta={placement.data ? String(placement.data.studentsPlaced) : undefined}
          sub={placement.data ? "students placed" : undefined}
        />
        <KpiCard
          label="Hostel occupancy"
          icon="bed"
          value={hostel.data ? percent1(hostel.data.occupancy_pct) : hostel.isLoading ? "…" : "—"}
          delta={hostel.data ? String(hostel.data.beds_occupied) : undefined}
          sub={hostel.data ? `of ${hostel.data.beds_total} beds` : undefined}
        />
      </div>

      {/* ---- Enrolment by batch + status distribution ---- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Enrolment by batch" subtitle="Total headcount per admission batch, oldest to newest">
            {studentsByBatch.data && studentsByBatch.data.length > 0 ? (
              <VerticalBarChart data={studentsByBatch.data} height={180} />
            ) : (
              <PendingNotice reason={studentsByBatch.isLoading ? "Loading…" : "No students recorded yet."} height={180} />
            )}
          </SectionCard>
        </div>
        <SectionCard title="Distribution" subtitle="By status">
          {statusDistribution.data && statusDistribution.data.length > 0 ? (
            <DonutChart
              data={statusDistribution.data}
              centerLabel="Students"
              centerValue={statusDistribution.data.reduce((sum, s) => sum + s.value, 0)}
            />
          ) : (
            <PendingNotice reason={statusDistribution.isLoading ? "Loading…" : "No students recorded yet."} height={160} />
          )}
        </SectionCard>
      </div>

      {/* ---- Admissions pipeline + fee collection ---- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Admissions pipeline" subtitle="Every application this cycle, by current status">
          {pipeline && pipeline.total > 0 ? (
            <DonutChart
              data={[
                { label: "Applied", value: pipeline.applied, color: "#8aa0c6" },
                { label: "Fees paid", value: pipeline.feesPaid, color: "#2f63cc" },
                { label: "Confirmed", value: pipeline.admissionConfirmed, color: "#1d47ae" },
                { label: "Cancelled", value: pipeline.cancelled, color: "#eaf0fb" },
              ].filter((s) => s.value > 0)}
              centerLabel="Applications"
              centerValue={pipeline.total}
            />
          ) : (
            <PendingNotice reason={admissions.isLoading ? "Loading…" : "No admission applications recorded yet."} height={180} />
          )}
        </SectionCard>
        <SectionCard title="Fee collection" subtitle="₹ collected per month, from real payment records">
          {monthlyTrend.length > 0 ? (
            <VerticalBarChart
              data={monthlyTrend.map((m) => ({ label: monthShortLabel(m.month), value: Number(m.totalCollected) }))}
              height={180}
              format={(v) => currencyShort(v)}
            />
          ) : (
            <PendingNotice reason={finance.isLoading ? "Loading…" : "No fee payments recorded yet."} height={180} />
          )}
        </SectionCard>
      </div>

      {/* ---- Action queue + department fees / quick actions + workforce ---- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <SectionCard
            title="Admissions awaiting action"
            subtitle="Applications not yet fully confirmed"
            actions={
              <Link href="/admin/students/admit" className="text-sm font-semibold text-admin-primary hover:text-admin-primary-dark">
                Open pipeline →
              </Link>
            }
          >
            {pipeline && (pipeline.applied > 0 || pipeline.feesPaid > 0) ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-admin-body">Just applied — awaiting fee payment</span>
                  <span className="font-mono text-lg font-semibold text-admin-ink tabular-nums">{pipeline.applied}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-admin-body">Fees paid — awaiting admission confirmation</span>
                  <span className="font-mono text-lg font-semibold text-admin-ink tabular-nums">{pipeline.feesPaid}</span>
                </div>
              </div>
            ) : (
              <PendingNotice reason={admissions.isLoading ? "Loading…" : "Nothing waiting — every application is confirmed or cancelled."} height={100} />
            )}
          </SectionCard>

          <SectionCard title="Fee outstanding by department" subtitle="Real data from /finance-overview" bodyClassName="p-5">
            {departmentOutstanding.length > 0 ? (
              <div className="flex flex-col gap-3">
                {departmentOutstanding.map((d) => (
                  <div key={d.department} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-admin-body">{d.department}</span>
                    <span className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="text-admin-subtle">{currencyShort(d.totalDemand)} demand</span>
                      <span className="font-semibold text-admin-warning-fg">{currencyShort(d.totalOutstanding)} due</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <PendingNotice reason={finance.isLoading ? "Loading…" : "No outstanding fee demand recorded."} height={120} />
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5">
          <QuickActionsCard actions={QUICK_ACTIONS} />
          <SectionCard title="Faculty workforce" subtitle="On roll, by employment status">
            {workforce.data && workforce.data.length > 0 ? (
              <HorizontalBarChart data={workforce.data} />
            ) : (
              <PendingNotice reason={workforce.isLoading ? "Loading…" : "No faculty recorded yet."} height={160} />
            )}
          </SectionCard>
        </div>
      </div>

      {/* ---- Department distribution + honest gaps ---- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Students by department" subtitle="Active headcount per department">
          {studentsByDept.data && studentsByDept.data.length > 0 ? (
            <HorizontalBarChart data={studentsByDept.data} />
          ) : (
            <PendingNotice reason={studentsByDept.isLoading ? "Loading…" : "No students recorded yet."} height={160} />
          )}
        </SectionCard>
        <SectionCard title="Attendance risk" subtitle="Cohorts below the 75% threshold">
          <PendingNotice reason={ATTENDANCE_RISK_PENDING} height={160} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Recent activity" subtitle="Not available">
          <PendingNotice reason={ACTIVITY_NOT_AVAILABLE} height={160} />
        </SectionCard>
        {paymentStatus.length > 0 && (
          <SectionCard title="Fee demand status" subtitle="Share of fee-demand mappings by payment status">
            <DonutChart
              data={paymentStatus.map((p) => ({
                label: p.status === "paid" ? "Paid" : p.status === "partial" ? "Partially paid" : "Pending",
                value: p.count,
                color: p.status === "paid" ? "#1d47ae" : p.status === "partial" ? "#8aa0c6" : "#eaf0fb",
              }))}
              centerLabel="Demands"
              centerValue={paymentStatus.reduce((sum, p) => sum + p.count, 0)}
            />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
