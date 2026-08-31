"use client";

import { PageCrumbs } from "@/modules/iqac/components/PageControls";
import { AnnouncementManager, type AudienceOption } from "@/modules/shared/components/announcements/AnnouncementManager";
import type { AnnouncementCategory } from "@/modules/shared/api/announcements";

const AUDIENCE_OPTIONS: AudienceOption[] = [
  { key: "students", label: "Students", sub: "every student, institution-wide", targetAudience: "students", allClasses: true },
  { key: "faculty", label: "Faculty", sub: "every faculty account, institution-wide", targetAudience: "teachers" },
  { key: "hod", label: "HOD", sub: "every Head of Department account", targetAudience: "roles", roleName: "hod" },
  { key: "hr", label: "HR", sub: "the HR & Payroll account", targetAudience: "roles", roleName: "hr_payroll" },
  { key: "placement", label: "Placement", sub: "the Placement Cell account", targetAudience: "roles", roleName: "placement" },
];

const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "academic", label: "Academic" },
  { value: "department", label: "Department" },
  { value: "emergency", label: "Emergency" },
  { value: "general", label: "General" },
];

export default function IqacAnnouncementsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageCrumbs items={["IQAC", "Announcements"]} />
      <AnnouncementManager
        title="Announcements"
        subtitle="Every real institution-wide announcement — oversight view, same broadcast tier as Admin/Principal."
        emptyMessage="No announcements yet."
        audienceOptions={AUDIENCE_OPTIONS}
        categoryOptions={CATEGORY_OPTIONS}
        supportsDraft
      />
    </div>
  );
}
