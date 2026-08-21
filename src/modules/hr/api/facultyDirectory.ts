import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";

/** Every faculty endpoint lives under /me/faculty — the Swagger-documented /faculty 404s live. */
const BASE = "/me/faculty";

export type HrFacultyStatus = "active" | "inactive";

export interface HrFacultyDepartmentRef {
  id: number;
  name: string;
  code?: string;
}

export interface HrFaculty {
  id: number;
  email: string;
  phone?: string | null;
  first_name: string;
  last_name: string;
  designation: string;
  department_id: number;
  department?: HrFacultyDepartmentRef;
  date_of_joining?: string | null;
  status: HrFacultyStatus;
  profile_url?: string | null;
  created_at?: string;
}

export interface HrFacultyListParams {
  [key: string]: string | number | boolean | undefined | null;
  department_id?: number;
  status?: HrFacultyStatus;
  search?: string;
  limit?: number;
  page?: number;
}

export interface HrFacultyListResponse {
  data: HrFaculty[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateHrFacultyInput {
  email: string;
  first_name: string;
  last_name: string;
  designation: string;
  department_id: number;
  phone?: string;
  date_of_joining?: string;
}

export type UpdateHrFacultyInput = Partial<CreateHrFacultyInput> & { status?: HrFacultyStatus };

export interface HrFacultyActivityEntry {
  id: number;
  description: string;
  created_at: string;
  created_by_email: string;
}

export function useHrFaculties(params: HrFacultyListParams = {}) {
  return useQuery({
    queryKey: hrKeys.faculty.list(params),
    queryFn: () => apiClient.get<HrFacultyListResponse>(BASE, params),
    placeholderData: keepPreviousData,
  });
}

export function useHrFacultyById(id: number | null) {
  return useQuery({
    queryKey: hrKeys.faculty.detail(id ?? -1),
    queryFn: () => apiClient.get<HrFaculty>(`${BASE}/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useHrFacultyActivity(id: number | null) {
  return useQuery({
    queryKey: hrKeys.faculty.activity(id ?? -1),
    queryFn: () => apiClient.get<HrFacultyActivityEntry[]>(`${BASE}/${id}/activity`),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useCreateHrFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHrFacultyInput) => apiClient.post<HrFaculty>(BASE, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "faculty"] }),
  });
}

export function useUpdateHrFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateHrFacultyInput }) => apiClient.patch<HrFaculty>(`${BASE}/${id}`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "faculty", "list"] });
      queryClient.invalidateQueries({ queryKey: hrKeys.faculty.detail(id) });
    },
  });
}
