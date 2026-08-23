export interface Paginated<T> {
  page: number;
  page_size: number;
  total: number;
  data: T[];
}

// Mirrors the backend's `companies` table exactly: id, name, profile_info,
// created_at. Job role, package, eligibility, venue and rounds are all
// per-drive, not per-company — see PlacementDrive.
export const COMPANY_INDUSTRIES = [
  "IT Services",
  "Product",
  "Consulting",
  "Core",
  "Semiconductor",
  "BFSI",
  "BPM",
  "Analytics",
] as const;

export interface Company {
  id: number;
  name: string;
  profileInfo?: string;
  createdAt: string;
  /** Real once query.md #13 runs (`companies` gets the column) — null until then. */
  industry?: string | null;
  location?: string | null;
  recruiterSpoc?: string | null;
  expectedPackageLpa?: number | null;
}

export type CreateCompanyInput = Omit<Company, "id" | "createdAt">;
export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export interface CompanyListParams {
  q?: string;
  page?: number;
  page_size?: number;
}

export type RecruiterStatus = "new" | "returning" | "no_drives";

// One row per company with real, computed recruitment stats — there is no
// `industry`/`location` column anywhere on `companies`, so those aren't part
// of this shape; the Companies page renders an honest "—" for them.
export interface CompanyReportRow {
  id: number;
  name: string;
  profileInfo?: string;
  /** Real once query.md #13 runs — null until then. */
  industry: string | null;
  location: string | null;
  drivesCount: number;
  openRoles: number;
  hired: number;
  averagePackageLpa: number | null;
  highestPackageLpa: number | null;
  lastDriveDate: string | null;
  recruiterStatus: RecruiterStatus;
}

// Mirrors the real backend exactly: student_drive_applications tracks a
// single flat status per student per drive (see ApplicationStatus below),
// not a per-named-round breakdown, so there's no DriveRound concept on the
// backend at all (unlike the earlier UI-first mock).
export type DriveStatus = "scheduled" | "completed" | "cancelled";

export interface PlacementDrive {
  id: number;
  companyId: number;
  companyName: string;
  initials: string;
  status: DriveStatus;
  scheduledDate: string;
  isDisclosed: boolean;
  disclosedRevealDate?: string;
  appliedCount: number;
  // Real columns on placement_drives — nullable, so still optional here.
  role?: string;
  packageLpa?: number;
  eligibilityCgpa?: number;
  venue?: string;
  registrationStart?: string;
  registrationEnd?: string;
}

// Real once query.md #14 runs (`placement_drives` gets the column) — null
// until then.
export type DriveMode = "on_campus" | "virtual";

// Derived from the real status + scheduled_date, not a stored column — the
// reference's Upcoming/Ongoing/Completed 3-state split doesn't exist as-is
// on the real `status` (scheduled/completed/cancelled), so "scheduled" is
// split into upcoming/ongoing by date.
export type DriveDisplayStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export interface CreateDriveInput {
  companyId: number;
  scheduledDate: string;
  isDisclosed: boolean;
  /** Required when isDisclosed is false — must be before scheduledDate. */
  disclosedRevealDate?: string;
  role?: string;
  packageLpa?: number;
  eligibilityCgpa?: number;
  venue?: string;
  /** Must be before registrationEnd (and before scheduledDate). */
  registrationStart?: string;
  registrationEnd?: string;
  mode?: DriveMode;
  backlogsAllowed?: string;
  /** Comma-separated department codes, e.g. "CSE,IT,AIDS". */
  eligibleDepartmentCodes?: string;
  round1Label?: string;
  round2Label?: string;
  round3Label?: string;
  resultDeclarationNote?: string;
}

export interface DriveListParams {
  status?: DriveStatus;
  companyId?: number;
  upcoming?: boolean;
}

// One row per drive with real, computed round-progress stats — powers the
// Placement Drives list.
export interface DriveReportRow {
  id: number;
  companyName: string;
  jobRole?: string;
  scheduledDate: string;
  packageLpa: number | null;
  mode: DriveMode | null;
  applied: number;
  shortlisted: number;
  selected: number;
  conversionPct: number;
  status: DriveStatus;
  displayStatus: DriveDisplayStatus;
}

// Full detail for a single drive — powers the drive detail page's Overview
// and Student list tabs. backlogsAllowed/eligibleDepartmentCodes/round
// labels/resultDeclarationNote are real once query.md #14 runs; null until
// then (rendered as an honest "—", not fabricated).
export interface DriveDetail {
  id: number;
  companyId: number;
  companyName: string;
  role?: string;
  packageLpa?: number;
  eligibilityCgpa?: number;
  mode: DriveMode | null;
  scheduledDate: string;
  venue?: string;
  status: DriveStatus;
  displayStatus: DriveDisplayStatus;
  backlogsAllowed: string | null;
  eligibleDepartmentCodes: string | null;
  round1Label: string | null;
  round2Label: string | null;
  round3Label: string | null;
  resultDeclarationNote: string | null;
  appliedCount: number;
  shortlistedCount: number;
  interviewedCount: number;
  selectedCount: number;
}

