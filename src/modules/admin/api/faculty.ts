import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type FacultyStatus = "active" | "inactive";

export interface FacultyDepartmentRef {
  id: number;
  name: string;
  code?: string;
}

export interface FacultySensitiveInfo {
  aadhar_number?: string | null;
  pan_number?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
}

/** Optional subset shared by create/update payloads — mirrors the backend's FacultyExtendedFieldsDto. */
export interface FacultyExtendedFields {
  prefix?: string;
  gender?: string;
  date_of_birth?: string;
  personal_email?: string;
  whatsapp_number?: string;
  alternate_phone?: string;
  address_line?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  academic_role?: string;
  employment_status?: string;
  employment_type?: string;
  confirmation_date?: string;
  probation_end_date?: string;
  work_location?: string;
  qualification?: string;
  specialization?: string;
  previous_institution?: string;
  previous_experience_years?: number;
  office_room?: string;
  is_mentor?: boolean;
  phone_verified?: boolean;
  whatsapp_verified?: boolean;
}

/**
 * The list endpoint (GET /me/faculty) doesn't select the "extended" fields
 * below — only GET /me/faculty/:id returns them.
 */
export interface Faculty extends FacultyExtendedFields {
  id: number;
  email: string;
  phone?: string | null;
  first_name: string;
  last_name: string;
  designation: string;
  department_id: number;
  department?: FacultyDepartmentRef;
  date_of_joining?: string | null;
  status: FacultyStatus;
  sensitive_info?: FacultySensitiveInfo;
  created_at?: string;
  profile_url?: string | null;
}

export interface FacultyActivityEntry {
  id: number;
  description: string;
  created_at: string;
  created_by_email: string;
}

export type FacultyAttendanceStatus = "full_day" | "half_day" | "absent" | "on_duty" | "on_leave" | "weekly_off" | "holiday";

export interface FacultyAttendanceDay {
  date: string;
  day: string;
  punch_in: string | null;
  punch_out: string | null;
  status: FacultyAttendanceStatus;
}

/** on_leave counts against the percentage like an absence; on_duty/on_vacation are excused (excluded). */
export interface FacultyAttendanceStats {
  full_days: number;
  half_days: number;
  absent: number;
  on_leave: number;
  on_duty: number;
  on_vacation: number;
  attendance_percentage: number;
}

export interface MarkFacultyAttendanceInput {
  status: FacultyAttendanceStatus;
  punch_in?: string;
  punch_out?: string;
}

export interface MarkFacultyAttendanceResult {
  faculty_id: number;
  date: string;
  status: FacultyAttendanceStatus;
  punch_in: string | null;
  punch_out: string | null;
}

export interface FacultyAttendanceMonth extends FacultyAttendanceStats {
  month: string;
  label: string;
  days: FacultyAttendanceDay[];
}

export interface FacultyAttendanceSummary {
  faculty_id: number;
  overall: FacultyAttendanceStats;
  months: FacultyAttendanceMonth[];
}

export interface FacultyAttendanceOverviewRow extends FacultyAttendanceStats {
  faculty_id: number;
  prefix?: string;
  first_name: string;
  last_name: string;
  profile_url?: string | null;
  department: FacultyDepartmentRef;
  today_status?: FacultyAttendanceStatus;
  is_unaccounted_absent_today?: boolean;
}

export interface FacultyAttendanceOverview {
  today: FacultyAttendanceStats;
  rows: FacultyAttendanceOverviewRow[];
}

export interface FacultyAttendanceOverviewParams {
  [key: string]: string | number | boolean | undefined | null;
  department_id?: number;
  academic_year?: string;
  search?: string;
}

export interface FacultyListParams {
  [key: string]: string | number | boolean | undefined | null;
  department_id?: number;
  status?: FacultyStatus;
  designation?: string;
  year?: number;
  search?: string;
  employment_status?: string;
  limit?: number;
  page?: number;
}

