"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, EmptyState, Badge, SkeletonBlock } from "@/components/ui";
import { useHodNonTeachingProfile } from "@/modules/hod/api/facultyStaff";
import { formatDisplayDate } from "@/lib/utils/date";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-divider py-3 first:border-t-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[13.5px] font-bold text-ink">{value}</span>
    </div>
  );
}

export default function HodNonTeachingProfilePage() {
  const params = useParams<{ id: string }>();
  const staffId = Number(params.id);
  const router = useRouter();
  const profile = useHodNonTeachingProfile(staffId);

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }
  if (profile.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load this staff profile — please try again.
      </div>
    );
  }
  if (!profile.data) {
    return (
      <Card>
        <EmptyState message="Staff member not found." />
      </Card>
    );
  }

  const { staff } = profile.data;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        onClick={() => router.push("/hod/faculty-staff")}
        className="text-[13px] font-bold text-primary hover:underline"
      >
        ← Back to faculty
      </button>

      <Card>
        <h1 className="text-[26px] font-extrabold tracking-[-.02em] text-ink">{staff.name}</h1>
        <p className="mt-1 text-[14px] text-muted">
          {staff.category} · {staff.department_name}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="neutral">Non-teaching</Badge>
        </div>
      </Card>

      <Card className="hod-hover-card">
        <h2 className="text-[16px] font-extrabold text-ink">Service record</h2>
        <div className="mt-3">
          <Row label="Category" value={staff.category} />
          <Row label="Department" value={`${staff.department_name} (${staff.department_code})`} />
          <Row label="Institute email" value={staff.institute_email ?? "—"} />
          <Row label="Contact number" value={staff.contact_number ?? "—"} />
          <Row
            label="Date of joining"
            value={staff.date_of_joining ? formatDisplayDate(staff.date_of_joining) : "—"}
          />
          <Row label="Status" value={staff.status} />
        </div>
      </Card>
    </div>
  );
}
