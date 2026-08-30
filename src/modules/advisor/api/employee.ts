import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// EMPLOYEE-group hooks — faculty self-service endpoints (not class-facing).
// All shapes confirmed by reading the actual controllers/DTOs/services.

// ---- My Attendance --------------------------------------------------------
// GET /me/staff-attendance (MeStaffAttendanceService.getMyStaffAttendance)
export interface StaffAttendanceMonth {
  year: number;
  month: number;
  stats: { present: number; absent: number; onDuty: number; overallPercent: number };
  marks: Record<string, "present" | "absent" | "onDuty" | "holiday">;
}

export function useMyStaffAttendance(year?: number, month?: number) {
  return useQuery({
    queryKey: ["me", "staff-attendance", year, month],
    queryFn: () => apiClient.get<StaffAttendanceMonth>("/me/staff-attendance", { year, month }),
  });
}

// ---- Timetable -------------------------------------------------------------
// GET /me/classes/today — no room/completed fields exist on this endpoint at all.
export interface TodaySlot {
  id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  // Real column (subjects.course_type) — the subjects join already existed
  // server-side for subject_name, this just also selects course_type so
  // "today" can detect labs the same way the full-week grid already does,
  // instead of hardcoding false.
  course_type: string | null;
  class_id: number;
  class_section: string;
  // classes.current_semester — null for a class with no semester set yet,
  // same nullability as everywhere else this column is surfaced.
  semester: number | null;
  department_name: string;
}

export function useTodaySlots() {
  return useQuery({
    queryKey: ["me", "classes", "today"],
    queryFn: () => apiClient.get<TodaySlot[]>("/me/classes/today"),
  });
}

// GET /me/faculty-timetable
export interface FacultyTimetableSlot {
  period_number: number;
  start_time: string;
  end_time: string;
  subject: { id: number; name: string; subject_code: string; course_type: string | null };
  faculty: { id: number; name: string };
}
export interface FacultyTimetableDay {
  day_of_week: number;
  slots: FacultyTimetableSlot[];
}

export function useFacultyTimetable() {
  return useQuery({
    queryKey: ["me", "faculty-timetable"],
    queryFn: () => apiClient.get<{ days: FacultyTimetableDay[] }>("/me/faculty-timetable"),
  });
}

// GET /me/faculty-academic-calendar
export interface FacultyAcademicCalendarEvent {
  id: number;
  event_date: string;
  // Nominally required by the backend DTO, but real responses have shown
  // this missing/null on some rows — treat defensively at every call site.
  event_type: string | null;
  title: string;
  description: string | null;
}

export function useFacultyAcademicCalendar() {
  return useQuery({
    queryKey: ["me", "faculty-academic-calendar"],
    queryFn: () =>
      apiClient.get<{ semester: number | null; start_date: string | null; end_date: string | null; events: FacultyAcademicCalendarEvent[] }>(
        "/me/faculty-academic-calendar",
      ),
  });
}

// ---- My Leave ----------------------------------------------------------------
export interface FacultyLeaveRow {
  id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  hod_approval_status: string;
  hr_approval_status: string;
  overall_status: "pending" | "approved" | "rejected" | null;
  created_at: string;
}

export function useMyFacultyLeaves() {
  return useQuery({
    queryKey: ["me", "faculty-leaves"],
    queryFn: () => apiClient.get<{ data: FacultyLeaveRow[]; meta: { total: number } }>("/me/faculty-leaves", { limit: 100 }),
  });
}

export function useCreateFacultyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { from_date: string; to_date: string; reason?: string }) => apiClient.post("/me/create-leaves", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "faculty-leaves"] }),
  });
}

// ---- My OD ---------------------------------------------------------------------
export interface FacultyOdRow {
  id: number;
  from_date: string;
  to_date: string;
  place: string | null;
  purpose: string | null;
  hod_approval_status: string;
  hr_approval_status: string;
  overall_status: "pending" | "approved" | "rejected" | null;
  created_at: string;
}

export function useMyFacultyOds() {
  return useQuery({
    queryKey: ["me", "faculty-od"],
    queryFn: () => apiClient.get<{ data: FacultyOdRow[]; meta: { total: number } }>("/me/faculty-od", { limit: 100 }),
  });
}

export function useCreateFacultyOd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { from_date: string; to_date: string; place?: string; purpose?: string }) => apiClient.post("/me/create-od", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "faculty-od"] }),
  });
}

// ---- Venue booking ---------------------------------------------------------------
export interface VenueAvailability {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
  is_available: boolean;
  booking: { purpose: string; booked_by: string; accommodating_strength: number | null; from_datetime: string; to_datetime: string } | null;
  /** Real COE exam hall-plan blocking this venue, if any — distinct from a regular `booking`. */
  exam_usage: { exam_date: string; exam_label: string } | null;
}

// ListVenueQueryDto requires `from`/`to` (ISO datetime, no @IsOptional()) —
// this endpoint's whole purpose is an availability check for a window, so
// there's no "list all venues" variant. Default to a one-year-ahead window
// so the booking dropdown has something to show before the user has picked
// their own dates.
export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: () => {
      const now = new Date();
      const oneYearOut = new Date(now);
      oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
      return apiClient.get<{ data: VenueAvailability[] }>("/venues", { from: now.toISOString(), to: oneYearOut.toISOString(), limit: 100 });
    },
  });
}

export interface VenueBookingRow {
  id: number;
  venue_id: number;
  purpose: string;
  from_datetime: string;
  to_datetime: string;
  accommodating_strength: number | null;
  status: string | null;
  created_at: string;
  venues_venue_bookings_venue_idTovenues: { id: number; name: string; location: string | null; capacity: number | null };
}

