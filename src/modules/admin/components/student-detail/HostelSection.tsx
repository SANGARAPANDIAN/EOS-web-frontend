"use client";

import { SectionCard } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import { useStudentHostelResident } from "@/modules/admin/api/students";
import { DlGrid, Stub } from "@/modules/admin/components/student-detail/shared";

export function HostelSection({
  studentType,
  studentId,
  active,
}: {
  studentType: "hosteller" | "dayscholar";
  studentId: number;
  active: boolean;
}) {
  const { data, isLoading } = useStudentHostelResident(studentId, active);

  if (studentType !== "hosteller") {
    return <Stub message="Day scholar — no hostel residency." />;
  }
  if (isLoading) return <Stub message="Loading…" />;
  if (!data) {
    return <Stub message="Marked as hosteller, but no active room assignment found." />;
  }

  return (
    <SectionCard title="Hostel residency">
      <DlGrid
        pairs={[
          ["Hostel", data.hostel ? `${data.hostel.name} (${data.hostel.code})` : null],
          ["Block", data.room?.block?.name ?? null],
          ["Floor", data.room?.floor?.name ?? null],
          ["Room", data.room?.room_number ?? null],
          ["Sharing", data.sharing],
          ["Fee status", data.fee_status.replace("_", " ")],
          ["Allocated on", data.allocated_date ? formatDate(data.allocated_date) : null],
          ["Current status", data.current_status.replace("_", " ")],
        ]}
      />
    </SectionCard>
  );
}
