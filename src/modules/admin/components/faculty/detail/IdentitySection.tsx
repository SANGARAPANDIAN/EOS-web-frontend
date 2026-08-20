import type { Faculty } from "@/modules/admin/api/faculty";
import { maskTail } from "@/modules/admin/lib/faculty-format";
import { InfoGrid } from "@/modules/admin/components/faculty/detail/shared";

export function IdentitySection({ faculty }: { faculty: Faculty }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Identity</h3>
      <div className="mt-5">
        <InfoGrid
          items={[
            ["Aadhaar number", maskTail(faculty.sensitive_info?.aadhar_number)],
            ["PAN number", faculty.sensitive_info?.pan_number || "Not provided"],
            ["Bank name", faculty.sensitive_info?.bank_name || "Not provided"],
            ["Bank IFSC", faculty.sensitive_info?.bank_ifsc || "Not provided"],
            ["Bank account number", maskTail(faculty.sensitive_info?.bank_account_number)],
          ]}
        />
      </div>
      <p className="mt-4 text-xs text-admin-muted">Sensitive details are only visible to admins.</p>
    </div>
  );
}
