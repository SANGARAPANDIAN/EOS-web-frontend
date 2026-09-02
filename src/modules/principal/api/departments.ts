import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface DepartmentHod {
  faculty_id: number;
  name: string;
  designation: string;
}

export interface DepartmentCard {
  id: number;
  name: string;
  code: string;
  hod: DepartmentHod | null;
  students_count: number;
  faculty_count: number;
  attendance_percentage: number | null;
  placement_percentage: number | null;
}

/** GET /me/principal/departments — department cards for the list view. */
export function useDepartmentsList() {
  return useQuery({
    queryKey: ["me", "principal", "departments", "list"],
    queryFn: () => apiClient.get<DepartmentCard[]>("/me/principal/departments"),
  });
}

export interface DepartmentDetail {
  id: number;
  name: string;
  code: string;
  hod: DepartmentHod | null;
  students_count: number;
  faculty_count: number;
  students: { attendance_percentage: number | null; sections_count: number; mean_cgpa: number | null };
  faculty: { reporting_rate_today: number | null; on_leave_today: number; total_active: number };
  fees_pending_total: number;
  placement: { placed: number; total: number; percentage: number | null };
}

/** GET /me/principal/departments/:id */
export function useDepartmentDetail(id: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "departments", "detail", id],
    queryFn: () => apiClient.get<DepartmentDetail>(`/me/principal/departments/${id}`),
    enabled: id != null,
  });
}

export interface DepartmentSectionAdvisor {
  faculty_id: number;
  name: string;
  designation: string;
  email: string;
  phone: string | null;
}

export interface DepartmentSection {
  id: number;
  section: string;
  semester: number | null;
  advisor: DepartmentSectionAdvisor | null;
  student_attendance_percentage: number | null;
  faculty_attendance_percentage: number | null;
  total_students: number;
  placed: number;
  fees_pending_amount: number;
  mean_cgpa: number | null;
}

/** GET /me/principal/departments/:id/sections */
export function useDepartmentSections(id: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "departments", "sections", id],
    queryFn: () => apiClient.get<DepartmentSection[]>(`/me/principal/departments/${id}/sections`),
    enabled: id != null,
  });
}

/** PATCH /me/principal/departments/:id/hod — faculty_id: null clears the assignment. */
export function useAssignHod(departmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (facultyId: number | null) =>
      apiClient.patch<DepartmentDetail>(`/me/principal/departments/${departmentId}/hod`, {
        faculty_id: facultyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "principal", "departments"] });
    },
  });
}
