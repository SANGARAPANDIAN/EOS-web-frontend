import type { Faculty, FacultyActivityEntry, FacultyAttendanceSummary } from "@/modules/admin/api/faculty";
import type { FacultyDocument } from "@/modules/admin/api/facultyFiles";
import type { FacultyMapping } from "@/modules/admin/api/facultyMapping";
import { classLabel, subjectLabel } from "@/modules/admin/lib/faculty-mapping-format";
import { EMPLOYEE_TYPE_FROM_ENUM, EMPLOYMENT_STATUS_FROM_ENUM } from "@/modules/admin/lib/faculty-wizard-config";
import { experienceYears, formatDate, formatFacultyCode, fullName, maskTail } from "@/modules/admin/lib/faculty-format";
import { exportToPdf, type PdfSection } from "@/lib/utils/pdf-export";

export interface FacultyProfileReportInput {
  faculty: Faculty;
  mappings: FacultyMapping[];
  documents: FacultyDocument[] | undefined;
  activity: FacultyActivityEntry[] | undefined;
  attendance: FacultyAttendanceSummary | undefined;
  distinctSubjectCount: number;
  distinctClassCount: number;
  completeness: number;
}

// Same cap the on-screen Activity list doesn't need (it scrolls) but a
// printed report does — never silently drop rows without saying so, hence
// the section title growing a "(most recent N of M)" suffix below.
const ACTIVITY_LIMIT = 25;

/**
 * The faculty detail page's "Print" button used to just call window.print()
 * on the live admin console page — sidebar, nav rail and all. This builds
 * an actual letterheaded PDF instead, covering every section the profile
 * page itself shows — with one deliberate difference: the full day-by-day
 * attendance log is summarized by month here instead of dumped in full,
 * since hundreds of daily punch rows would make this less useful, not more.
 * Identity fields (Aadhaar/bank) are masked exactly like the Identity tab
 * already masks them on screen — this report never prints them raw, and
 * the section is only present at all when `faculty.sensitive_info` is
 * (i.e. the caller was Admin/HR Payroll — see FacultyService.findOneForAdmin).
 */
