"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/types/api";
import { Button, Dropdown, PageHeader, KpiCard, SectionCard, PendingNotice, SegmentedPillToggle } from "@/modules/admin/components/ui";
import { DonutChart, VerticalBarChart, HorizontalBarChart } from "@/modules/admin/components/ui/charts";
import { Icon } from "@/components/ui/Icon";
import { Skeleton, SkeletonStatTiles } from "@/components/ui/Skeleton";
import {
  useActiveStudentCount,
  useAdmissionsPipeline,
  useFacultyCount,
  useFacultyWorkforceComposition,
  useFinanceOverview,
  useNewApplicationsInRange,
  useStudentsByBatch,
  useStudentsByDepartment,
  useStudentStatusDistribution,
} from "@/modules/admin/api/dashboard";
import { useAdmittedCutoffSummary } from "@/modules/admin/api/admissions";
import { useHostelDashboardSummary, usePlacementStats } from "@/modules/admin/api/analytics";
import { usePendingServiceRequestCount } from "@/modules/admin/api/serviceRequests";
import { currencyShort, monthShortLabel, percent1 } from "@/modules/admin/lib/format";

const ATTENDANCE_RISK_PENDING =
  "Needs a bulk attendance-summary endpoint — the only attendance aggregate today is per-student (GET /students/:id/attendance-summary), and calling it once per enrolled student to find who's below 75% isn't a real institution-wide figure, it's N+1 requests wearing a chart.";
const ACTIVITY_NOT_AVAILABLE = "No audit/event table exists in the schema, so this feed has no real source yet.";

const TIME_RANGES = [
  { value: "today", label: "Today" },
  { value: "term", label: "This term" },
  { value: "year", label: "This year" },
] as const;
type TimeRange = (typeof TIME_RANGES)[number]["value"];

/**
 * Real institution-calendar boundaries for each toggle value, reusing the
 * same Jun-start academic-year / Jul-Dec odd-semester convention every
 * other module's date helpers already use (see lib/utils/date.ts) rather
 * than inventing a second convention just for this page.
 */
