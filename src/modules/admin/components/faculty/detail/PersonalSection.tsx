import type { Faculty } from "@/modules/admin/api/faculty";
import { formatDate, fullName } from "@/modules/admin/lib/faculty-format";
import { InfoGrid } from "@/modules/admin/components/faculty/detail/shared";

export function PersonalSection({ faculty }: { faculty: Faculty }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Personal Information</h3>
      <div className="mt-5">
        <InfoGrid
          items={[
            // fullName() already prepends the prefix itself — doing it again
            // here produced "Dr. Dr. Arun Prakash".
            ["Full name", fullName(faculty)],
            ["Gender", faculty.gender || "Not provided"],
            ["Date of birth", faculty.date_of_birth ? formatDate(faculty.date_of_birth) : "Not provided"],
            ["Personal email", faculty.personal_email || "Not provided"],
            ["Phone", faculty.phone ?? "Not provided"],
          ]}
        />
      </div>
    </div>
  );
}
