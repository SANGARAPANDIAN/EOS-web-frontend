import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type StaffAccountStatus = "active" | "inactive";

export interface ProvisionableRole {
  id: number;
  name: string;
  description: string | null;
}

export interface StaffAccountDepartmentRef {
  id: number;
  name: string;
  code: string;
}

export interface StaffAccount {
  id: number;
  email: string;
  phone: string | null;
  status: StaffAccountStatus;
  created_at: string;
  role: { id: number; name: string; description: string | null };
  first_name: string | null;
  last_name: string | null;
  department: StaffAccountDepartmentRef | null;
}

export interface CreateStaffAccountInput {
  email: string;
  phone?: string;
  role_name: string;
  first_name?: string;
  last_name?: string;
  department_id?: number;
}

export interface CreateStaffAccountResponse extends StaffAccount {
  temporary_password: string;
}

export interface ResetPasswordResponse {
  id: number;
  email: string;
  temporary_password: string;
}

export interface ListStaffAccountsParams {
  [key: string]: string | number | boolean | undefined | null;
  page?: number;
  limit?: number;
  role_name?: string;
  status?: StaffAccountStatus;
  search?: string;
}

export interface StaffAccountListResponse {
  data: StaffAccount[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const BASE = "/staff-accounts";
const base = ["staff-accounts"] as const;

export const staffAccountsKeys = {
  all: base,
  list: (params: ListStaffAccountsParams) => [...base, "list", params] as const,
  roles: () => [...base, "roles"] as const,
};

/** GET /staff-accounts/roles — every role this screen can provision (excludes Admin/Principal/HoD/Faculty/Student/Parent/Alumni, each managed elsewhere). */
export function useProvisionableRoles() {
  return useQuery({
    queryKey: staffAccountsKeys.roles(),
    queryFn: () => apiClient.get<ProvisionableRole[]>(`${BASE}/roles`),
    staleTime: 30 * 60_000,
  });
}

export function useStaffAccounts(params: ListStaffAccountsParams) {
  return useQuery({
    queryKey: staffAccountsKeys.list(params),
    queryFn: () => apiClient.get<StaffAccountListResponse>(BASE, params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateStaffAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffAccountInput) =>
      apiClient.post<CreateStaffAccountResponse>(BASE, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffAccountsKeys.all }),
  });
}

export function useUpdateStaffAccountStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: StaffAccountStatus }) =>
      apiClient.patch<{ id: number; status: StaffAccountStatus }>(`${BASE}/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffAccountsKeys.all }),
  });
}

export function useResetStaffAccountPassword() {
  return useMutation({
    mutationFn: ({ id, adminPassword }: { id: number; adminPassword: string }) =>
      apiClient.post<ResetPasswordResponse>(`${BASE}/${id}/reset-password`, { adminPassword }),
  });
}
