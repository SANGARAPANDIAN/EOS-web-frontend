"use client";

import { useEffect } from "react";
import { usePathname, useParams } from "next/navigation";

// Role folder (first URL segment under the portal route group) -> display
// name. Kept separate from ROLE_LABEL (lib/config.ts), which is keyed by
// the backend's roles.name values (e.g. "hr_payroll") — these are keyed by
// the actual URL segment (e.g. "hr"), which differs for several roles.
const ROLE_LABEL: Record<string, string> = {
  "academic-coordinator": "Academic Coordinator",
  admin: "Admin",
  billing: "Billing",
  coe: "COE",
  edc: "EDC",
  faculty: "Faculty",
  finance: "Finance",
  "gate-warden": "Gate Warden",
  "higher-education": "Higher Education",
  hod: "HoD",
  "hostel-warden": "Hostel Warden",
  hr: "HR & Payroll",
  iqac: "IQAC",
  library: "Library",
  "media-room": "Media Room",
  "medical-centre": "Medical Centre",
  placement: "Placement",
  principal: "Principal",
  secretary: "Secretary",
  "sports-admin": "Sports Admin",
  student: "Student",
  transport: "Transport",
};

// Segments that read as words when title-cased normally (e.g. "sop" ->
// "Sop") but are actually acronyms — kept to the handful that appear in
// real route segments today rather than a speculative exhaustive list.
const ACRONYM_WORDS = new Set(["sop", "pop", "od", "hod", "iqac", "edc", "coe", "hr"]);

// Route segments whose URL still reads "announcements" (unchanged, so
// existing links/bookmarks keep working) but whose UI text was renamed to
// "Notice(s)" — humanize() would otherwise title-case the raw segment back
// to "Announcements" for the browser tab title.
const SEGMENT_LABEL_OVERRIDES: Record<string, string> = {
  announcements: "Notices",
  "order-food": "Craveo",
};

function humanize(segment: string): string {
  if (SEGMENT_LABEL_OVERRIDES[segment]) return SEGMENT_LABEL_OVERRIDES[segment];
  return segment
    .split(/[-_]/)
    .map((word) => (ACRONYM_WORDS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

function computeTitle(pathname: string, params: Record<string, string | string[]>): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const paramValues = new Set(Object.values(params).flat().filter(Boolean));
  const [roleSeg, ...rest] = segments;
  const staticSegments = rest.filter((seg) => !paramValues.has(seg));
  const pageSeg = staticSegments[staticSegments.length - 1] ?? "dashboard";

  const roleLabel = ROLE_LABEL[roleSeg] ?? humanize(roleSeg);
  const pageLabel = humanize(pageSeg);
  return `${pageLabel} · ${roleLabel} — EOS Portal`;
}

/**
 * Sets the browser tab title from the current route instead of the static
 * "EOS Student Portal" every page previously shared.
 *
 * Next's App Router renders its own resolved metadata <title> (from the
 * root layout) as a real element hoisted into <head>, and re-asserts it on
 * navigation/hydration passes independently of this component — a plain
 * `document.title = …` in a useEffect gets silently reverted back to the
 * static default the moment that happens (confirmed empirically: multiple
 * <title> elements end up coexisting in <head>, with document.title always
 * reading the first one in document order, which stays Next's static
 * metadata tag no matter when this effect runs). Rendering our own <title>
 * element hits the same problem — it doesn't remove or reorder the
 * existing one. The MutationObserver below sidesteps the race entirely: it
 * doesn't matter who wins first, only that our title is the one left
 * standing, so any later mutation to <head> gets corrected immediately.
 */
export function DynamicPageTitle() {
  const pathname = usePathname();
  const params = useParams<Record<string, string | string[]>>();

  useEffect(() => {
    const title = computeTitle(pathname, params);
    if (!title) return;

    document.title = title;
    const observer = new MutationObserver(() => {
      if (document.title !== title) document.title = title;
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname, params]);

  return null;
}
