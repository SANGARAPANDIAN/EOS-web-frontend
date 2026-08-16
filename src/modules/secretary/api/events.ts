import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/secretary-portal/events/*.
// {controller,service}.ts — new module built this session (real
// `department_events` table, added via the Secretary module completion
// migration). Institution-wide for Secretary/Admin/Principal.

export type DepartmentEventStatus = "planning" | "awaiting_approval" | "approved" | "completed";

export interface DepartmentEventRow {
  id: number;
  title: string;
  kind: string;
  event_date: string;
  status: DepartmentEventStatus;
  registrations: number;
  capacity: number;
  created_at: string;
  department: { id: number; name: string; code: string };
  venue: { id: number; name: string } | null;
  owner: { id: number; first_name: string; last_name: string } | null;
}

export function useDepartmentEvents(departmentId: number | undefined) {
  const qs = departmentId !== undefined ? `?department_id=${departmentId}` : "";
  return useQuery({
    queryKey: ["secretary", "department-events", departmentId],
    queryFn: () => apiClient.get<DepartmentEventRow[]>(`/me/department-events${qs}`),
  });
}

export interface CreateEventInput {
  department_id: number;
  title: string;
  kind: string;
  event_date: string;
  venue_id?: number;
  owner_faculty_id?: number;
  capacity: number;
}
export function useCreateDepartmentEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => apiClient.post("/me/department-events", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "department-events"] }),
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, count }: { id: number; count?: number }) => apiClient.patch(`/me/department-events/${id}/register`, { count }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "department-events"] }),
  });
}

export function useAdvanceEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/me/department-events/${id}/advance`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "department-events"] }),
  });
}
