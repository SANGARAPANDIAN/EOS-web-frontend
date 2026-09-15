import type { HodFacultyProfile } from "@/modules/hod/api/facultyStaff";
import { formatDisplayDate } from "@/lib/utils/date";
import { exportToPdf, type PdfSection } from "@/lib/utils/pdf-export";

function appraisalStatusLabel(status: string | null): string {
  switch (status) {
    case "submitted":
      return "Submitted · pending review";
    case "hod_reviewed":
      return "Reviewed by HoD · pending HR";
    case "hr_scored":
      return "Scored by HR · pending management";
    case "management_approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Not submitted yet";
  }
}

/**
 * The HoD Faculty & Staff profile page's "Print profile" button used to
 * just call window.print() on the live app page — sidebar/topbar chrome
 * aside, that prints raw on-screen cards (rounded corners, hover borders,
 * app colors) with no letterhead or document layout, not a document meant
 * to be handed to someone. This builds an actual letterheaded PDF instead,
 * through the same shared exportToPdf() utility the Admin console's
 * faculty-profile report and every other report export in this codebase
 * already uses — same header band, table styling and page numbering, so
 * every printed report in the app looks like it came from one system.
 * Scoped to exactly what this page's own API response has (no Identity/
 * Documents/Personal sections — those are Admin-only fields HoD's endpoint
 * never returns, so this report never fabricates them).
 */
export async function generateHodFacultyProfileReport(profile: HodFacultyProfile): Promise<void> {
  const { faculty, workload, advisory_class, subjects, leave_balances, appraisal } = profile;
  const facultyCode = `FAC${String(faculty.id).padStart(4, "0")}`;

  const sections: PdfSection[] = [
    {
      type: "keyValue",
      title: "Overview",
      rows: [
        ["Faculty ID", facultyCode],
        ["Name", faculty.name],
        ["Designation", faculty.designation],
        ["Department", `${faculty.department_name} (${faculty.department_code})`],
        ["Academic year", profile.academic_year],
        ["Advisory class", advisory_class ? `${advisory_class.year_label ?? ""}-${advisory_class.section}`.trim() : "No advisory class"],
        ["Attendance (this term)", profile.attendance_this_term != null ? `${profile.attendance_this_term}%` : "—"],
        ["Workload", workload.hours_per_week != null ? `${workload.hours_per_week} hrs/week · ${workload.periods_per_week} periods` : `${workload.periods_per_week} periods/week`],
        ["Experience", faculty.experience_years != null ? `${faculty.experience_years} yrs` : "—"],
      ],
    },
    {
      type: "keyValue",
      title: "Service record",
      rows: [
        ["Designation", faculty.designation],
        ["Qualification", faculty.qualification ?? "Not provided"],
        ...(faculty.specialization ? ([["Specialisation", faculty.specialization]] as [string, string][]) : []),
        ["Institute email", faculty.institute_email ?? "Not provided"],
        ["Contact number", faculty.contact_number ?? "Not provided"],
        ["Date of joining", faculty.date_of_joining ? formatDisplayDate(faculty.date_of_joining) : "Not provided"],
        ["Total experience", faculty.experience_years != null ? `${faculty.experience_years} yrs` : "—"],
      ],
    },
    {
      type: "keyValue",
      title: "Leave & appraisal",
      rows: [
        ...leave_balances.map((b): [string, string] => [b.leave_type, `${b.used} of ${b.allocated} used`]),
        ["On duty (this term)", `${profile.on_duty_days_this_term} days`],
        [appraisal.cycle_academic_year ? `Appraisal ${appraisal.cycle_academic_year}` : "Appraisal", appraisalStatusLabel(appraisal.status)],
      ],
    },
    subjects.length === 0
      ? {
          type: "keyValue",
          title: "Subjects handled",
          rows: [["Status", "No subjects assigned this academic year"]],
        }
      : {
          type: "table",
          title: `Subjects handled (${subjects.reduce((sum, s) => sum + s.periods_per_week, 0)} periods/week)`,
          columns: [
            { header: "Code", key: "code" },
            { header: "Subject", key: "name" },
            { header: "Semester", key: "semester" },
            { header: "Section", key: "section" },
            { header: "Periods/wk", key: "periods" },
          ],
          rows: subjects.map((s) => ({
            code: s.code,
            name: s.name,
            semester: s.semester != null ? String(s.semester) : "—",
            section: s.year_label ? `${s.year_label} · ${s.section}` : s.section,
            periods: s.periods_per_week,
          })),
        },
  ];

  await exportToPdf({
    title: "Faculty Profile",
    subtitle: `${faculty.name} · ${faculty.designation} · ${faculty.department_name}`,
    meta: [
      ["Faculty ID", facultyCode],
      ["Academic year", profile.academic_year],
    ],
    sections,
    filename: `faculty-profile-${facultyCode}.pdf`,
    photoUrl: faculty.photo_url,
    footerBrand: true,
  });
}