export async function generateFacultyProfileReport(input: FacultyProfileReportInput): Promise<void> {
  const { faculty, mappings, documents, activity, attendance, distinctSubjectCount, distinctClassCount, completeness } = input;
  const address = [faculty.address_line, faculty.city, faculty.state, faculty.postal_code].filter(Boolean).join(", ");

  const sections: PdfSection[] = [
    {
      type: "keyValue",
      title: "Overview",
      rows: [
        ["Faculty ID", formatFacultyCode(faculty.id)],
        ["Name", fullName(faculty)],
        ["Designation", faculty.designation],
        ["Department", faculty.department?.name ?? "—"],
        ["Date of joining", formatDate(faculty.date_of_joining)],
        ["Email", faculty.email],
        ["Phone", faculty.phone ?? "Not provided"],
        ["Status", faculty.status === "active" ? "Active" : "Inactive"],
        ["Profile complete", `${completeness}%`],
        ["Subjects assigned", String(distinctSubjectCount)],
        ["Classes handled", String(distinctClassCount)],
        ["Attendance (this year)", attendance ? `${attendance.overall.attendance_percentage}%` : "—"],
      ],
    },
    {
      type: "keyValue",
      title: "Personal Information",
      rows: [
        // fullName() already prepends the prefix itself — doing it again
        // here would produce "Dr. Dr. Arun Prakash" (same bug PersonalSection
        // on the profile page itself had, fixed there too).
        ["Full name", fullName(faculty)],
        ["Gender", faculty.gender || "Not provided"],
        ["Date of birth", faculty.date_of_birth ? formatDate(faculty.date_of_birth) : "Not provided"],
        ["Personal email", faculty.personal_email || "Not provided"],
        ["Phone", faculty.phone ?? "Not provided"],
      ],
    },
    {
      type: "keyValue",
      title: "Contact",
      rows: [
        ["Login email", faculty.email],
        ["Personal email", faculty.personal_email || "Not provided"],
        ["Phone", faculty.phone ?? "Not provided"],
        ["WhatsApp number", faculty.whatsapp_number || "Not provided"],
        ["Alternate phone", faculty.alternate_phone || "Not provided"],
        ["Address", address || "Not provided"],
      ],
    },
    {
      type: "keyValue",
      title: "Employment",
      rows: [
        ["Designation", faculty.designation],
        ["Department", faculty.department?.name ?? "—"],
        ["Academic role", faculty.academic_role || "Not provided"],
        ["Date of joining", formatDate(faculty.date_of_joining)],
        ["Experience", experienceYears(faculty.date_of_joining)],
        ["Employment status", (faculty.employment_status && EMPLOYMENT_STATUS_FROM_ENUM[faculty.employment_status]) || "Not provided"],
        ["Employment type", (faculty.employment_type && EMPLOYEE_TYPE_FROM_ENUM[faculty.employment_type]) || "Not provided"],
        ["Work location", faculty.work_location || "Not provided"],
        ["Confirmation date", faculty.confirmation_date ? formatDate(faculty.confirmation_date) : "Not provided"],
        ["Qualification", faculty.qualification || "Not provided"],
        ["Specialization", faculty.specialization || "Not provided"],
        ["Status", faculty.status === "active" ? "Active" : "Inactive"],
      ],
    },
  ];

  if (faculty.sensitive_info) {
    sections.push({
      type: "keyValue",
      title: "Identity",
      rows: [
        ["Aadhaar number", maskTail(faculty.sensitive_info.aadhar_number)],
        ["PAN number", faculty.sensitive_info.pan_number || "Not provided"],
        ["Bank name", faculty.sensitive_info.bank_name || "Not provided"],
        ["Bank IFSC", faculty.sensitive_info.bank_ifsc || "Not provided"],
        ["Bank account number", maskTail(faculty.sensitive_info.bank_account_number)],
      ],
    });
  }

  sections.push({
    type: "table",
    title: "Academic Assignments",
    columns: [
      { header: "Subject", key: "subject" },
      { header: "Class", key: "class" },
      { header: "Academic year", key: "year" },
    ],
    rows: mappings.map((m) => ({ subject: subjectLabel(m), class: classLabel(m), year: m.academic_year })),
  });

  if (attendance && attendance.months.length > 0) {
    sections.push({
      type: "keyValue",
      title: "Attendance Summary (this year)",
      rows: [
        ["Full days", String(attendance.overall.full_days)],
        ["Half days", String(attendance.overall.half_days)],
        ["Absent", String(attendance.overall.absent)],
        ["On leave", String(attendance.overall.on_leave)],
        ["On duty / vacation", String(attendance.overall.on_duty + attendance.overall.on_vacation)],
        ["Attendance %", `${attendance.overall.attendance_percentage}%`],
      ],
    });
    sections.push({
      type: "table",
      title: "Attendance by Month",
      columns: [
        { header: "Month", key: "month" },
        { header: "Full", key: "full" },
        { header: "Half", key: "half" },
        { header: "Absent", key: "absent" },
        { header: "On leave", key: "leave" },
        { header: "%", key: "pct" },
      ],
      rows: attendance.months.map((m) => ({
        month: m.label,
        full: m.full_days,
        half: m.half_days,
        absent: m.absent,
        leave: m.on_leave,
        pct: `${m.attendance_percentage}%`,
      })),
    });
  }

  sections.push({
    type: "table",
    title: "Documents",
    columns: [
      { header: "Type", key: "type" },
      { header: "File", key: "file" },
      { header: "Uploaded", key: "uploaded" },
    ],
    rows: (documents ?? []).map((d) => ({ type: d.document_type, file: d.file_name, uploaded: formatDate(d.uploaded_at) })),
  });

  const activityTotal = activity?.length ?? 0;
  sections.push({
    type: "table",
    title: activityTotal > ACTIVITY_LIMIT ? `Recent Activity (most recent ${ACTIVITY_LIMIT} of ${activityTotal})` : "Recent Activity",
    columns: [
      { header: "Date", key: "date" },
      { header: "Description", key: "description" },
      { header: "By", key: "by" },
    ],
    rows: (activity ?? []).slice(0, ACTIVITY_LIMIT).map((a) => ({
      date: formatDate(a.created_at),
      description: a.description,
      by: a.created_by_email || "—",
    })),
  });

  await exportToPdf({
    title: "Faculty Profile Report",
    subtitle: `${fullName(faculty)} · ${faculty.designation} · ${faculty.department?.name ?? "No department"}`,
    meta: [
      ["Faculty ID", formatFacultyCode(faculty.id)],
      ["Status", faculty.status === "active" ? "Active" : "Inactive"],
    ],
    sections,
    filename: `faculty-profile-${formatFacultyCode(faculty.id)}.pdf`,
    photoUrl: faculty.profile_url,
    footerBrand: true,
  });
}
