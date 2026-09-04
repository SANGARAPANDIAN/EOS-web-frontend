export type NavBadgeKey =
  | "announcementsRecent"
  | "feesDue"
  | "feedbackPending"
  | "principalStudentsTotal"
  | "principalFacultyTotal"
  | "fleetBuses"
  | "fleetRoutes"
  | "crewCount"
  | "maintenanceDue"
  | "complianceExpiring"
  | "heAspirants"
  | "heApplications"
  | "heTests"
  | "heUniversities"
  | "heScholarships"
  | "mcOpdWaiting"
  | "mcBedsOccupied"
  | "mcLowStock"
  | "hwPendingPasses"
  | "hwPendingLeave"
  | "hwOpenComplaints"
  | "sportsAthletes"
  | "sportsTeams"
  | "sportsTrialsPending"
  | "sportsOdPending"
  | "sportsDisciplines"
  | "sportsAchievements"
  | "studentCount"
  | "facultyCount"
  | "totalBooks"
  | "leaveRequestsPending"
  | "odRequestsPending"
  | "mrPendingRequests"
  | "mrUpcomingEvents"
  | "mrPendingIndents"
  | "hrPendingRequests"
  | "hrPendingAppraisals"
  | "coeRevaluationPending"
  | "coeExamRegistrations"
  | "coeHallSeating"
  | "coeHallTickets"
  | "coeInvigilation"
  | "coeQuestionPapers"
  | "coeMalpractice"
  | "iqacPendingApprovals"
  | "placementStudents"
  | "placementCompanies"
  | "placementDrives"
  | "billingStudents"
  | "billingConcessions"
  | "billingDD"
  | "financePopPending"
  | "financeSopPending"
  | "financeAwaitingAllotment"
  | "financeFeeOutstanding"
  | "edcAnnouncements"
  | "edcStudents"
  | "edcStartups"
  | "edcIdeas"
  | "edcIncubations"
  | "secretaryPop"
  | "secretarySop"
  | "secretaryMedia"
  | "secretaryVenue"
  | "secretaryOutpass"
  | "secretaryDocs"
  | "secretaryEmpLeave"
  | "secretaryEmpOd"
  | "adminSopPending";

export interface NavItem {
  key: string;
  label: string;
  /** Omit for modules whose design reference uses no icon font at all (e.g. HoD) — Sidebar renders nothing in its place rather than a placeholder glyph. */
  icon?: string;
  href: string;
  /** Populated at render time from live data (recent-item counts, dues, etc.) — never hardcoded. */
  badgeKey?: NavBadgeKey;
  /** Only relevant to hostel residents — the consuming Shell filters this out of the config it passes to AppShell for a day scholar. Omit for items every student should see. */
  hostellerOnly?: boolean;
  /** Tags a nav item as belonging to one declared student career path (Placement/Venture/Higher Studies). The consuming Shell shows it only when the student's own declared path matches, or hasn't declared one yet. Omit for items every student should see regardless of path. */
  careerPath?: "placement" | "venture" | "higher_studies";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface ModuleConfig {
  role: string;
  basePath: string;
  moduleLabel: string;
  navGroups: NavGroup[];
}
