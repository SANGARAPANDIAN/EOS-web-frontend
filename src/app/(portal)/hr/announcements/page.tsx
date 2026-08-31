"use client";

import { AnnouncementManager, type AudienceOption } from "@/modules/shared/components/announcements/AnnouncementManager";
import type { AnnouncementCategory } from "@/modules/shared/api/announcements";

const AUDIENCE_OPTIONS: AudienceOption[] = [
  { key: "teachers", label: "All faculty", sub: "every faculty account, institution-wide", targetAudience: "teachers" },
  { key: "hod", label: "HODs", sub: "every Head of Department account", targetAudience: "roles", roleName: "hod" },
  { key: "placement", label: "Placement Cell", sub: "the Placement Cell account", targetAudience: "roles", roleName: "placement" },
];

const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "academic", label: "Academic" },
  { value: "department", label: "Department" },
  { value: "event", label: "Event" },
  { value: "emergency", label: "Emergency" },
];

export default function HrAnnouncementsPage() {
  return (
    <AnnouncementManager
      title="Announcements"
      subtitle="Circulars from the institution, and notices you publish to faculty or specific roles."
      emptyMessage="Nothing here yet."
      audienceOptions={AUDIENCE_OPTIONS}
      categoryOptions={CATEGORY_OPTIONS}
    />
  );
}
