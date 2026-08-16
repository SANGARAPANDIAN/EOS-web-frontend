"use client";

import { PageHeader, Badge, type BadgeTone, Card, Button, KpiCard, useToast } from "@/modules/admin/components/ui";
import { useReportsGeneratedCount } from "@/modules/placement/api/studentReport";

interface ReportCard {
  tag: "STATUTORY" | "ACCREDITATION" | "MANAGEMENT" | "OPERATIONS" | "ANALYSIS";
  title: string;
  desc: string;
}

const TAG_TONE: Record<ReportCard["tag"], BadgeTone> = {
  STATUTORY: "primary",
  ACCREDITATION: "primary",
  MANAGEMENT: "neutral",
  OPERATIONS: "neutral",
  ANALYSIS: "primary",
};

// The reference names 8 statutory/accreditation formats (NIRF, NAAC, AICTE,
// ...) — none of those prescribed formats exist anywhere in this system, and
// claiming a generic export IS one of them would be a worse kind of
// dishonesty than a fake success toast. The catalog stays for visual
// accuracy and planning context; "Generate"/"Schedule" say so plainly
// instead of pretending either action works.
const REPORT_CARDS: ReportCard[] = [
  {
    tag: "STATUTORY",
    title: "NIRF placement submission",
    desc: "Department-wise placed counts, median salary and higher-studies split in the prescribed format.",
  },
  {
    tag: "ACCREDITATION",
    title: "NAAC / NBA criterion report",
    desc: "Three-year placement trend with supporting offer evidence per programme.",
  },
  {
    tag: "MANAGEMENT",
    title: "Cycle review pack",
    desc: "Drives held, conversion at each stage, recruiter mix and package distribution.",
  },
  {
    tag: "OPERATIONS",
    title: "Department coordinator digest",
    desc: "Weekly per-department pending applications, shortlists and interview absentees.",
  },
  {
    tag: "OPERATIONS",
    title: "Unplaced student tracker",
    desc: "Final-year students with zero offers, with training attendance and mock scores.",
  },
  {
    tag: "MANAGEMENT",
    title: "Recruiter feedback summary",
    desc: "Consolidated panel feedback and the skill gaps flagged by visiting companies.",
  },
  {
    tag: "ANALYSIS",
    title: "Salary distribution analysis",
    desc: "Package bands, outliers and year-on-year movement by department.",
  },
  {
    tag: "STATUTORY",
    title: "AICTE annual return",
    desc: "Placement and internship counts formatted for the AICTE portal upload.",
  },
];

export default function ReportsPage() {
  const { show } = useToast();
  const generatedCount = useReportsGeneratedCount();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reports" description="Statutory, accreditation and management reporting." />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Report templates" icon="summarize" value={REPORT_CARDS.length} sub="Statutory and internal" />
        <KpiCard
          label="Generated this month"
          icon="task_alt"
          value={generatedCount.data ?? (generatedCount.isLoading ? "…" : "—")}
          sub="Student and class-wise report downloads"
        />
        <KpiCard label="Scheduled" icon="schedule" pendingReason="Not tracked in this system yet" />
        <KpiCard label="Last ERP sync" icon="sync" pendingReason="Not tracked in this system yet" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_CARDS.map((card) => (
          <Card key={card.title} hoverable={false} className="flex flex-col gap-2.5 p-5">
            <div className="flex items-center gap-2.5">
              <Badge tone={TAG_TONE[card.tag]} className="font-mono text-[10px] tracking-[.06em]">
                {card.tag}
              </Badge>
              <span className="text-[10.5px] text-admin-subtle">Not available yet</span>
            </div>
            <h3 className="font-sans text-sm font-bold text-admin-ink">{card.title}</h3>
            <p className="text-xs leading-relaxed text-admin-muted">{card.desc}</p>
            <div className="mt-1 flex gap-2">
              <Button size="sm" variant="primary" onClick={() => show("This report format isn't available yet.", "error")}>
                Generate
              </Button>
              <Button size="sm" variant="secondary" onClick={() => show("Scheduled runs aren't available yet.", "error")}>
                Schedule
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