function rangeBounds(range: TimeRange, now: Date): { from: string; to: string; label: string } {
  const to = now.toISOString();
  if (range === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from: from.toISOString(), to, label: "today" };
  }
  if (range === "term") {
    const isOddSemester = now.getMonth() >= 6; // Jul(6)-Dec
    const from = isOddSemester ? new Date(now.getFullYear(), 6, 1) : new Date(now.getFullYear(), 0, 1);
    return { from: from.toISOString(), to, label: "this term" };
  }
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1; // academic year starts June
  const from = new Date(startYear, 5, 1);
  return { from: from.toISOString(), to, label: "this year" };
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const content = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("term");
  const now = useMemo(() => new Date(), []);
  const range = useMemo(() => rangeBounds(timeRange, now), [timeRange, now]);

  const finance = useFinanceOverview({ from: range.from, to: range.to });
  const facultyCount = useFacultyCount();
  const activeStudents = useActiveStudentCount();
  const statusDistribution = useStudentStatusDistribution();
  const studentsByDept = useStudentsByDepartment();
  const studentsByBatch = useStudentsByBatch();
  const admissions = useAdmissionsPipeline();
  const newApplications = useNewApplicationsInRange(range.from, range.to);
  const admittedCutoff = useAdmittedCutoffSummary();
  const placement = usePlacementStats();
  const hostel = useHostelDashboardSummary();
  const workforce = useFacultyWorkforceComposition();
  const pendingSop = usePendingServiceRequestCount();

  const greetingName = session?.user.email ? session.user.email.split("@")[0] : "there";
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const kpis = finance.data?.executiveKPIs;
  const monthlyTrend = finance.data?.financialAnalytics.monthlyCollectionTrend ?? [];
  const departmentOutstanding = finance.data?.financialAnalytics.departmentOutstanding ?? [];
  const paymentStatus = finance.data?.financialAnalytics.paymentStatusDistribution ?? [];

  const financeError =
    finance.error instanceof ApiError ? finance.error.message : finance.error ? "Failed to load finance data." : null;

  const pipeline = admissions.data;
  const cutoffSummary = admittedCutoff.data;

  function handleExport() {
    downloadCsv(`admin-dashboard-${timeRange}-${now.toISOString().slice(0, 10)}.csv`, [
      ["Metric", "Value", "Detail"],
      ["Active students", activeStudents.data ?? "", ""],
      [`Fee collected (${range.label})`, kpis?.collectedInRange ? currencyShort(kpis.collectedInRange) : "", kpis?.paymentCountInRange !== undefined ? `${kpis.paymentCountInRange} payments` : ""],
      ["Fee outstanding (current)", kpis ? currencyShort(kpis.totalOutstanding) : "", kpis ? `${kpis.pendingEducationLoanDD} loan DDs pending` : ""],
      ["Faculty on roll", facultyCount.data ? facultyCount.data.meta.total : "", ""],
      ["Admissions this cycle (current)", pipeline ? pipeline.total : "", pipeline ? `${pipeline.admissionConfirmed} confirmed` : ""],
      [`New applications (${range.label})`, newApplications.data ?? "", ""],
      ["Average cutoff (current)", cutoffSummary?.average_cutoff ?? "", cutoffSummary ? `${cutoffSummary.admitted_count} students admitted` : ""],
      ["Placement rate (current)", placement.data ? percent1(placement.data.placementRate) : "", placement.data ? `${placement.data.studentsPlaced} placed` : ""],
      ["Hostel occupancy (current)", hostel.data ? percent1(hostel.data.occupancy_pct) : "", hostel.data ? `${hostel.data.beds_occupied} of ${hostel.data.beds_total} beds` : ""],
      ["SOP requests awaiting review", pendingSop.data ?? "", ""],
      [],
      ["Students by department", "Active headcount", ""],
      ...(studentsByDept.data ?? []).map((d) => [d.label, d.value, ""]),
      [],
      ["Enrolment by batch", "Headcount", ""],
      ...(studentsByBatch.data ?? []).map((b) => [b.label, b.value, ""]),
      [],
      ["Fee outstanding by department", "Demand", "Outstanding"],
      ...departmentOutstanding.map((d) => [d.department, currencyShort(d.totalDemand), currencyShort(d.totalOutstanding)]),
    ]);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Good ${timeOfDay}, ${greetingName}`}
        description="Institution overview · Admin Console"
        actions={
          <>
            {/* Drives every windowed figure below (Fee collected, New
                applications) via real from/to query params — see
                rangeBounds(). Figures with no natural time dimension (a
                current headcount, a current outstanding balance, a current
                occupancy %) are intentionally unaffected by this toggle;
                they're "as of now" by definition, not a period flow. */}
            <SegmentedPillToggle options={[...TIME_RANGES]} value={timeRange} onChange={setTimeRange} />
            <Button variant="secondary" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export board
            </Button>
            <Dropdown
              align="right"
              trigger={
                <Button variant="primary">
                  Quick actions
                  <Icon name="expand_more" size={16} />
                </Button>
              }
              items={[
                { key: "admit", label: "Admit student", onSelect: () => router.push("/admin/students/admit") },
                { key: "certificate", label: "Issue certificate", onSelect: () => router.push("/admin/bonafide-requests") },
              ]}
            />
          </>
        }
      />

      {financeError && (
        <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          {financeError}
        </div>
      )}

      {/* ---- Core institution KPIs ---- */}
      {(activeStudents.isLoading && activeStudents.data === undefined) ||
      (finance.isLoading && !finance.data) ||
      (facultyCount.isLoading && !facultyCount.data) ? (
        <SkeletonStatTiles count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Active students"
            icon="groups"
            value={activeStudents.data !== undefined ? activeStudents.data : "—"}
            href="/admin/students"
          />
          <KpiCard
            label="Fee collected"
            icon="account_balance_wallet"
            value={kpis?.collectedInRange !== undefined ? currencyShort(kpis.collectedInRange) : "—"}
            delta={kpis?.paymentCountInRange !== undefined ? String(kpis.paymentCountInRange) : undefined}
            sub={kpis?.paymentCountInRange !== undefined ? `payment${kpis.paymentCountInRange === 1 ? "" : "s"} ${range.label}` : undefined}
          />
          <KpiCard
            label="Fee outstanding"
            icon="warning"
            value={kpis ? currencyShort(kpis.totalOutstanding) : "—"}
            delta={kpis ? String(kpis.pendingEducationLoanDD) : undefined}
            sub={kpis ? "loan DDs pending" : undefined}
          />
          <KpiCard
            label="Faculty on roll"
            icon="badge"
            value={facultyCount.data ? facultyCount.data.meta.total : "—"}
            href="/admin/faculty"
          />
        </div>
      )}

      {/* ---- Cross-module KPIs — each backed by a real endpoint another admin page
          already relies on (admissions pipeline, faculty attendance overview,
          placement stats, hostel summary), surfaced here as the at-a-glance layer. ---- */}
      {(admissions.isLoading && !admissions.data) ||
      (admittedCutoff.isLoading && !admittedCutoff.data) ||
      (placement.isLoading && !placement.data) ||
      (hostel.isLoading && !hostel.data) ||
      (pendingSop.isLoading && pendingSop.data === undefined) ? (
        <SkeletonStatTiles count={5} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Admissions this cycle"
            icon="person_add"
            value={pipeline ? pipeline.total : "—"}
            delta={pipeline ? String(pipeline.admissionConfirmed) : undefined}
            sub={pipeline ? "confirmed" : undefined}
            href="/admin/students/admit"
          />
          <KpiCard
            label="Average cutoff"
            icon="calculate"
            value={cutoffSummary?.average_cutoff != null ? cutoffSummary.average_cutoff : "—"}
            delta={cutoffSummary ? String(cutoffSummary.admitted_count) : undefined}
            sub={cutoffSummary ? "students admitted" : undefined}
            href="/admin/students/admit"
          />
          <KpiCard
            label="Placement rate"
            icon="work"
            value={placement.data ? percent1(placement.data.placementRate) : "—"}
            delta={placement.data ? String(placement.data.studentsPlaced) : undefined}
            sub={placement.data ? "students placed" : undefined}
          />
          <KpiCard
            label="Hostel occupancy"
            icon="bed"
            value={hostel.data ? percent1(hostel.data.occupancy_pct) : "—"}
            delta={hostel.data ? String(hostel.data.beds_occupied) : undefined}
            sub={hostel.data ? `of ${hostel.data.beds_total} beds` : undefined}
          />
          <KpiCard
            label="SOP requests"
            icon="handyman"
            value={pendingSop.data !== undefined ? pendingSop.data : "—"}
            sub="awaiting review"
            href="/admin/sop-requests"
          />
        </div>
      )}

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
            {pipeline ? (
              <div className="flex flex-col gap-3">
                {pipeline.applied > 0 || pipeline.feesPaid > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-admin-body">Just applied — awaiting fee payment</span>
                      <span className="font-mono text-lg font-semibold text-admin-ink tabular-nums">{pipeline.applied}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-admin-body">Fees paid — awaiting admission confirmation</span>
                      <span className="font-mono text-lg font-semibold text-admin-ink tabular-nums">{pipeline.feesPaid}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-admin-subtle">Nothing waiting — every application is confirmed or cancelled.</p>
                )}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-admin-body">New applications — {range.label}</span>
                  <span className="font-mono text-lg font-semibold text-admin-ink tabular-nums">
                    {newApplications.isLoading ? (
                      <Skeleton className="inline-block h-5 w-8 align-middle" />
                    ) : (
                      (newApplications.data ?? "—")
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <PendingNotice reason={admissions.isLoading ? "Loading…" : "No admission applications recorded yet."} height={100} />
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

          <SectionCard
            title="SOP requests awaiting review"
            subtitle="Service requests submitted by department secretaries"
            actions={
              <Link href="/admin/sop-requests" className="text-sm font-semibold text-admin-primary hover:text-admin-primary-dark">
                Review requests →
              </Link>
            }
          >
            {pendingSop.data !== undefined && pendingSop.data > 0 ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-admin-body">Pending your decision</span>
                <span className="font-mono text-lg font-semibold text-admin-ink tabular-nums">{pendingSop.data}</span>
              </div>
            ) : (
              <PendingNotice reason={pendingSop.isLoading ? "Loading…" : "Nothing waiting — every SOP request is decided."} height={80} />
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5">
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
