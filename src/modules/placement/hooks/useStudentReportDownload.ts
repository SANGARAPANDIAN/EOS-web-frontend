import { useMutation } from "@tanstack/react-query";
import { saveBlob } from "../lib/download-file";
import { studentReportService } from "../services/student-report.service";
import type { ReportExportFormat } from "../types";

function fallbackFilename(format: ReportExportFormat, classLabel?: string): string {
  const isoDate = new Date().toISOString().slice(0, 10);
  const scope = classLabel ? classLabel.replace(/\s+/g, "-") : "all";
  return `student-report-${scope}-${isoDate}.${format === "excel" ? "xlsx" : "pdf"}`;
}

interface DownloadArgs {
  format: ReportExportFormat;
  batchId?: number;
  classLabel?: string;
}

// A mutation, not a query — a download is a one-shot side effect with no
// cacheable result (see the Reports page's useReportDownload for the same
// reasoning).
export function useStudentReportDownload() {
  return useMutation({
    mutationFn: async ({ format, batchId, classLabel }: DownloadArgs) => {
      const { blob, filename } = await studentReportService.download(format, batchId, classLabel);
      saveBlob(blob, filename ?? fallbackFilename(format, classLabel));
    },
  });
}
