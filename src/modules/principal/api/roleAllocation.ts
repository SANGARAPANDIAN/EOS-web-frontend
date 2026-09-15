import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface RoleAllocationHod {
  faculty_id: number;
  name: string;
  staff_code: string | null;
  designation: string;
  /** ISO timestamp — null when this appointment predates audit logging (legacy/seed-assigned HoD), never a guessed date. */
  since: string | null;
}

export interface RoleAllocationDepartment {
  id: number;
  code: string;
  name: string;
  faculty_count: number;
  professor_count: number;
  hod: RoleAllocationHod | null;
}

/** GET /me/principal/role-allocation/departments */
export function useRoleAllocationDepartments() {
  return useQuery({
    queryKey: ["me", "principal", "role-allocation", "departments"],
    queryFn: () => apiClient.get<RoleAllocationDepartment[]>("/me/principal/role-allocation/departments"),
  });
}

export interface RoleAllocationCandidate {
  id: number;
  name: string;
  staff_code: string | null;
  designation: string;
  qualification: string | null;
  experience_years: number | null;
  attendance_percentage: number | null;
  publications_count: number;
  is_current_hod: boolean;
  hod_since: string | null;
}

/** GET /me/principal/role-allocation/departments/:id/candidates */
export function useRoleAllocationCandidates(departmentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "principal", "role-allocation", "candidates", departmentId],
    queryFn: () => apiClient.get<RoleAllocationCandidate[]>(`/me/principal/role-allocation/departments/${departmentId}/candidates`),
    enabled: departmentId !== undefined,
  });
}

export interface RoleAllocationHistoryEntry {
  date: string;
  from: string;
  to: string;
  reason: string | null;
  changed_by: string;
}

/** GET /me/principal/role-allocation/departments/:id/history */
export function useRoleAllocationHistory(departmentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "principal", "role-allocation", "history", departmentId],
    queryFn: () => apiClient.get<RoleAllocationHistoryEntry[]>(`/me/principal/role-allocation/departments/${departmentId}/history`),
    enabled: departmentId !== undefined,
  });
}

/**
 * PATCH /me/principal/role-allocation/departments/:id/hod
 * Same underlying mutation as departments.ts's useAssignHod (both hit
 * PrincipalDepartmentsService.assignHod) — invalidates all three query
 * families for this department so the candidate table, history panel and
 * left-hand department list all reflect the change immediately.
 */
export function useAppointHod(departmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ facultyId, reason }: { facultyId: number; reason?: string }) =>
      apiClient.patch(`/me/principal/role-allocation/departments/${departmentId}/hod`, {
        faculty_id: facultyId,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "principal", "role-allocation"] });
      // The Departments & HoDs screen reads the same underlying column.
      queryClient.invalidateQueries({ queryKey: ["me", "principal", "departments"] });
    },
  });
}