export interface FacultyListResponse {
  data: Faculty[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type CreateFacultyInput = FacultyExtendedFields & {
  email: string;
  first_name: string;
  last_name: string;
  designation: string;
  department_id: number;
  phone?: string;
  date_of_joining?: string;
  sensitive_info?: FacultySensitiveInfo;
};

export type UpdateFacultyInput = FacultyExtendedFields & {
  first_name?: string;
  last_name?: string;
  designation?: string;
  department_id?: number;
  date_of_joining?: string;
  status?: FacultyStatus;
  phone?: string;
  sensitive_info?: FacultySensitiveInfo;
};

/**
 * Every faculty endpoint lives under /me/faculty — Swagger's documented
 * /api/v1/faculty 404s live, this is the real, verified route.
 */
const BASE = "/me/faculty";

const base = ["faculty"] as const;

export const facultyKeys = {
  all: base,
  list: (params: FacultyListParams = {}) => [...base, "list", params] as const,
  detail: (id: number) => [...base, "detail", id] as const,
  mappings: (params: Record<string, unknown> = {}) => [...base, "mappings", params] as const,
  documents: (facultyId: number) => [...base, "documents", facultyId] as const,
  activity: (facultyId: number) => [...base, "activity", facultyId] as const,
  attendance: (facultyId: number) => [...base, "attendance", facultyId] as const,
  attendanceOverview: (params: FacultyAttendanceOverviewParams = {}) => [...base, "attendance-overview", params] as const,
  idCardStatus: (facultyIds: number[]) => [...base, "id-card-status", facultyIds] as const,
};

export function useFaculties(params: FacultyListParams) {
  return useQuery({
    queryKey: facultyKeys.list(params),
    queryFn: () => apiClient.get<FacultyListResponse>(BASE, params),
    placeholderData: keepPreviousData,
  });
}

/** Reads only `meta.total` — a single-row read (`limit: 1`) so this stays cheap regardless of roll size. */
export function useFacultyCount() {
  return useQuery({
    queryKey: facultyKeys.list({ limit: 1 }),
    queryFn: () => apiClient.get<FacultyListResponse>(BASE, { limit: 1 }),
    select: (res) => res.meta.total,
  });
}

export function useFacultyById(id: number | null) {
  return useQuery({
    queryKey: facultyKeys.detail(id ?? -1),
    queryFn: () => apiClient.get<Faculty>(`${BASE}/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

/** Non-hook read for contexts outside React (e.g. the ID card image generator, which needs each faculty's full record). */
export function fetchFacultyById(id: number): Promise<Faculty> {
  return apiClient.get<Faculty>(`${BASE}/${id}`);
}

export function useFacultyActivity(facultyId: number | null) {
  return useQuery({
    queryKey: facultyKeys.activity(facultyId ?? -1),
    queryFn: () => apiClient.get<FacultyActivityEntry[]>(`${BASE}/${facultyId}/activity`),
    enabled: facultyId !== null && Number.isFinite(facultyId),
  });
}

export function useFacultyAttendance(facultyId: number | null) {
  return useQuery({
    queryKey: facultyKeys.attendance(facultyId ?? -1),
    queryFn: () => apiClient.get<FacultyAttendanceSummary>(`${BASE}/${facultyId}/attendance`),
    enabled: facultyId !== null && Number.isFinite(facultyId),
  });
}

export function useFacultyAttendanceOverview(params: FacultyAttendanceOverviewParams) {
  return useQuery({
    queryKey: facultyKeys.attendanceOverview(params),
    queryFn: () => apiClient.get<FacultyAttendanceOverview>(`${BASE}/attendance/overview`, params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFacultyInput) => apiClient.post<Faculty>(BASE, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: facultyKeys.all }),
  });
}

export function useUpdateFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateFacultyInput }) =>
      apiClient.patch<Faculty>(`${BASE}/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: facultyKeys.all }),
  });
}

export interface NotifyFacultyInput {
  title: string;
  message: string;
}

/** POST /me/faculty/:id/notify — sends straight to this faculty member's own notification inbox (bell icon), real push included. */
export function useNotifyFaculty() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: NotifyFacultyInput }) =>
      apiClient.post<{ sent: boolean }>(`${BASE}/${id}/notify`, input),
  });
}

export function useMarkFacultyAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date, input }: { id: number; date: string; input: MarkFacultyAttendanceInput }) =>
      apiClient.patch<MarkFacultyAttendanceResult>(`${BASE}/${id}/attendance/${date}`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: facultyKeys.attendance(id) });
      queryClient.invalidateQueries({ queryKey: [...facultyKeys.all, "attendance-overview"] });
    },
  });
}
