"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import { useStudentProfileDetails } from "@/modules/admin/api/students";
import { DlGrid, Stub } from "@/modules/admin/components/student-detail/shared";

function ageFromDob(dob: string): string {
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${formatDate(dob)} (${years} years)`;
}

export function PersonalDetailsSection({
  studentId,
  active,
  name,
  email,
  phone,
}: {
  studentId: number;
  active: boolean;
  name: string;
  email: string;
  phone: string | null;
}) {
  const { data, isLoading } = useStudentProfileDetails(studentId, active);
  if (isLoading || !data) return <Stub message="Loading…" />;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Identity">
        <DlGrid
          pairs={[
            ["Full name", name],
            ["Date of birth", data.date_of_birth ? ageFromDob(data.date_of_birth) : null],
            ["Gender", data.gender],
            ["Blood group", data.blood_group],
            ["Nationality", data.nationality],
            ["Mother tongue", data.mother_tongue],
            ["Religion", data.religion],
            ["Community", data.community],
            ["First graduate", data.is_first_graduate === null ? null : data.is_first_graduate ? "Yes" : "No"],
            ["Differently abled", data.is_diff_abled === null ? null : data.is_diff_abled ? "Yes" : "No"],
          ]}
        />
      </SectionCard>
      <SectionCard title="Contact">
        <DlGrid
          pairs={[
            ["Institutional email", email],
            ["Personal email", data.contacts?.student_email1 ?? null],
            ["Alternate email", data.contacts?.student_email2 ?? null],
            ["Institutional mobile", phone],
            ["Personal mobile", data.contacts?.student_mobile ?? null],
          ]}
        />
      </SectionCard>
      {data.addresses.length === 0 ? (
        <SectionCard title="Address">
          <Stub message="No address on record." />
        </SectionCard>
      ) : (
        data.addresses.map((a) => (
          <SectionCard key={a.address_type} title={`${a.address_type.charAt(0).toUpperCase()}${a.address_type.slice(1)} address`}>
            <DlGrid
              pairs={[
                ["Address line", a.address_line],
                ["City", a.city],
                ["State", a.state],
                ["Pincode", a.pincode],
                ["Country", "India"],
              ]}
            />
          </SectionCard>
        ))
      )}
    </div>
  );
}
