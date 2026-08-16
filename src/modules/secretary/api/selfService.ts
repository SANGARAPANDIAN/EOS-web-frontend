import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1's faculty-leaves/faculty-od/payslip-requests/
// faculty-attendance/borrow-records modules — each extended this session
// with a Secretary self-service branch (skips the faculty-row lookup,
// scopes by the real `staff_user_id` column added by the Secretary module
// completion migration instead of faculty_id). Genuinely real, no fake data.

export interface StaffLeaveRow {
  id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  hod_approval_status: string;
  hr_approval_status: string;
  overall_status: "pending" | "approved" | "rejected";
  created_at: string;
}
export interface StaffOdRow {
  id: number;
  from_date: string;
  to_date: string;
  place: string | null;
  purpose: string | null;
  hod_approval_status: string;
  hr_approval_status: string;
  overall_status: "pending" | "approved" | "rejected";
  created_at: string;
}
export interface StaffPayslipRow {
  id: number;
  month: string;
  status: string;
  file_url: string | null;
  requested_at: string;
  purpose: string | null;
}
export interface MyAttendanceDay {
  date: string;
  day: string;
  punch_in: string | null;
  punch_out: string | null;
  status: string;
}
export interface MyAttendanceOverview {
  full_days: number;
  half_days: number;
  absent: number;
  on_duty_or_leave: number;
  attendance_percentage: number;
  days: MyAttendanceDay[];
}
export interface StaffBorrowRow {
  id: number;
  book_id: number;
  title: string;
  author: string;
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: string;
  renewal_count: number;
  last_renewed_at: string | null;
}

// --- My Attendance (read-only — see faculty-attendance.controller.ts doc) ---
export function useMyAttendance() {
  return useQuery({
    queryKey: ["secretary", "my-attendance"],
    queryFn: () => apiClient.get<MyAttendanceOverview>("/me/faculty/my-attendance"),
  });
}

// --- Staff Leave ---
export function useMyLeaves() {
  return useQuery({
    queryKey: ["secretary", "my-leaves"],
    queryFn: () => apiClient.get<{ data: StaffLeaveRow[] }>("/me/faculty-leaves").then((r) => r.data),
  });
}
export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { from_date: string; to_date: string; reason?: string }) =>
      apiClient.post("/me/create-leaves", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-leaves"] }),
  });
}
export function useUpdateOwnLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; from_date?: string; to_date?: string; reason?: string }) =>
      apiClient.patch(`/me/my-leaves/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-leaves"] }),
  });
}
export function useWithdrawLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/faculty-leaves/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-leaves"] }),
  });
}

// --- Staff OD ---
export function useMyOds() {
  return useQuery({
    queryKey: ["secretary", "my-od"],
    queryFn: () => apiClient.get<{ data: StaffOdRow[] }>("/me/faculty-od").then((r) => r.data),
  });
}
export function useApplyOd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { from_date: string; to_date: string; place?: string; purpose?: string }) =>
      apiClient.post("/me/create-od", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-od"] }),
  });
}
export function useUpdateOwnOd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; from_date?: string; to_date?: string; place?: string; purpose?: string }) =>
      apiClient.patch(`/me/my-od/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-od"] }),
  });
}
export function useWithdrawOd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/faculty-od/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-od"] }),
  });
}

// --- Payslip ---
export function useMyPayslips() {
  return useQuery({
    queryKey: ["secretary", "my-payslips"],
    queryFn: () => apiClient.get<{ data: StaffPayslipRow[] }>("/me/payslip-requests").then((r) => r.data),
  });
}
export function useRequestPayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { month: string; purpose?: string }) => apiClient.post("/me/payslip-requests", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-payslips"] }),
  });
}
export function useUpdateOwnPayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, purpose }: { id: number; purpose: string }) =>
      apiClient.patch(`/me/my-payslip-requests/${id}`, { purpose }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-payslips"] }),
  });
}
export function useWithdrawPayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/payslip-requests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-payslips"] }),
  });
}

// --- Library (self-borrow, borrower_type "staff") ---
export function useMyStaffBorrowRecords() {
  return useQuery({
    queryKey: ["secretary", "my-borrow-records"],
    queryFn: () => apiClient.get<{ data: StaffBorrowRow[] }>("/me/library/staff-borrow-records").then((r) => r?.data ?? []),
  });
}
// No self-service borrow/renew — reverted per the user's explicit call
// that a real book can only be checked out/renewed/returned by library
// staff at the desk. useMyStaffBorrowRecords() (read) is the only real
// hook for this feature; the backend routes for borrow/renew were removed
// to match (see borrow-records.controller.ts).

// --- Appraisal (real, uses the same institution-wide appraisal_criteria
// Faculty use — a Secretary chooses only the criteria that genuinely
// apply to their own role, e.g. "Institutional Contribution", rather than
// being forced through unrelated teaching criteria) ---
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
export interface AppraisalCriteriaResponse {
  academic_year: string | null;
  divisions: AppraisalDivision[];
}
export interface AppraisalRow {
  id: number;
  academic_year: string;
  status: string;
  hod_reviewed_at: string | null;
  management_approved_at: string | null;
  created_at: string;
}

export function useAppraisalCriteria(academicYear?: string) {
  return useQuery({
    queryKey: ["secretary", "appraisal-criteria", academicYear],
    queryFn: () => apiClient.get<AppraisalCriteriaResponse>("/me/appraisal-criteria", { academic_year: academicYear }),
  });
}
export function useMyAppraisals() {
  return useQuery({
    queryKey: ["secretary", "my-appraisals"],
    queryFn: () => apiClient.get<{ data: AppraisalRow[] }>("/me/appraisal_requests").then((r) => r.data),
  });
}
export function useSubmitAppraisal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { academic_year: string; entries: { criteria_id: number; description?: string }[] }) =>
      apiClient.post("/me/appraisal_requests", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-appraisals"] }),
  });
}
export function useWithdrawAppraisal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/appraisal_requests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secretary", "my-appraisals"] }),
  });
}

export interface BookRow {
  id: number;
  title: string;
  author: string | null;
  category_name: string;
  available_copies: number;
}
export function useBookCatalogueSearch(q: string) {
  return useQuery({
    queryKey: ["secretary", "book-catalogue", q],
    queryFn: () => apiClient.get<{ data: BookRow[] }>("/library/books", { q: q || undefined }).then((r) => r.data),
  });
}
