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
  /** Faculty roll number. Nullable — not every record has one yet. */
  staff_code?: string | null;
  prefix?: string | null;
  /** The read endpoints only ever return the nested `department` object — never a flat id. */
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

/**
 * GET /me/faculty?search= — faculty lookup for the HR pickers.
 *
 * There are ~500 active faculty and the list endpoint caps `limit` at 100, so a
 * plain dropdown can neither hold them all nor be asked for more (requesting
 * 200 returns 400 "limit must not be greater than 100", which is why the HR
 * pickers were coming up empty).
 *
 * Runs with an empty term too, so the picker shows real faculty the moment it
 * opens instead of an empty box waiting for keystrokes. `search` is matched
 * case-insensitively server-side against first name, last name, staff code
 * (roll number), designation and login email.
 *
 * Pass `term: null` to hold the query off entirely (e.g. once a selection has
 * been made and the list is no longer shown).
 */
export function useHrFacultySearch(
  term: string | null,
  params: { status?: HrFacultyStatus; departmentId?: number } = {},
) {
  const search = (term ?? "").trim();
  const query: HrFacultyListParams = {
    limit: 100,
    status: params.status,
    department_id: params.departmentId,
    search: search.length > 0 ? search : undefined,
  };
  return useQuery({
    queryKey: hrKeys.faculty.list(query),
    queryFn: () => apiClient.get<HrFacultyListResponse>(BASE, query),
    enabled: term !== null,
    placeholderData: keepPreviousData,
  });
}
