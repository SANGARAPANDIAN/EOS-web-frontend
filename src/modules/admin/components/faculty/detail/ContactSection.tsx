import type { Faculty } from "@/modules/admin/api/faculty";
import { InfoGrid } from "@/modules/admin/components/faculty/detail/shared";

export function ContactSection({ faculty }: { faculty: Faculty }) {
  const address = [faculty.address_line, faculty.city, faculty.state, faculty.postal_code].filter(Boolean).join(", ");
  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Contact</h3>
      <div className="mt-5">
        <InfoGrid
          items={[
            ["Login email", faculty.email],
            ["Personal email", faculty.personal_email || "Not provided"],
            ["Phone", faculty.phone ?? "Not provided"],
            ["WhatsApp number", faculty.whatsapp_number || "Not provided"],
            ["Alternate phone", faculty.alternate_phone || "Not provided"],
            ["Address", address || "Not provided"],
          ]}
        />
      </div>
    </div>
  );
}
