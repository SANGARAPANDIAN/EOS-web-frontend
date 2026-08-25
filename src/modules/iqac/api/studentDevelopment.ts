import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface PlacementsSummary {
  companies_count: number;
  offers_released: number;
  average_package: number | null;
  highest_package: { value: number; company_name: string; job_role: string | null } | null;
  multiple_offers_count: number;
  drives_this_month: number;
  next_drive: { company_name: string; scheduled_date: string } | null;
  overall: { placed: number; eligible: number; unplaced: number; percentage: number | null };
  leading_department: { department: { id: number; name: string; code: string }; placement_rate: number | null } | null;
}

/** GET /me/iqac/student-development/placements/summary — delegates to PrincipalPlacementsService.summary(). */
export function usePlacementsSummary() {
  return useQuery({
    queryKey: ["iqac", "student-development", "placements", "summary"],
    queryFn: () => apiClient.get<PlacementsSummary>("/me/iqac/student-development/placements/summary"),
  });
}

export interface PlacementsDepartmentRow {
  department: { id: number; name: string; code: string };
  eligible: number;
  placed: number;
  unplaced: number;
  placement_rate: number | null;
  average_package: number | null;
  highest_package: number | null;
  rank: number;
}

export function usePlacementsDepartments() {
  return useQuery({
    queryKey: ["iqac", "student-development", "placements", "departments"],
    queryFn: () => apiClient.get<PlacementsDepartmentRow[]>("/me/iqac/student-development/placements/departments"),
  });
}

export interface RecruiterRow {
  company_id: number;
  company_name: string;
  roles: string[];
  offers: number;
  average_package: number | null;
  highest_package: number | null;
  department_codes: string[];
}

/** GET /me/iqac/student-development/placements/recruiters?batch_id= — real, company-wise leading entries, optionally scoped to one real batch. */
export function useLeadingRecruiters(batchId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "student-development", "placements", "recruiters", batchId],
    queryFn: () => apiClient.get<RecruiterRow[]>("/me/iqac/student-development/placements/recruiters", { batch_id: batchId ?? undefined }),
  });
}

export interface PlacementsQuality {
  this_year: number;
  last_year: number;
  target: number | null;
  attainment: number | null;
}

/** GET /me/iqac/student-development/placements/quality — This/Last year real offer counts by drive date, target/attainment from iqac_metric_targets. */
export function usePlacementsQuality() {
  return useQuery({
    queryKey: ["iqac", "student-development", "placements", "quality"],
    queryFn: () => apiClient.get<PlacementsQuality>("/me/iqac/student-development/placements/quality"),
  });
}

export interface RecruiterStudentRow {
  student_id: number;
  name: string;
  roll_no: string | null;
  register_no: string | null;
  department_code: string | null;
  semester: number | null;
  job_role: string | null;
  package: number | null;
  offer_response: string | null;
  status: string;
  updated_at: string;
}

export interface RecruiterStudents {
  company_name: string;
  students: RecruiterStudentRow[];
}

export function useRecruiterStudents(companyId: number | null) {
  return useQuery({
    queryKey: ["iqac", "student-development", "placements", "recruiters", companyId],
    queryFn: () => apiClient.get<RecruiterStudents>(`/me/iqac/student-development/placements/recruiters/${companyId}`),
    enabled: companyId != null,
  });
}

export interface AwardEventRow {
  event_name: string;
  participants: number;
  levels: string[];
  latest_date: string;
  department_codes: string[];
}

/** GET /me/iqac/student-development/awards?batch_id= — real, honestly scoped to sports_achievements (see backend doc comment). */
export function useLeadingAwardEvents(batchId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "student-development", "awards", batchId],
    queryFn: () => apiClient.get<AwardEventRow[]>("/me/iqac/student-development/awards", { batch_id: batchId ?? undefined }),
  });
}

export interface AwardDepartmentRow {
  department: { id: number; name: string; code: string };
  achievements: number;
}

/** GET /me/iqac/student-development/awards/departments?batch_id= — department-wise rollup for the Awards page. */
export function useAwardDepartments(batchId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "student-development", "awards", "departments", batchId],
    queryFn: () => apiClient.get<AwardDepartmentRow[]>("/me/iqac/student-development/awards/departments", { batch_id: batchId ?? undefined }),
  });
}

export interface AwardsQuality {
  this_year: number;
  last_year: number;
  target: number | null;
  attainment: number | null;
}

/** GET /me/iqac/student-development/awards/quality — This/Last year real achievement counts, target/attainment from iqac_metric_targets. */
export function useAwardsQuality() {
  return useQuery({
    queryKey: ["iqac", "student-development", "awards", "quality"],
    queryFn: () => apiClient.get<AwardsQuality>("/me/iqac/student-development/awards/quality"),
  });
}

export interface AwardParticipantRow {
  id: number;
  participant: string;
  result: string;
  level: string | null;
  achievement_date: string;
  venue: string | null;
  certificate_url: string | null;
}

export function useEventParticipants(eventName: string | null) {
  return useQuery({
    queryKey: ["iqac", "student-development", "awards", eventName],
    queryFn: () => apiClient.get<AwardParticipantRow[]>(`/me/iqac/student-development/awards/${encodeURIComponent(eventName!)}`),
    enabled: !!eventName,
  });
}

export interface CreateAwardInput {
  event_name: string;
  result: string;
  achievement_date: string;
  level?: string;
  venue?: string;
  athlete_student_id: number;
}

/** POST /me/iqac/student-development/awards — real sports_achievements insert, backs the "+ Add student entry" action. */
export function useCreateAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAwardInput) => apiClient.post("/me/iqac/student-development/awards", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "student-development", "awards"] });
    },
  });
}

