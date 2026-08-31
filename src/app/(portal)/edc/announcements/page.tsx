"use client";

import { AnnouncementManager, type AudienceOption } from "@/modules/shared/components/announcements/AnnouncementManager";

const AUDIENCE_OPTIONS: AudienceOption[] = [
  { key: "edc_founders", label: "All founders", sub: "every registered founder", targetAudience: "edc_founders" },
  { key: "edc_inside_college", label: "Ventures inside college", sub: "founders whose venture operates on campus", targetAudience: "edc_inside_college" },
  { key: "edc_all_entrepreneurs", label: "Student entrepreneurs", sub: "every student entrepreneur, institution-wide", targetAudience: "edc_all_entrepreneurs" },
];

const PRIORITY_OPTIONS = ["High Priority", "Medium Priority", "Normal Priority"];

export default function EdcAnnouncementsPage() {
  return (
    <AnnouncementManager
      title="Entrepreneurship Announcements"
      subtitle="Publish and manage announcements for student entrepreneurs."
      emptyMessage="No announcements yet — publish one to reach founders."
      audienceOptions={AUDIENCE_OPTIONS}
      priorityOptions={PRIORITY_OPTIONS}
    />
  );
}