// Real once query.md #15 runs (`placement_interviews` table created). The
// interview's own lifecycle, separate from the linked application's
// progress status (see ApplicationStatus below) — "Result" is always read
// from that application, never duplicated here.
export type InterviewStatus = "scheduled" | "in_progress" | "completed";

export interface InterviewRow {
  id: number;
  studentId: number;
  driveId: number;
  interviewDate: string;
  studentName: string;
  studentIdNo: string;
  registerNo: string | null;
  departmentCode: string | null;
  companyName: string;
  jobRole?: string;
  roundLabel: string;
  slotLabel: string;
  panelMember: string;
  status: InterviewStatus;
  applicationStatus: ApplicationStatus | null;
  panelFeedback: string | null;
}

export interface CreateInterviewInput {
  studentId: number;
  driveId: number;
  interviewDate: string;
  roundLabel: string;
  slotLabel: string;
  panelMember: string;
}

export interface RescheduleInterviewInput {
  interviewDate?: string;
  roundLabel?: string;
  slotLabel?: string;
  panelMember?: string;
}

export interface RecordInterviewResultInput {
  result: ApplicationStatus;
  panelFeedback?: string;
}

export type ApplicationStatus = "applied" | "r1_cleared" | "r2_cleared" | "r3_cleared" | "rejected" | "placed";

export interface DriveApplication {
  id: number;
  driveId: number;
  studentId: number;
  studentIdNo: string;
  rollNo: string | null;
  /** Undefined if the student has no soa_applications record linked. */
  studentName?: string;
  /** e.g. "CSE - A" — undefined if the student has no class mapped yet. */
  classLabel?: string;
  /** Full department name (e.g. "Computer Science and Engineering") — undefined if unmapped. */
  departmentName?: string;
  status: ApplicationStatus;
  lastClearedRound: number | null;
  updatedAt: string;
  /** Only meaningful once status is "placed" — null until the officer records a response. */
  offerResponse: OfferResponseStatus | null;
  /** The actual package offered to this student — can differ from the drive's advertised packageLpa. */
  offeredPackageLpa?: number;
}

export interface CreateApplicationInput {
  studentId: number;
}

// An "offer" isn't a real table yet — it's derived from drive applications
// whose status is "placed" (see offers.service.ts). Student/company/response/
// offeredPackageLpa are real; the offer letter has no backend storage
// anywhere, so that stays off this type. `releasedAt` is real — the same
// `updated_at` proxy used throughout this module (see StudentApplicationRow).
export interface Offer {
  id: number;
  driveId: number;
  studentId: number;
  studentIdNo: string;
  rollNo: string | null;
  registerNo: string | null;
  studentName?: string;
  departmentName?: string;
  departmentCode?: string;
  companyName: string;
  jobRole?: string;
  /** The drive's advertised package — fall back to this until offeredPackageLpa is entered. */
  packageLpa?: number;
  /** The actual package offered to this specific student, editable once offerResponse is "accepted". */
  offeredPackageLpa?: number;
  offerResponse: OfferResponseStatus | null;
  /** Real once query.md #16 runs — null until then. */
  joiningDate: string | null;
  workLocation: string | null;
  releasedAt: string;
}

// Persisted on student_drive_applications.offer_response.
export type OfferResponseStatus = "accepted" | "pending" | "declined";

export interface StudentApplicationRow {
  driveId: number;
  companyName: string;
  jobRole?: string;
  status: ApplicationStatus;
  updatedAt: string;
}

export interface StudentOfferRow {
  driveId: number;
  companyName: string;
  jobRole?: string;
  offeredPackageLpa: number | null;
  offerResponse: OfferResponseStatus | null;
  updatedAt: string;
}

// Full profile for one student — powers the Placement Drives student detail
// page (reachable from a drive's Student list). There is no CGPA/backlogs
// column anywhere in the schema, so those stay off this shape entirely
// rather than being faked; the page renders an honest "—" for them.
// `resumeUrl` is real, from `student_profiles.resume_url`.
export interface StudentProfile {
  id: number;
  studentIdNo: string;
  registerNo: string | null;
  name: string;
  email: string;
  departmentName?: string;
  departmentCode?: string;
  year: number | null;
  photoUrl: string | null;
  resumeUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  leetcodeUrl: string | null;
  hackerrankUrl: string | null;
  codeforcesUrl: string | null;
  drivesApplied: number;
  offersCount: number;
  status: ApplicationStatus | null;
  applications: StudentApplicationRow[];
  offers: StudentOfferRow[];
}

export interface UpcomingDrive {
  id: number;
  date: string;
  day: string;
  month: string;
  company: string;
  // No placement_drives column for venue yet — role is real, venue stays
  // undefined until the backend adds it.
  role?: string;
  venue?: string;
}

export interface PlacementFunnel {
  eligible: number;
  applied: number;
  shortlisted: number;
  interviewed: number;
  offers: number;
  placed: number;
}

