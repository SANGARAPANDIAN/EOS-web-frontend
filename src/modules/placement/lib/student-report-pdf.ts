import type { StudentReportRow } from "@/modules/placement/api/studentReport";
import { currentAcademicCycle, eligibilityLabel, rosterStatusLabel, yearLabel } from "@/modules/placement/lib/format";
import { exportToPdf, type PdfSection } from "@/lib/utils/pdf-export";

export interface StudentReportPdfScope {
  batchLabel?: string;
  classLabel?: string;
}

/**
 * Builds the Students page's "Export PDF" straight from the same
 * StudentReportRow[] already loaded/filtered on screen — no extra network
 * round trip, so the export always matches what the table shows. Replaces
 * the old server-rendered PDFKit table (EOSbackend1's report-export.util.ts),
 * which drew every row at a fixed height and let a wrapped department name
 * overlap into the next row; jspdf-autotable (via the shared exportToPdf
 * utility) sizes each row to its actual wrapped content instead.
 */
export async function generateStudentReportPdf(rows: StudentReportRow[], scope: StudentReportPdfScope = {}): Promise<void> {
  const { year, semester } = currentAcademicCycle();
  const attendedCount = rows.filter((r) => r.drivesApplied > 0).length;
  const placedCount = rows.filter((r) => r.status === "placed").length;

  const sections: PdfSection[] = [
    {
      type: "keyValue",
      title: "Summary",
      rows: [
        ["Total students", rows.length.toLocaleString("en-IN")],
        ["Attended at least one drive", attendedCount.toLocaleString("en-IN")],
        ["Placed", placedCount.toLocaleString("en-IN")],
      ],
    },
    {
      type: "table",
      title: "Student report",
      columns: [
        { header: "Student", key: "student" },
        { header: "Class", key: "classLabel" },
        { header: "Department", key: "department" },
        { header: "Year", key: "year" },
        { header: "Eligibility", key: "eligibility" },
        { header: "Attended", key: "attended" },
        { header: "Status", key: "status" },
        { header: "Company", key: "company" },
      ],
      rows: rows.map((r) => ({
        student: r.name ?? r.studentIdNo,
        classLabel: r.classLabel ?? "—",
        department: r.departmentCode ?? r.departmentName ?? "—",
        year: yearLabel(r.year),
        eligibility: eligibilityLabel(r),
        attended: r.drivesApplied > 0 ? "Yes" : "No",
        status: rosterStatusLabel(r.status),
        company: r.companyName ?? "—",
      })),
    },
  ];

  const scopeParts = [scope.batchLabel, scope.classLabel].filter(Boolean);
  const isoDate = new Date().toISOString().slice(0, 10);
  const scopeSlug = scopeParts.length > 0 ? scopeParts.join("-").replace(/\s+/g, "-") : "all";

  await exportToPdf({
    title: "Student Report",
    subtitle: scopeParts.length > 0 ? scopeParts.join(" · ") : "All registered students",
    meta: [
      ["Academic year", year],
      ["Semester", semester],
    ],
    sections,
    filename: `student-report-${scopeSlug}-${isoDate}.pdf`,
    footerBrand: true,
  });
}
