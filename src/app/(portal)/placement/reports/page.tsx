"use client";

import { useState } from "react";
import { PageHeader, Badge, type BadgeTone, Card, Button, KpiCard, Select, useToast } from "@/modules/admin/components/ui";
import { useReportsGeneratedCount } from "@/modules/placement/api/studentReport";
import { useBatches } from "@/modules/placement/api/refData";
import {
  useExportPlacementSummary,
  useExportStudentReport,
  type ReportFormat,
} from "@/modules/placement/api/reports";
import { ApiError } from "@/types/api";

/**
 * Reports the system can genuinely produce, each backed by a real export
 * endpoint that returns a PDF or Excel file and is logged to audit_logs (which
 * is what "Generated this month" counts).
 *
 * The prescribed statutory formats — NIRF, NAAC/NBA, the AICTE return — are
 * deliberately NOT offered as one-click downloads. Those are fixed submission
 * templates that do not exist anywhere in this system, and labelling a generic
 * export as an "NIRF submission" would be worse than not offering it: someone
 * would file it. The data those formats need is in the exports below, so they
 * are listed separately as what to build from, not as finished returns.
 */
type Kind = "summary-class" | "summary-department" | "student";

interface ReportCard {
  kind: Kind;
  tag: "MANAGEMENT" | "OPERATIONS" | "ANALYSIS";
  title: string;
  desc: string;
}

const TAG_TONE: Record<ReportCard["tag"], BadgeTone> = {
  MANAGEMENT: "neutral",
  OPERATIONS: "neutral",
  ANALYSIS: "primary",
};

const REPORT_CARDS: ReportCard[] = [
  {
    kind: "summary-class",
    tag: "MANAGEMENT",
    title: "Class-wise placement summary",
    desc: "Eligible, applied, placed and offer counts for every class in the selected batch.",
  },
  {
    kind: "summary-department",
    tag: "ANALYSIS",
    title: "Department-wise placement summary",
    desc: "The same figures rolled up per department, for comparing performance across the college.",
  },
  {
    kind: "student",
    tag: "OPERATIONS",
    title: "Student-wise placement report",
    desc: "One row per student: drives applied to, rounds cleared, offers held and current status.",
  },
];

/** What the statutory templates need, and where it comes from. */
const STATUTORY_SOURCES = [
  { name: "NIRF placement submission", from: "Department-wise summary + student report (median salary from offers)" },
  { name: "NAAC / NBA criterion report", from: "Department-wise summary, exported once per year for the three-year trend" },
  { name: "AICTE annual return", from: "Department-wise summary + internship records" },
];

export default function ReportsPage() {
  const { show } = useToast();
  const generatedCount = useReportsGeneratedCount();
  const batches = useBatches();

  const [batchId, setBatchId] = useState<number | "all">("all");
  const [format, setFormat] = useState<ReportFormat>("excel");

  const exportSummary = useExportPlacementSummary();
  const exportStudents = useExportStudentReport();
  const busy = exportSummary.isPending || exportStudents.isPending;

  async function generate(card: ReportCard) {
    const batch = batchId === "all" ? undefined : batchId;
    try {
      if (card.kind === "student") {
        await exportStudents.mutateAsync({ batchId: batch, format });
      } else {
        await exportSummary.mutateAsync({
          batchId: batch,
          view: card.kind === "summary-department" ? "department" : "class",
          format,
        });
      }
      show(`${card.title} downloaded.`, "success");
      // The tile counts audit-logged exports, so it moves after a real download.
      void generatedCount.refetch();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Could not generate this report.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        description="Placement reporting — exported as PDF or Excel from live drive, application and offer data."
        actions={
          <>
            <Select value={batchId === "all" ? "all" : String(batchId)} onChange={(e) => setBatchId(e.target.value === "all" ? "all" : Number(e.target.value))}>
              <option value="all">All batches</option>
              {(batches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)}>
              <option value="excel">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Reports available" icon="summarize" value={REPORT_CARDS.length} sub="Each exports a real file" />
        <KpiCard
          label="Generated this month"
          icon="task_alt"
          value={generatedCount.data ?? (generatedCount.isLoading ? "…" : "—")}
          sub="Counted from logged exports"
        />
        <KpiCard label="Export formats" icon="download" value={2} sub="PDF and Excel" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_CARDS.map((card) => (
          <Card key={card.kind} hoverable={false} className="flex flex-col gap-2.5 p-5">
            <div className="flex items-center gap-2.5">
              <Badge tone={TAG_TONE[card.tag]} className="font-mono text-[10px] tracking-[.06em]">
                {card.tag}
              </Badge>
            </div>
            <h3 className="font-sans text-sm font-bold text-admin-ink">{card.title}</h3>
            <p className="flex-1 text-xs leading-relaxed text-admin-muted">{card.desc}</p>
            <div className="mt-1">
              <Button size="sm" variant="primary" onClick={() => void generate(card)} disabled={busy}>
                {busy ? "Generating…" : `Download ${format === "excel" ? "Excel" : "PDF"}`}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card hoverable={false} className="flex flex-col gap-3 p-5">
        <h3 className="font-sans text-sm font-bold text-admin-ink">Statutory submissions</h3>
        <p className="text-xs leading-relaxed text-admin-muted">
          NIRF, NAAC/NBA and AICTE each have a fixed submission template that this system does not hold, so they are not
          offered as one-click downloads — a generic export labelled as one of them could be filed by mistake. The
          figures they ask for come from the exports above:
        </p>
        <div className="flex flex-col gap-2">
          {STATUTORY_SOURCES.map((s) => (
            <div key={s.name} className="flex flex-col gap-0.5 rounded-lg border border-admin-border px-3.5 py-2.5">
              <span className="text-xs font-bold text-admin-ink">{s.name}</span>
              <span className="text-[11px] text-admin-muted">{s.from}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
