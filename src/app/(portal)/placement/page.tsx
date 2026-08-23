"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { useDashboardSummary } from "@/modules/placement/hooks/useDashboardSummary";
import { PlacementFunnelChart } from "@/modules/placement/components/dashboard/PlacementFunnelChart";
import { DepartmentPlacementRates } from "@/modules/placement/components/dashboard/DepartmentPlacementRates";
import { PackageDistributionDonut } from "@/modules/placement/components/dashboard/PackageDistributionDonut";
import { SixYearTrendChart } from "@/modules/placement/components/dashboard/SixYearTrendChart";
import { UpcomingDrivesCard } from "@/modules/placement/components/dashboard/UpcomingDrivesCard";
import { TopRecruitersCard } from "@/modules/placement/components/dashboard/TopRecruitersCard";
import { NeedsAttentionCard } from "@/modules/placement/components/dashboard/NeedsAttentionCard";

export default function PlacementDashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useDashboardSummary();

  const eligiblePlacedPct =
    data && data.eligibleStudentsTotal > 0 ? Math.round((data.studentsPlaced / data.eligibleStudentsTotal) * 1000) / 10 : 0;

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Placement Dashboard</h1>
          <p className="mt-1.5 text-[13px] text-muted">Drives, students, recruiters and outcomes for this placement cycle.</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary">Export</Button>
          <Button variant="primarySmall" onClick={() => router.push("/placement/drives/new")}>
            Create drive
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[110px] animate-pulse rounded-card border border-border-default bg-surface-tint" />
          ))}
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
            <StatCard
              label="Registered students"
              value={data.eligibleStudentsTotal.toLocaleString("en-IN")}
              sub={`Across ${data.placementRateByDepartment.length} departments`}
              barPercent={100}
            />
            <StatCard
              label="Students placed"
              value={data.studentsPlaced.toLocaleString("en-IN")}
              sub={`of ${data.eligibleStudentsTotal.toLocaleString("en-IN")} registered`}
              barPercent={eligiblePlacedPct}
            />
            <StatCard
              label="Placement percentage"
              value={`${data.placementPercentage}%`}
              sub={`${data.studentsPlaced.toLocaleString("en-IN")} of ${data.eligibleStudentsTotal.toLocaleString("en-IN")} registered`}
            />
            <StatCard label="Active drives" value={data.activeDrives} sub={`${data.drivesClosingThisWeek} closing this week`} />
            <StatCard
              label="Companies onboarded"
              value={data.totalCompanies}
              sub={`${data.companiesAddedThisMonth} added this month`}
            />
            <StatCard
              label="Offers released"
              value={data.funnel.offers.toLocaleString("en-IN")}
              sub={`${data.acceptedOffersCount.toLocaleString("en-IN")} accepted`}
            />
            <StatCard label="Average package" value={`₹${data.averagePackageLpa} LPA`} />
            <StatCard label="Highest package" value={`₹${data.highestPackageLpa} LPA`} />
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-3.5">
            <div className="flex flex-col gap-3.5">
              <PlacementFunnelChart data={data.funnel} />
              <DepartmentPlacementRates data={data.placementRateByDepartment} />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
                <PackageDistributionDonut data={data.packageBands} />
                <SixYearTrendChart data={data.sixYearTrend} />
              </div>
            </div>
            <div className="flex flex-col gap-3.5">
              <UpcomingDrivesCard drives={data.upcomingDrives} />
              <TopRecruitersCard data={data.topRecruiters} />
              <NeedsAttentionCard data={data.attentionFlags} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
