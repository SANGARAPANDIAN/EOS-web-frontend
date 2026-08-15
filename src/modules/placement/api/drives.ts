import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";

// Real once query.md #14 runs (`placement_drives` gets the column) — null
// until then.
export type DriveMode = "on_campus" | "virtual";

export type DriveStatus = "scheduled" | "completed" | "cancelled";

// Derived from the real status + scheduled_date, not a stored column — the
// Upcoming/Ongoing/Completed 3-state split doesn't exist as-is on the real
// `status` (scheduled/completed/cancelled), so "scheduled" is split into
// upcoming/ongoing by date.
export type DriveDisplayStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

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
  role?: string;
  packageLpa?: number;
  eligibilityCgpa?: number;
  venue?: string;
  registrationStart?: string;
  registrationEnd?: string;
}

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

interface BackendDrive {
  id: number;
  company_id: number;
  is_disclosed: boolean;
  disclosed_reveal_date: string | null;
  scheduled_date: string;
  status: DriveStatus;
  job_role: string | null;
  // Prisma Decimal fields serialize as strings over JSON, not numbers.
  package_lpa: string | null;
  eligibility_cgpa: string | null;
  venue: string | null;
  registration_start: string | null;
  registration_end: string | null;
  // GET /drives/:id doesn't include this relation (no `include` in the
  // backend's findOne) — only list/create/update do.
  companies?: { id: number; name: string; profile_info: string | null };
  _count?: { student_drive_applications: number };
}

interface BackendDriveReportRow {
  id: number;
  company_name: string;
  job_role: string | null;
  scheduled_date: string;
  package_lpa: number | null;
  mode: DriveMode | null;
  applied: number;
  shortlisted: number;
  selected: number;
  conversion_pct: number;
  status: DriveStatus;
  display_status: DriveDisplayStatus;
}

interface BackendDriveDetail extends BackendDrive {
  applied_count: number;
  shortlisted_count: number;
  interviewed_count: number;
  selected_count: number;
  display_status: DriveDisplayStatus;
  mode: DriveMode | null;
  backlogs_allowed: string | null;
  eligible_department_codes: string | null;
  round1_label: string | null;
  round2_label: string | null;
  round3_label: string | null;
  result_declaration_note: string | null;
}

interface BackendPaginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function toDrive(d: BackendDrive): PlacementDrive {
  const companyName = d.companies?.name ?? "Unknown company";
  return {
    id: d.id,
    companyId: d.company_id,
    companyName,
    initials: initials(companyName),
    status: d.status,
    scheduledDate: d.scheduled_date,
    isDisclosed: d.is_disclosed,
    disclosedRevealDate: d.disclosed_reveal_date ?? undefined,
    appliedCount: d._count?.student_drive_applications ?? 0,
    role: d.job_role ?? undefined,
    packageLpa: d.package_lpa !== null ? Number(d.package_lpa) : undefined,
    eligibilityCgpa: d.eligibility_cgpa !== null ? Number(d.eligibility_cgpa) : undefined,
    venue: d.venue ?? undefined,
    registrationStart: d.registration_start ?? undefined,
    registrationEnd: d.registration_end ?? undefined,
  };
}

function toReportRow(r: BackendDriveReportRow): DriveReportRow {
  return {
    id: r.id,
    companyName: r.company_name,
    jobRole: r.job_role ?? undefined,
    scheduledDate: r.scheduled_date,
    packageLpa: r.package_lpa,
    mode: r.mode,
    applied: r.applied,
    shortlisted: r.shortlisted,
    selected: r.selected,
    conversionPct: r.conversion_pct,
    status: r.status,
    displayStatus: r.display_status,
  };
}

function toDriveDetail(d: BackendDriveDetail): DriveDetail {
  return {
    id: d.id,
    companyId: d.company_id,
    companyName: d.companies?.name ?? "Unknown company",
    role: d.job_role ?? undefined,
    packageLpa: d.package_lpa !== null ? Number(d.package_lpa) : undefined,
    eligibilityCgpa: d.eligibility_cgpa !== null ? Number(d.eligibility_cgpa) : undefined,
    mode: d.mode,
    scheduledDate: d.scheduled_date,
    venue: d.venue ?? undefined,
    status: d.status,
    displayStatus: d.display_status,
    backlogsAllowed: d.backlogs_allowed,
    eligibleDepartmentCodes: d.eligible_department_codes,
    round1Label: d.round1_label,
    round2Label: d.round2_label,
    round3Label: d.round3_label,
    resultDeclarationNote: d.result_declaration_note,
    appliedCount: d.applied_count,
    shortlistedCount: d.shortlisted_count,
    interviewedCount: d.interviewed_count,
    selectedCount: d.selected_count,
  };
}

export function useDrives(params: DriveListParams = {}) {
  return useQuery({
    queryKey: placementKeys.drives.list(params),
    queryFn: async () => {
      const res = await apiClient.get<BackendPaginated<BackendDrive>>("/drives", {
        status: params.status,
        company_id: params.companyId,
        upcoming: params.upcoming,
        limit: 100,
      });
      return res.data.map(toDrive);
    },
  });
}

export function useDrive(id: number | null) {
  return useQuery({
    queryKey: placementKeys.drives.detail(id ?? 0),
    queryFn: async () => toDriveDetail(await apiClient.get<BackendDriveDetail>(`/drives/${id}`)),
    enabled: id !== null,
  });
}

export function useDriveReport() {
  return useQuery({
    queryKey: placementKeys.drives.report(),
    queryFn: async () => {
      const rows = await apiClient.get<BackendDriveReportRow[]>("/drives/report");
      return rows.map(toReportRow);
    },
  });
}

function useInvalidateDrives() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: placementKeys.drives.all() });
    queryClient.invalidateQueries({ queryKey: placementKeys.dashboard() });
  };
}

export function useCreateDrive() {
  const invalidate = useInvalidateDrives();
  return useMutation({
    mutationFn: async (input: CreateDriveInput) =>
      toDrive(
        await apiClient.post<BackendDrive>("/drives", {
          company_id: input.companyId,
          scheduled_date: input.scheduledDate,
          is_disclosed: input.isDisclosed,
          disclosed_reveal_date: input.isDisclosed ? undefined : input.disclosedRevealDate,
          job_role: input.role,
          package_lpa: input.packageLpa,
          eligibility_cgpa: input.eligibilityCgpa,
          venue: input.venue,
          registration_start: input.registrationStart,
          registration_end: input.registrationEnd,
          mode: input.mode,
          backlogs_allowed: input.backlogsAllowed,
          eligible_department_codes: input.eligibleDepartmentCodes,
          round1_label: input.round1Label,
          round2_label: input.round2Label,
          round3_label: input.round3Label,
          result_declaration_note: input.resultDeclarationNote,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateDriveStatus() {
  const invalidate = useInvalidateDrives();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: DriveStatus }) =>
      apiClient.patch(`/drives/${id}`, { status }),
    onSuccess: invalidate,
  });
}
