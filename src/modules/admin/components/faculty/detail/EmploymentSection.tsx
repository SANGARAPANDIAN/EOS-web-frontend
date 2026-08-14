import type { Faculty } from "@/modules/admin/api/faculty";
import { experienceYears, formatDate } from "@/modules/admin/lib/faculty-format";
import { EMPLOYEE_TYPE_FROM_ENUM, EMPLOYMENT_STATUS_FROM_ENUM } from "@/modules/admin/lib/faculty-wizard-config";
import { InfoGrid } from "@/modules/admin/components/faculty/detail/shared";

export function EmploymentSection({ faculty }: { faculty: Faculty }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Employment</h3>
      <div className="mt-5">
        <InfoGrid
          items={[
            ["Designation", faculty.designation],
            ["Department", faculty.department?.name ?? "—"],
            ["Academic role", faculty.academic_role || "Not provided"],
            ["Date of joining", formatDate(faculty.date_of_joining)],
            ["Experience", experienceYears(faculty.date_of_joining)],
            [
              "Employment status",
              (faculty.employment_status && EMPLOYMENT_STATUS_FROM_ENUM[faculty.employment_status]) || "Not provided",
            ],
            ["Employment type", (faculty.employment_type && EMPLOYEE_TYPE_FROM_ENUM[faculty.employment_type]) || "Not provided"],
            ["Work location", faculty.work_location || "Not provided"],
            ["Confirmation date", faculty.confirmation_date ? formatDate(faculty.confirmation_date) : "Not provided"],
            ["Qualification", faculty.qualification || "Not provided"],
            ["Specialization", faculty.specialization || "Not provided"],
            ["Status", faculty.status === "active" ? "Active" : "Inactive"],
            ["Reporting to", "Not available yet"],
          ]}
        />
      </div>
    </div>
  );
}
