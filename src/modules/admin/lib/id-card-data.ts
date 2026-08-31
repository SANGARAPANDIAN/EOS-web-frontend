import type { Faculty } from "@/modules/admin/api/faculty";
import type { StudentIdCardSource } from "@/modules/admin/api/students";
import { EMPLOYMENT_STATUS_FROM_ENUM } from "@/modules/admin/lib/faculty-wizard-config";
import { formatDate as formatFacultyDate, formatFacultyCode, fullName, initialsOf } from "@/modules/admin/lib/faculty-format";
import { formatDate as formatStudentDate, initials as studentInitials, studentName } from "@/modules/admin/lib/students-format";

/**
 * Entity-agnostic shape the shared ID card renderer (id-card-image.ts) and
 * preview (FlipIdCard) draw from — every field is already formatted text,
 * so the drawing code never branches on "is this a faculty or a student."
 * Each entity type gets its own thin adapter below instead.
 */
export interface IdCardData {
  entityId: number;
  photoUrl: string | null;
  initials: string;
  name: string;
  idLabel: string;
  idValue: string;
  roleLine: string;
  subLine: string;
  backRows: [string, string][];
  fileNameHint: string;
}

export function facultyToIdCardData(faculty: Faculty): IdCardData {
  const address = [faculty.address_line, faculty.city, faculty.state, faculty.postal_code].filter(Boolean).join(", ");

  return {
    entityId: faculty.id,
    photoUrl: faculty.profile_url ?? null,
    initials: initialsOf(faculty),
    name: fullName(faculty),
    idLabel: "Faculty ID",
    idValue: formatFacultyCode(faculty.id),
    roleLine: faculty.designation,
    subLine: faculty.department?.name ?? "",
    backRows: [
      ["Date of Birth", formatFacultyDate(faculty.date_of_birth)],
      [
        "Employment Status",
        faculty.employment_status ? (EMPLOYMENT_STATUS_FROM_ENUM[faculty.employment_status] ?? faculty.employment_status) : "—",
      ],
      ["Phone", faculty.phone ?? "—"],
      ["Email", faculty.email],
      ["Address", address || "—"],
    ],
    fileNameHint: formatFacultyCode(faculty.id),
  };
}

// Backend doesn't return a display code — derived client-side purely for
// display, matching formatFacultyCode's own convention. Not a real
// identifier.
export function formatStudentCode(id: number): string {
  return `STU${String(id).padStart(4, "0")}`;
}

export function studentToIdCardData(student: StudentIdCardSource): IdCardData {
  const permanent = student.addresses.find((a) => a.address_type === "permanent") ?? student.addresses[0];
  const address = permanent ? [permanent.address_line, permanent.city, permanent.state, permanent.pincode].filter(Boolean).join(", ") : "";
  const idValue = student.register_no ?? student.roll_no ?? student.student_id_no;
  const classLabel = [student.class?.section, student.batch?.name].filter(Boolean).join(" · ");

  return {
    entityId: student.id,
    photoUrl: student.photo_url,
    initials: studentInitials(student.first_name, student.last_name),
    name: studentName(student.first_name, student.last_name),
    idLabel: "Register No",
    idValue,
    roleLine: student.course?.name ?? "",
    subLine: [student.department?.name, classLabel].filter(Boolean).join(" — "),
    backRows: [
      ["Date of Birth", formatStudentDate(student.date_of_birth)],
      ["Blood Group", student.blood_group ?? "—"],
      ["Phone", student.phone ?? "—"],
      ["Email", student.email],
      ["Address", address || "—"],
    ],
    fileNameHint: formatStudentCode(student.id),
  };
}
