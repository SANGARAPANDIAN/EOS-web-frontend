"use client";

import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { useReportsGeneratedCount } from "@/modules/placement/hooks/useReportsGeneratedCount";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ReportCard {
  tag: "STATUTORY" | "ACCREDITATION" | "MANAGEMENT" | "OPERATIONS" | "ANALYSIS";
  title: string;
  desc: string;
  meta: string;
}

// The reference names 8 statutory/accreditation formats (NIRF, NAAC, AICTE,
// ...) — none of those prescribed formats exist anywhere in this system, and
// claiming a generic export IS one of them would be a worse kind of
// dishonesty than the mockup's own fake toasts. The catalog stays for visual
// accuracy; "Generate"/"Schedule" say so plainly instead of pretending.
const REPORT_CARDS: ReportCard[] = [
  {
    tag: "STATUTORY",
    title: "NIRF placement submission",
    desc: "Department-wise placed counts, median salary and higher-studies split in the prescribed format.",
    meta: "Not available yet",
  },
  {
    tag: "ACCREDITATION",
    title: "NAAC / NBA criterion report",
    desc: "Three-year placement trend with supporting offer evidence per programme.",
    meta: "Not available yet",
  },
  {
    tag: "MANAGEMENT",
    title: "Cycle review pack",
    desc: "Drives held, conversion at each stage, recruiter mix and package distribution.",
    meta: "Not available yet",
  },
  {
    tag: "OPERATIONS",
    title: "Department coordinator digest",
    desc: "Weekly per-department pending applications, shortlists and interview absentees.",
    meta: "Not available yet",
  },
  {
    tag: "OPERATIONS",
    title: "Unplaced student tracker",
    desc: "Final-year students with zero offers, with training attendance and mock scores.",
    meta: "Not available yet",
  },
  {
    tag: "MANAGEMENT",
    title: "Recruiter feedback summary",
    desc: "Consolidated panel feedback and the skill gaps flagged by visiting companies.",
    meta: "Not available yet",
  },
  {
    tag: "ANALYSIS",
    title: "Salary distribution analysis",
    desc: "Package bands, outliers and year-on-year movement by department.",
    meta: "Not available yet",
  },
  {
    tag: "STATUTORY",
    title: "AICTE annual return",
    desc: "Placement and internship counts formatted for the AICTE portal upload.",
    meta: "Not available yet",
  },
];

export default function ReportsPage() {
  const { show } = useToast();
  const generatedCount = useReportsGeneratedCount();

  return (
    <div className="flex flex-col gap-4.5">
      <div>
        <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Reports</h1>
        <p className="mt-1.5 text-[13px] text-muted">Statutory, accreditation and management reporting.</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
        <StatCard label="Report templates" value={REPORT_CARDS.length} sub="Statutory and internal" />
        <StatCard label="Generated this month" value={generatedCount.data ?? "—"} sub="Student and class-wise report downloads" />
        <StatCard label="Scheduled" value="—" sub="Not tracked in this system yet" />
        <StatCard label="Last ERP sync" value="—" sub="Not tracked in this system yet" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3">
        {REPORT_CARDS.map((card) => (
          <Card key={card.title} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge tone="accent">{card.tag}</Badge>
              <span className="text-[10.5px] text-subtle">{card.meta}</span>
            </div>
            <div className="text-sm font-bold text-ink">{card.title}</div>
            <div className="text-xs leading-relaxed text-muted">{card.desc}</div>
            <div className="mt-1 flex gap-2">
              <Button variant="primarySmall" onClick={() => show("This report format isn't available yet.", "error")}>
                Generate
              </Button>
              <Button variant="secondary" onClick={() => show("Scheduled runs aren't available yet.", "error")}>
                Schedule
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
