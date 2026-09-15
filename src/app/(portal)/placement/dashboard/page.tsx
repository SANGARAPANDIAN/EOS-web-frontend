"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SkeletonStatTiles } from "@/components/ui/Skeleton";
import { Button, PageHeader, KpiCard, useToast } from "@/modules/admin/components/ui";
import { useDashboardSummary } from "@/modules/placement/api/dashboard";
import { lpa } from "@/modules/placement/lib/format";
import { generatePlacementDashboardReport } from "@/modules/placement/lib/placement-dashboard-report";
import { friendlyError } from "@/lib/utils/errors";
import { PlacementFunnelCard } from "@/modules/placement/components/dashboard/PlacementFunnelCard";
import { DepartmentPlacementRatesCard } from "@/modules/placement/components/dashboard/DepartmentPlacementRatesCard";
import { PackageDistributionCard } from "@/modules/placement/components/dashboard/PackageDistributionCard";
import { SixYearTrendCard } from "@/modules/placement/components/dashboard/SixYearTrendCard";
import { UpcomingDrivesCard } from "@/modules/placement/components/dashboard/UpcomingDrivesCard";
import { TopRecruitersCard } from "@/modules/placement/components/dashboard/TopRecruitersCard";
import { NeedsAttentionCard } from "@/modules/placement/components/dashboard/NeedsAttentionCard";

export default function PlacementDashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useDashboardSummary();
  const { show } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const eligiblePlacedPct =
    data && data.eligibleStudentsTotal > 0
      ? Math.round((data.studentsPlaced / data.eligibleStudentsTotal) * 1000) / 10
      : undefined;

  async function handleExport() {
    if (!data) return;
    setIsExporting(true);
    try {
      await generatePlacementDashboardReport(data);
    } catch (err: unknown) {
      show(friendlyError(err), "error");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Placement Dashboard"
        description="Drives, students, recruiters and outcomes for this placement cycle."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={!data || isExporting}>
              <Icon name="download" size={16} /> {isExporting ? "Preparing…" : "Export"}
            </Button>
            <Button variant="primary" onClick={() => router.push("/placement/drives/new")}>
              <Icon name="add" size={16} /> Create drive
            </Button>
          </>
        }
      />

      {isLoading && !data ? (
        <SkeletonStatTiles count={8} className="sm:grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Registered students"
            icon="groups"
            value={data ? data.eligibleStudentsTotal.toLocaleString("en-IN") : "—"}
            sub={data ? `Across ${data.placementRateByDepartment.length} departments` : undefined}
          />
          <KpiCard
            label="Students placed"
            icon="workspace_premium"
            value={data ? data.studentsPlaced.toLocaleString("en-IN") : "—"}
            sub={data ? `of ${data.eligibleStudentsTotal.toLocaleString("en-IN")} registered` : undefined}
            progress={eligiblePlacedPct}
          />
          <KpiCard
            label="Placement percentage"
            icon="trending_up"
            value={data ? `${data.placementPercentage}%` : "—"}
            sub={data ? `${data.studentsPlaced.toLocaleString("en-IN")} of ${data.eligibleStudentsTotal.toLocaleString("en-IN")}` : undefined}
          />
          <KpiCard
            label="Active drives"
            icon="event_available"
            value={data ? data.activeDrives : "—"}
            sub={data ? `${data.drivesClosingThisWeek} closing this week` : undefined}
          />
          <KpiCard
            label="Companies onboarded"
            icon="business_center"
            value={data ? data.totalCompanies : "—"}
            sub={data ? `${data.companiesAddedThisMonth} added this month` : undefined}
          />
          <KpiCard
            label="Offers released"
            icon="local_offer"
            value={data ? data.funnel.offers.toLocaleString("en-IN") : "—"}
            sub={data ? `${data.acceptedOffersCount.toLocaleString("en-IN")} accepted` : undefined}
          />
          <KpiCard label="Average package" icon="payments" value={data ? lpa(data.averagePackageLpa) : "—"} />
          <KpiCard label="Highest package" icon="military_tech" value={data ? lpa(data.highestPackageLpa) : "—"} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <PlacementFunnelCard
            data={data?.funnel ?? { eligible: 0, applied: 0, shortlisted: 0, interviewed: 0, offers: 0, placed: 0 }}
            studentsInProcess={data?.studentsInProcess ?? 0}
            studentsInProcessDriveCount={data?.studentsInProcessDriveCount ?? 0}
          />
          <DepartmentPlacementRatesCard data={data?.placementRateByDepartment ?? []} isLoading={isLoading} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PackageDistributionCard data={data?.packageBands ?? []} isLoading={isLoading} />
            <SixYearTrendCard data={data?.sixYearTrend ?? []} isLoading={isLoading} />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <UpcomingDrivesCard drives={data?.upcomingDrives ?? []} isLoading={isLoading} />
          <TopRecruitersCard data={data?.topRecruiters ?? []} isLoading={isLoading} />
          <NeedsAttentionCard data={data?.attentionFlags ?? []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
