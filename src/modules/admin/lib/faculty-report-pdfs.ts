import { exportToPdf } from "@/lib/utils/pdf-export";
import type { Faculty, FacultyAttendanceOverviewRow, FacultyAttendanceStats } from "@/modules/admin/api/faculty";
import type { FacultyMapping } from "@/modules/admin/api/facultyMapping";
import { formatDate, formatFacultyCode, fullName } from "@/modules/admin/lib/faculty-format";

const INSTITUTION = "Sri Eshwar College of Engineering — Faculty Module";
const today = () => new Date().toISOString().slice(0, 10);

export function exportFacultyRosterPdf(rows: Faculty[]) {
  return exportToPdf({
    title: "Faculty Roster",
    subtitle: INSTITUTION,
    meta: [["Faculty count", String(rows.length)]],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Faculty ID", key: "id" },
          { header: "Name", key: "name" },
          { header: "Designation", key: "designation" },
          { header: "Department", key: "department" },
          { header: "Email", key: "email" },
          { header: "Phone", key: "phone" },
          { header: "Date of joining", key: "doj" },
          { header: "Status", key: "status" },
        ],
        rows: rows.map((r) => ({
          id: formatFacultyCode(r.id),
          name: fullName(r),
          designation: r.designation,
          department: r.department?.code ?? r.department?.name ?? "—",
          email: r.email,
          phone: r.phone ?? "—",
          doj: formatDate(r.date_of_joining),
          status: r.status === "active" ? "Active" : "Inactive",
        })),
      },
    ],
    filename: `faculty-roster-${today()}.pdf`,
  });
}

export function exportAttendanceSummaryPdf(rows: FacultyAttendanceOverviewRow[], meta: { academicYear: string; department?: string }) {
  return exportToPdf({
    title: "Attendance Summary",
    subtitle: INSTITUTION,
    meta: [
      ["Academic year", meta.academicYear],
      ["Department", meta.department ?? "All Departments"],
      ["Faculty count", String(rows.length)],
    ],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Faculty", key: "name" },
          { header: "Department", key: "department" },
          { header: "Full days", key: "full" },
          { header: "Half days", key: "half" },
          { header: "Absent", key: "absent" },
          { header: "On duty / leave", key: "onDuty" },
          { header: "Attendance %", key: "pct" },
        ],
        rows: rows.map((r) => ({
          name: `${r.first_name} ${r.last_name}`,
          department: r.department?.code ?? r.department?.name ?? "—",
          full: r.full_days,
          half: r.half_days,
          absent: r.absent,
          onDuty: r.on_duty + r.on_vacation + r.on_leave,
          pct: `${r.attendance_percentage}%`,
        })),
      },
    ],
    filename: `faculty-attendance-summary-${meta.academicYear}.pdf`,
  });
}

export function exportAssignmentsPdf(rows: FacultyMapping[], meta: { academicYear?: string }) {
  return exportToPdf({
    title: "Academic Assignments",
    subtitle: INSTITUTION,
    meta: [
      ["Academic year", meta.academicYear ?? "All years"],
      ["Assignments", String(rows.length)],
    ],
    sections: [
      {
        type: "table",
        columns: [
          { header: "Faculty", key: "name" },
          { header: "Code", key: "code" },
          { header: "Subject", key: "subject" },
          { header: "Subject code", key: "subjectCode" },
          { header: "Department", key: "department" },
          { header: "Section", key: "section" },
          { header: "Academic year", key: "year" },
        ],
        rows: rows.map((m) => ({
          name: `${m.faculty.first_name} ${m.faculty.last_name}`,
          code: formatFacultyCode(m.faculty.id),
          subject: m.subject.name,
          subjectCode: m.subject.subject_code,
          department: m.class.department.code,
          section: m.class.section,
          year: m.academic_year,
        })),
      },
    ],
    filename: `academic-assignments-${meta.academicYear ?? "all"}.pdf`,
  });
}

export function exportSingleFacultyReportPdf(
  faculty: Faculty,
  academicYear: string,
  attendance: FacultyAttendanceStats,
  assignments: FacultyMapping[],
) {
  return exportToPdf({
    title: `Faculty Report — ${fullName(faculty)}`,
    subtitle: `${formatFacultyCode(faculty.id)} · ${INSTITUTION}`,
    meta: [["Academic year", academicYear]],
    sections: [
      {
        type: "keyValue",
        title: "Profile",
        rows: [
          ["Designation", faculty.designation],
          ["Department", faculty.department?.name ?? "—"],
          ["Email", faculty.email],
          ["Phone", faculty.phone ?? "Not provided"],
          ["Status", faculty.status === "active" ? "Active" : "Inactive"],
        ],
      },
      {
        type: "keyValue",
        title: "Attendance summary",
        rows: [
          ["Full days", String(attendance.full_days)],
          ["Half days", String(attendance.half_days)],
          ["Absent", String(attendance.absent)],
          ["On duty / leave", String(attendance.on_duty + attendance.on_vacation + attendance.on_leave)],
          ["Attendance %", `${attendance.attendance_percentage}%`],
        ],
      },
      {
        type: "table",
        title: "Academic assignments",
        columns: [
          { header: "Subject", key: "subject" },
          { header: "Subject code", key: "subjectCode" },
          { header: "Department", key: "department" },
          { header: "Section", key: "section" },
        ],
        rows: assignments.map((m) => ({
          subject: m.subject.name,
          subjectCode: m.subject.subject_code,
          department: m.class.department.code,
          section: m.class.section,
        })),
      },
    ],
    filename: `faculty-report-${formatFacultyCode(faculty.id)}-${academicYear}.pdf`,
  });
}
