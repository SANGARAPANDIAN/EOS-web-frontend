import type { DashboardSummary } from "@/modules/placement/api/dashboard";
import { currentAcademicCycle, lpa } from "@/modules/placement/lib/format";
import { exportToPdf, formatMoneyForPdf, type PdfSection } from "@/lib/utils/pdf-export";

/**
 * Builds the Placement Dashboard's "Export" PDF straight from the same
 * DashboardSummary object already loaded on-screen (GET /drives/placement-stats)
 * — no extra fetches, so the exported numbers are guaranteed identical to
 * what the KPI cards show at the moment of export.
 */
export async function generatePlacementDashboardReport(data: DashboardSummary): Promise<void> {
  const { year, semester } = currentAcademicCycle();

  const sections: PdfSection[] = [
    {
      type: "keyValue",
      title: "Key metrics",
      rows: [
        ["Registered students", data.eligibleStudentsTotal.toLocaleString("en-IN")],
        ["Students placed", data.studentsPlaced.toLocaleString("en-IN")],
        ["Placement percentage", `${data.placementPercentage}%`],
        ["Active drives", `${data.activeDrives} (${data.drivesClosingThisWeek} closing this week)`],
        ["Companies onboarded", `${data.totalCompanies} (${data.companiesAddedThisMonth} added this month)`],
        ["Offers released", `${data.funnel.offers.toLocaleString("en-IN")} (${data.acceptedOffersCount.toLocaleString("en-IN")} accepted)`],
        ["Average package", lpa(data.averagePackageLpa)],
        ["Highest package", lpa(data.highestPackageLpa)],
      ],
    },
    {
      type: "table",
      title: "Placement funnel",
      columns: [
        { header: "Stage", key: "stage" },
        { header: "Count", key: "count" },
      ],
      rows: [
        { stage: "Eligible", count: data.funnel.eligible },
        { stage: "Applied", count: data.funnel.applied },
        { stage: "Shortlisted", count: data.funnel.shortlisted },
        { stage: "Interviewed", count: data.funnel.interviewed },
        { stage: "Offers", count: data.funnel.offers },
        { stage: "Placed", count: data.funnel.placed },
      ],
    },
    {
      type: "table",
      title: "Placement rate by department",
      columns: [
        { header: "Department", key: "department" },
        { header: "Placed", key: "placed" },
        { header: "Total", key: "total" },
        { header: "Rate", key: "rate" },
      ],
      rows: data.placementRateByDepartment.map((d) => ({
        department: d.department,
        placed: d.placed,
        total: d.total,
        rate: d.total > 0 ? `${Math.round((d.placed / d.total) * 1000) / 10}%` : "—",
      })),
    },
    {
      type: "table",
      title: "Package distribution",
      columns: [
        { header: "Band", key: "label" },
        { header: "Offers", key: "count" },
      ],
      rows: data.packageBands.map((b) => ({ label: b.label, count: b.count })),
    },
    {
      type: "table",
      title: "6-year placement trend",
      columns: [
        { header: "Cycle", key: "cycle" },
        { header: "Placement rate", key: "rate" },
      ],
      rows: data.sixYearTrend.map((t) => ({ cycle: t.cycle, rate: `${t.rate}%` })),
    },
    {
      type: "table",
      title: "Top recruiters",
      columns: [
        { header: "Company", key: "company" },
        { header: "Offers", key: "offers" },
        { header: "Avg. package", key: "avgPackage" },
      ],
      rows: data.topRecruiters.map((r) => ({
        company: r.company,
        offers: r.offers,
        avgPackage: formatMoneyForPdf(r.avgPackageLpa * 100000),
      })),
    },
    {
      type: "table",
      title: "Upcoming drives",
      columns: [
        { header: "Date", key: "date" },
        { header: "Company", key: "company" },
        { header: "Role", key: "role" },
      ],
      rows: data.upcomingDrives.map((d) => ({
        date: `${d.day} ${d.month}`,
        company: d.company,
        role: d.role ?? "—",
      })),
    },
  ];

  if (data.attentionFlags.length > 0) {
    sections.push({
      type: "table",
      title: "Needs attention",
      columns: [
        { header: "Flag", key: "title" },
        { header: "Detail", key: "description" },
      ],
      rows: data.attentionFlags.map((f) => ({ title: f.title, description: f.description })),
    });
  }

  await exportToPdf({
    title: "Placement Dashboard Report",
    subtitle: "Drives, students, recruiters and outcomes for this placement cycle",
    meta: [
      ["Academic year", year],
      ["Semester", semester],
    ],
    sections,
    filename: `placement-dashboard-${year}.pdf`,
    footerBrand: true,
  });
}