export interface DriveRow {
  id: number;
  company_id?: number;
  companies?: { name: string };
  job_role?: string | null;
  package_lpa?: number | string | null;
  scheduled_date?: string | null;
}

export interface DrivesPage {
  data: DriveRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /me/iqac/student-development/placements/drives?company_id= — real placement_drives list, for the "+ Add student entry" drive picker. */
export function useDrivesList(query: { page?: number; limit?: number; company_id?: number } = {}) {
  return useQuery({
    queryKey: ["iqac", "student-development", "placements", "drives", query],
    queryFn: () => apiClient.get<DrivesPage>("/me/iqac/student-development/placements/drives", query),
  });
}

/** POST /me/iqac/student-development/placements/drives/:driveId/applications — real student_drive_applications insert. */
export function useAddPlacementApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ driveId, student_id }: { driveId: number; student_id: number }) =>
      apiClient.post(`/me/iqac/student-development/placements/drives/${driveId}/applications`, { student_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "student-development", "placements"] });
    },
  });
}

export interface AddPlacementEntryInput {
  student_id: number;
  offer_response?: "accepted" | "pending" | "declined";
  offered_package_lpa?: number;
  /** Real once the additive offer_date column exists on student_drive_applications — silently dropped server-side until then. */
  offer_date?: string;
}

/** POST /me/iqac/student-development/placements/drives/:driveId/entries — real student_drive_applications insert + offer details in one call. */
export function useAddPlacementEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ driveId, ...input }: AddPlacementEntryInput & { driveId: number }) =>
      apiClient.post(`/me/iqac/student-development/placements/drives/${driveId}/entries`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "student-development", "placements"] });
    },
  });
}

export interface StudentSummary {
  id: number;
  name: string;
  roll_no: string;
  department: { id: number; code: string; name: string } | null;
  batch: { name: string } | null;
  semester: number | null;
}

export interface QualityMetric {
  this_year: number;
  last_year: number;
  target: number | null;
  attainment: number | null;
}

export interface CertificationRow {
  id: number;
  student: StudentSummary;
  platform: string | null;
  track: string | null;
  score: string | null;
  completed_on: string | null;
  status: string;
}

/** GET /me/iqac/student-development/certifications/quality */
export function useCertificationsQuality() {
  return useQuery({
    queryKey: ["iqac", "student-development", "certifications", "quality"],
    queryFn: () => apiClient.get<QualityMetric>("/me/iqac/student-development/certifications/quality"),
  });
}

/** GET /me/iqac/student-development/certifications?batch_id= — real student_certificates rows with certificate_type_id null (skill/course certs, distinct from admin documents). */
export function useCertifications(batchId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "student-development", "certifications", batchId],
    queryFn: () => apiClient.get<CertificationRow[]>("/me/iqac/student-development/certifications", { batch_id: batchId ?? undefined }),
  });
}

export interface AddCertificationEntryInput {
  student_id: number;
  platform: string;
  track: string;
  score?: string;
  completed_on?: string;
  status?: "enrolled" | "in_progress" | "completed";
}

/** POST /me/iqac/student-development/certifications — real student_certificates insert. */
export function useAddCertificationEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCertificationEntryInput) => apiClient.post("/me/iqac/student-development/certifications", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "student-development", "certifications"] });
    },
  });
}

export interface CompetitionRow {
  id: number;
  student: StudentSummary;
  event_name: string;
  category: string | null;
  level: string | null;
  held_on: string | null;
  result: string | null;
}

/** GET /me/iqac/student-development/competitions/quality */
export function useCompetitionsQuality() {
  return useQuery({
    queryKey: ["iqac", "student-development", "competitions", "quality"],
    queryFn: () => apiClient.get<QualityMetric>("/me/iqac/student-development/competitions/quality"),
  });
}

/** GET /me/iqac/student-development/competitions?batch_id= — real student_competitions rows. */
export function useCompetitions(batchId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "student-development", "competitions", batchId],
    queryFn: () => apiClient.get<CompetitionRow[]>("/me/iqac/student-development/competitions", { batch_id: batchId ?? undefined }),
  });
}

export interface AddCompetitionEntryInput {
  student_id: number;
  event_name: string;
  category?: string;
  level?: string;
  held_on?: string;
  result?: string;
}

/** POST /me/iqac/student-development/competitions — real student_competitions insert. */
export function useAddCompetitionEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCompetitionEntryInput) => apiClient.post("/me/iqac/student-development/competitions", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "student-development", "competitions"] });
    },
  });
}

export interface HackathonRow {
  id: number;
  student: StudentSummary;
  hackathon_name: string;
  team_name: string | null;
  host: string | null;
  held_on: string | null;
  outcome: string | null;
}

/** GET /me/iqac/student-development/hackathons/quality */
export function useHackathonsQuality() {
  return useQuery({
    queryKey: ["iqac", "student-development", "hackathons", "quality"],
    queryFn: () => apiClient.get<QualityMetric>("/me/iqac/student-development/hackathons/quality"),
  });
}

/** GET /me/iqac/student-development/hackathons?batch_id= — real student_hackathon_participations rows. */
export function useHackathons(batchId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "student-development", "hackathons", batchId],
    queryFn: () => apiClient.get<HackathonRow[]>("/me/iqac/student-development/hackathons", { batch_id: batchId ?? undefined }),
  });
}

export interface AddHackathonEntryInput {
  student_id: number;
  hackathon_name: string;
  team_name?: string;
  host?: string;
  held_on?: string;
  outcome?: string;
}

/** POST /me/iqac/student-development/hackathons — real student_hackathon_participations insert. */
export function useAddHackathonEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddHackathonEntryInput) => apiClient.post("/me/iqac/student-development/hackathons", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "student-development", "hackathons"] });
    },
  });
}
