import type { ApplicationStatus, OfferResponseStatus } from "@/modules/placement/api/types";
import type { RecruiterStatus } from "@/modules/placement/api/companies";
import type { DriveDisplayStatus, DriveMode } from "@/modules/placement/api/drives";
import type { InterviewStatus } from "@/modules/placement/api/interviews";

// Consolidates what used to be identical `lpa`/`dateLabel`/status-label
// helpers redefined independently in nearly every old placement page.

export function lpa(value: number | null | undefined): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** I-IV, roman numeral — the one field the old app rendered two different ways across pages ("2nd Year" vs "II Year"); unified on the roman-numeral form here. */
export function yearLabel(year: number | null): string {
  if (year == null) return "—";
  const roman = ["I", "II", "III", "IV"][year - 1] ?? String(year);
  return `${roman} Year`;
}

export function driveDisplayStatusLabel(status: DriveDisplayStatus): string {
  if (status === "upcoming") return "Upcoming";
  if (status === "ongoing") return "Ongoing";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

export function driveModeLabel(mode: DriveMode | null): string {
  if (mode === "on_campus") return "On campus";
  if (mode === "virtual") return "Virtual";
  return "—";
}

export function recruiterStatusLabel(status: RecruiterStatus): string {
  if (status === "returning") return "Returning";
  if (status === "new") return "New";
  return "Not yet recruited";
}

export function offerResponseLabel(response: OfferResponseStatus | null): string {
  if (response === "accepted") return "Accepted";
  if (response === "declined") return "Declined";
  return "Pending";
}

export function interviewStatusLabel(status: InterviewStatus): string {
  if (status === "scheduled") return "Scheduled";
  if (status === "in_progress") return "In progress";
  return "Completed";
}

/** The interview's recorded outcome — pending until a result is recorded. */
export function interviewResultLabel(status: ApplicationStatus | null): string {
  if (status === "placed") return "Selected";
  if (status === "rejected") return "Rejected";
  if (status === "r1_cleared" || status === "r2_cleared" || status === "r3_cleared") return "In process";
  return "Pending";
}

/** Coarse roster-level view of an application status — used by the Students and Student Reports lists. */
export function rosterStatusLabel(status: ApplicationStatus | null): string {
  if (status === "placed") return "Placed";
  if (status === "rejected") return "Not placed";
  if (status === null) return "Not applied";
  return "In process";
}

/** Opt-out overrides eligibility in display — a student who opted out isn't meaningfully "eligible" or "not eligible" for this cycle anymore. Shared by the Students list and its PDF export so the two never drift apart. */
export function eligibilityLabel(r: { placementEligible: boolean | null; placementOptedOut: boolean }): string {
  if (r.placementOptedOut) return "Opted out";
  if (r.placementEligible === true) return "Eligible";
  if (r.placementEligible === false) return "Not eligible";
  return "Not assessed";
}

/** Per-round stage label — used by the drive detail student list and the student profile's application history. */
export function applicationStageLabel(status: ApplicationStatus): string {
  if (status === "placed") return "Selected";
  if (status === "rejected") return "Rejected";
  if (status === "r1_cleared") return "Shortlisted";
  if (status === "r2_cleared" || status === "r3_cleared") return "In process";
  return "Applied";
}

/** June-cutoff academic year/semester — same convention used across the ERP's other modules. Purely computed, not a real switchable setting. */
export function currentAcademicCycle(): { year: string; semester: string } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const startYear = month >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const isOdd = month >= 6 && month <= 11;
  return {
    year: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`,
    semester: isOdd ? "Odd Semester" : "Even Semester",
  };
}
