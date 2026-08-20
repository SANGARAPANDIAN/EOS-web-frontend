import type { Faculty, FacultyAttendanceSummary } from "@/modules/admin/api/faculty";
import { formatDate, formatFacultyCode, fullName } from "@/modules/admin/lib/faculty-format";
import { InfoGrid, MiniStat } from "@/modules/admin/components/faculty/detail/shared";

export function OverviewSection({
  faculty,
  distinctSubjectCount,
  distinctClassCount,
  mappingsLoading,
  attendance,
  attendanceLoading,
}: {
  faculty: Faculty;
  distinctSubjectCount: number;
  distinctClassCount: number;
  mappingsLoading: boolean;
  attendance: FacultyAttendanceSummary | undefined;
  attendanceLoading: boolean;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Overview</h3>
      <p className="mt-1 text-sm text-admin-muted">Snapshot of {fullName(faculty)}&apos;s record.</p>
      <div className="mt-5">
        <InfoGrid
          items={[
            ["Faculty ID", formatFacultyCode(faculty.id)],
            ["Name", fullName(faculty)],
            ["Designation", faculty.designation],
            ["Department", faculty.department?.name ?? "—"],
            ["Date of joining", formatDate(faculty.date_of_joining)],
            ["Email", faculty.email],
            ["Phone", faculty.phone ?? "Not provided"],
            ["Status", faculty.status === "active" ? "Active" : "Inactive"],
          ]}
        />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat label="Subjects" value={mappingsLoading ? "…" : String(distinctSubjectCount)} caption="distinct subjects assigned" />
        <MiniStat label="Classes" value={mappingsLoading ? "…" : String(distinctClassCount)} caption="distinct sections handled" />
        <MiniStat
          label="Attendance"
          value={attendanceLoading ? "…" : `${attendance?.overall.attendance_percentage ?? 0}%`}
          caption="this academic year"
        />
      </div>
    </div>
  );
}
