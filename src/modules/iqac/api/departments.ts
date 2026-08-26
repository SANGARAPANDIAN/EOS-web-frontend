import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface DepartmentHod {
  faculty_id: number;
  name: string;
  designation: string;
}

export interface DepartmentRow {
  id: number;
  name: string;
  code: string;
  hod: DepartmentHod | null;
  students_count: number;
  faculty_count: number;
  accreditation_status: string | null;
  attendance_percentage: number | null;
  placement_percentage: number | null;
}

/** GET /me/iqac/departments — every real department, no hardcoded list. No NAAC-certified score column: not tracked anywhere real (accreditation_status, from courses, is) — see useNaacReadiness() for a real self-reported readiness proxy instead. */
export function useDepartmentsList() {
  return useQuery({
    queryKey: ["me", "iqac", "departments", "list"],
    queryFn: () => apiClient.get<DepartmentRow[]>("/me/iqac/departments"),
  });
}

export interface NaacReadiness {
  institution_mean_readiness: number | null;
  item_count: number;
  by_department: { department_id: number; mean_readiness: number }[];
}

/** GET /me/iqac/departments/naac-readiness — real mean of iqac_accreditation_criteria.readiness_percent (cycle='naac'). A self-reported readiness proxy, not a NAAC-certified score. */
export function useNaacReadiness() {
  return useQuery({
    queryKey: ["me", "iqac", "departments", "naac-readiness"],
    queryFn: () => apiClient.get<NaacReadiness>("/me/iqac/departments/naac-readiness"),
  });
}

export interface DepartmentDetail {
  id: number;
  name: string;
  code: string;
  hod: DepartmentHod | null;
  students_count: number;
  faculty_count: number;
  students: { attendance_percentage: number | null; sections_count: number };
  faculty: { reporting_rate_today: number | null; on_leave_today: number; total_active: number };
  fees_pending_total: number;
  placement: { placed: number; total: number; percentage: number | null };
}

/** GET /me/iqac/departments/:id */
export function useDepartmentDetail(id: number) {
  return useQuery({
    queryKey: ["me", "iqac", "departments", "detail", id],
    queryFn: () => apiClient.get<DepartmentDetail>(`/me/iqac/departments/${id}`),
    enabled: Number.isFinite(id),
  });
}

export interface DepartmentSectionRow {
  id: number;
  section: string;
  semester: number | null;
  advisor: { faculty_id: number; name: string; designation: string; email: string; phone: string | null } | null;
  student_attendance_percentage: number | null;
  faculty_attendance_percentage: number | null;
  total_students: number;
  placed: number;
  fees_pending_amount: number;
}

/** GET /me/iqac/departments/:id/sections */
export function useDepartmentSections(id: number) {
  return useQuery({
    queryKey: ["me", "iqac", "departments", "sections", id],
    queryFn: () => apiClient.get<DepartmentSectionRow[]>(`/me/iqac/departments/${id}/sections`),
    enabled: Number.isFinite(id),
  });
}