export function useMyVenueBookings() {
  return useQuery({
    queryKey: ["venue-bookings"],
    queryFn: () => apiClient.get<{ data: VenueBookingRow[] }>("/venue-bookings", { limit: 100 }),
  });
}

export function useCreateVenueBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { venue_id: number; purpose: string; from_datetime: string; to_datetime: string; accommodating_strength?: number }) =>
      apiClient.post("/venue-bookings", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
    },
  });
}

// ---- Payroll / Payslip -------------------------------------------------------------
export interface HrPayrollRow {
  id: number;
  month: string;
  year: number;
  month_number: number;
  gross_amount: number;
  net_amount: number;
  paid_at: string | null;
  status: "processed" | "pending" | "hold";
  deductions_amount: number | null;
  lop_days: number | null;
  lop_amount: number | null;
}

export function useMyHrPayroll() {
  return useQuery({
    queryKey: ["me", "hr-payroll"],
    queryFn: () => apiClient.get<{ data: HrPayrollRow[] }>("/me/hr-payroll", { limit: 100 }),
  });
}

export interface PayslipRequestRow {
  id: number;
  month: string;
  status: string | null;
  file_url: string | null;
  requested_at: string;
  purpose: string | null;
}

export function useMyPayslipRequests() {
  return useQuery({
    queryKey: ["me", "payslip-requests"],
    queryFn: () => apiClient.get<{ data: PayslipRequestRow[] }>("/me/payslip-requests", { limit: 100 }),
  });
}

export function useCreatePayslipRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { month: string; purpose?: string }) => apiClient.post("/me/payslip-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "payslip-requests"] }),
  });
}

/** DELETE /me/payslip-requests/:id — withdraw a request while it's still
 * 'pending' (own request only; enforced server-side). */
export function useDeletePayslipRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/payslip-requests/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "payslip-requests"] }),
  });
}

// ---- Appraisal ---------------------------------------------------------------------
export interface AppraisalCriterion {
  id: number;
  name: string;
  max_score: number;
}
export interface AppraisalDivision {
  id: number;
  name: string;
  criteria: AppraisalCriterion[];
}

export function useAppraisalCriteria() {
  return useQuery({
    queryKey: ["me", "appraisal-criteria"],
    queryFn: () => apiClient.get<{ academic_year: string | null; divisions: AppraisalDivision[] }>("/me/appraisal-criteria"),
  });
}

export interface AppraisalAttachment {
  id: number;
  division_id: number;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export interface AppraisalRequestRow {
  id: number;
  academic_year: string;
  status: string | null;
  faculty: { id: number; first_name: string; last_name: string; designation: string; department_name: string };
  hod_reviewer: { id: number; email: string } | null;
  hod_reviewed_at: string | null;
  hod_remarks: string | null;
  management_approver: { id: number; email: string } | null;
  management_approved_at: string | null;
  created_at: string;
  entries: { id: number; description: string | null; score: number | null; criteria: { id: number; name: string; max_score: number; division: { id: number; name: string } } }[];
  attachments: AppraisalAttachment[];
}

export function useMyAppraisalRequests() {
  return useQuery({
    queryKey: ["me", "appraisal_requests"],
    queryFn: () => apiClient.get<{ data: AppraisalRequestRow[] }>("/me/appraisal_requests", { limit: 100 }),
  });
}

/** GET /me/appraisal_requests/:id — single record (own only), used to
 * refresh attachments right after an upload without refetching the whole
 * paginated history list. */
export function useAppraisalRequest(id: number | undefined) {
  return useQuery({
    queryKey: ["me", "appraisal_requests", id],
    queryFn: () => apiClient.get<AppraisalRequestRow>(`/me/appraisal_requests/${id}`),
    enabled: id !== undefined,
  });
}

export function useCreateAppraisalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { academic_year: string; entries: { criteria_id: number; description?: string }[] }) =>
      apiClient.post("/me/appraisal_requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "appraisal_requests"] }),
  });
}

/** DELETE /me/appraisal_requests/:id — own request, only while still
 * 'submitted'. There is no edit-in-place endpoint on the backend (PATCH is
 * HoD/HR-only and is a status transition, not a content edit) — this is the
 * real substitute for "edit": delete and resubmit while still submitted. */
export function useDeleteAppraisalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/appraisal_requests/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "appraisal_requests"] }),
  });
}

/** POST /me/appraisal_requests/:id/attachments — multipart, own request,
 * only while still 'submitted'. Up to 5 files per call, 10MB each. */
export function useUploadAppraisalAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, divisionId, files }: { requestId: number; divisionId: number; files: File[] }) => {
      const form = new FormData();
      form.append("division_id", String(divisionId));
      files.forEach((f) => form.append("files", f));
      return apiClient.postForm(`/me/appraisal_requests/${requestId}/attachments`, form);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["me", "appraisal_requests"] });
      queryClient.invalidateQueries({ queryKey: ["me", "appraisal_requests", vars.requestId] });
    },
  });
}

/** DELETE /me/appraisal_requests/:id/attachments/:attachmentId — own request, only while still 'submitted'. */
export function useRemoveAppraisalAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, attachmentId }: { requestId: number; attachmentId: number }) =>
      apiClient.delete(`/me/appraisal_requests/${requestId}/attachments/${attachmentId}`),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["me", "appraisal_requests"] });
      queryClient.invalidateQueries({ queryKey: ["me", "appraisal_requests", vars.requestId] });
    },
  });
}
