// Thin compatibility re-export — the real announcements list/mutations now
// live in modules/shared/api/announcements.ts (one implementation shared by
// IQAC/HR/EDC's announcement pages, see AnnouncementManager.tsx). Kept under
// this name/type only because EdcShell.tsx (sidebar badge count) and
// edc/dashboard/page.tsx (recent-announcements widget) still import
// useEdcAnnouncements/EdcAnnouncementRow — both only read id/created_at/title,
// which the shared Announcement type is already a superset of. Re-exporting
// the shared hook (same ["announcements"] query key) instead of keeping a
// parallel ["edc","announcements"] cache means both consumers now update
// immediately when an announcement is created/edited/deleted anywhere.
export { useAnnouncements as useEdcAnnouncements, type Announcement as EdcAnnouncementRow } from "@/modules/shared/api/announcements";
