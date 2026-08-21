"use client";

import { useState } from "react";
import { Banner, Button, Card, Icon, ProgressBar } from "@/components/ui";
import { useHrDashboard } from "@/modules/hr/api/dashboard";
import { ApiError } from "@/types/api";

interface ReportCard {
  key: string;
  title: string;
  description: string;
  icon: string;
  preview: string;
  progressPercent?: number;
}

export default function HrReportsPage() {
  const dashboard = useHrDashboard();
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const data = dashboard.data;
  const monthLabel = data
    ? new Date(data.payroll.year, data.payroll.month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "—";

  const reports: ReportCard[] = [
    {
      key: "department-rollup",
      title: "Department rollup",
      description: "Headcount, today's leave/OD, pending requests and appraisal status by department.",
      icon: "apartment",
      preview: data ? `${data.department_overview.length} department${data.department_overview.length === 1 ? "" : "s"} tracked` : "—",
    },
    {
      key: "payroll-summary",
      title: "Payroll summary",
      description: "Processed vs. pending payroll records for the current month.",
      icon: "payments",
      preview: data
        ? `${data.payroll.processed_count} of ${data.payroll.total_active_faculty} faculty processed — ${monthLabel}`
        : "—",
      progressPercent: data?.payroll.completion_percent,
    },
    {
      key: "attendance-summary",
      title: "Attendance summary",
      description: "Full/half/absent day totals and attendance % per faculty.",
      icon: "schedule",
      preview: data ? `${data.todays_leave_count} on leave · ${data.todays_od_count} on OD today` : "—",
    },
    {
      key: "appraisal-status",
      title: "Appraisal status",
      description: "Appraisal cycle progress across every department.",
      icon: "military_tech",
      preview: data ? `${data.pending_appraisals_count} pending appraisal${data.pending_appraisals_count === 1 ? "" : "s"}` : "—",
    },
  ];

  const activeCard = reports.find((r) => r.key === activeReport);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Reports</h1>
        <p className="mt-1 text-[13px] text-muted">
          Operational reports across employees, attendance, leave, appraisal and payroll.
        </p>
      </div>

      {dashboard.isError && (
        <Banner>{dashboard.error instanceof ApiError ? dashboard.error.message : "Could not load report previews."}</Banner>
      )}

      <div className="grid grid-cols-4 gap-4">
        {reports.map((report) => (
          <Card key={report.key} className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
                <Icon name={report.icon} size={19} className="text-primary" />
              </div>
            </div>
            <div>
              <div className="text-[14.5px] font-bold text-ink">{report.title}</div>
              <p className="mt-1 text-[12.5px] text-muted">{report.description}</p>
            </div>
            <div className="text-[13px] font-semibold text-body">{dashboard.isLoading ? "Loading…" : report.preview}</div>
            {report.progressPercent !== undefined && <ProgressBar percent={report.progressPercent} />}
            <Button variant="secondary" className="mt-auto w-auto self-start px-4 py-2" onClick={() => setActiveReport(report.key)}>
              <Icon name="download" size={15} className="mr-1.5" />
              Generate
            </Button>
          </Card>
        ))}
      </div>

      {activeCard && (
        <Banner>
          &ldquo;{activeCard.title}&rdquo; export isn&apos;t wired up to a real backend capability yet — there&apos;s no
          report-generation or export-history endpoint in the API today. This is a placeholder until that&apos;s built.
        </Banner>
      )}
    </div>
  );
}