export interface PackageBand {
  label: string;
  count: number;
}

export interface TrendPoint {
  cycle: string;
  rate: number;
}

export interface TopRecruiter {
  company: string;
  offers: number;
  avgPackageLpa: number;
}

export interface AttentionFlag {
  title: string;
  description: string;
  href: string;
}

export interface DashboardSummary {
  totalCompanies: number;
  companiesAddedThisMonth: number;
  activeDrives: number;
  drivesClosingThisWeek: number;
  studentsInProcess: number;
  studentsInProcessDriveCount: number;
  studentsPlaced: number;
  /** Real count of offers with offer_response === "accepted" — student's own choice, distinct from studentsPlaced (which just means the application reached "placed" status). */
  acceptedOffersCount: number;
  studentsPlacedYoyPct: number;
  placementPercentage: number;
  highestPackageLpa: number;
  averagePackageLpa: number;
  offersByMonth: { month: string; count: number }[];
  placementRateByDepartment: { department: string; placed: number; total: number }[];
  upcomingDrives: UpcomingDrive[];
  eligibleStudentsTotal: number;
  funnel: PlacementFunnel;
  packageBands: PackageBand[];
  sixYearTrend: TrendPoint[];
  topRecruiters: TopRecruiter[];
  attentionFlags: AttentionFlag[];
}

// Full student roster, from GET /student-profiles (placement/admin only).
// Powers eligible-student counts, department/class breakdowns and the
// Round Management student search — none of that is derivable from
// student_drive_applications alone, since that only has students who
// already applied to a drive.
export interface EligibleStudent {
  id: number;
  studentIdNo: string;
  rollNo: string | null;
  name?: string;
  classLabel?: string;
  departmentName?: string;
}

export interface Batch {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
}

export type ReportExportFormat = "pdf" | "excel";

// One row per student in the full roster, joined with their best placement
// application (if any) — powers the Student Reports page's "attended /
// rounds cleared" view. `status`/`lastClearedRound` are null when the
// student never applied to any drive.
export interface StudentReportRow {
  id: number;
  studentIdNo: string;
  rollNo: string | null;
  registerNo: string | null;
  name?: string;
  classLabel?: string;
  departmentName?: string;
  departmentCode?: string;
  /** I-IV, derived from the real current_semester — null if the student has no class assignment yet. */
  year: number | null;
  drivesApplied: number;
  /** Real count of applications that reached an offer (placed or a recorded offer_response). */
  offersCount: number;
  status: ApplicationStatus | null;
  lastClearedRound: number | null;
  companyName?: string;
  /** Real once query.md #17 runs (`students` gets the column) — null ("not yet assessed") until then; officer-set, never computed. */
  placementEligible: boolean | null;
  /** Real once query.md #17 runs — false until the officer marks it, never inferred. */
  placementOptedOut: boolean;
}

export type UpdatePlacementStatusInput = Partial<{
  placementEligible: boolean;
  placementOptedOut: boolean;
}>;

export interface Department {
  id: number;
  name: string;
  code: string;
}

// Mirrors the real `classes` table — batch/department/course/section are
// each real foreign keys, current_semester is the one derived-from-real
// value used to group "years" in the audience picker.
export interface ClassSummary {
  id: number;
  batchId: number;
  departmentId: number;
  courseId: number;
  section: string;
  currentSemester: number | null;
}

// `roles` is intentionally excluded here — CreateAnnouncementDto has no
// role_ids field, so an officer picking "roles" audience through this
// composer would create a post nobody's role-mapping ever points at.
export type AnnouncementAudience = "students" | "teachers" | "parents";

export type AnnouncementStatus = "draft" | "published";

export interface AnnouncementListItem {
  id: number;
  postedByUserId: number;
  title: string;
  content: string;
  targetAudience: AnnouncementAudience | "roles";
  status: AnnouncementStatus;
  /** Real once query.md #2 runs (`announcements` gets the column) — null until then. */
  category: string | null;
  createdAt: string;
  fileUrl: string | null;
  fileName: string | null;
  classIds: number[];
  classLabels: string[];
  roleLabels: string[];
  postedBy: { name: string; role: string; designation: string | null; department: string | null };
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  targetAudience: AnnouncementAudience;
  classIds: number[];
  status?: AnnouncementStatus;
  category?: string;
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export const ANNOUNCEMENT_CATEGORIES = ["academic", "department", "emergency", "event", "general"] as const;

// `academic_calendars` is a per-batch/semester period (start_date/end_date);
// `calendar_events` are the actual dated entries inside one. Both real,
// both read-only for the placement role — write access is Academic
// Coordinator / Principal only.
export interface AcademicCalendarPeriod {
  id: number;
  batchId: number;
  semester: number;
  startDate: string;
  endDate: string;
}

export type CalendarEventType = "holiday" | "event" | "instruction" | "assessment" | "placement" | "institution";

export interface CalendarEventItem {
  id: number;
  academicCalendarId: number;
  eventDate: string;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  startTime: string | null;
  endTime: string | null;
}
