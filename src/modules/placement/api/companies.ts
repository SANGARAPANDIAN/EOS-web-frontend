import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";
import type { Paginated } from "./types";

// Mirrors the backend's `companies` table exactly: id, name, profile_info,
// created_at. Job role, package, eligibility, venue and rounds are all
// per-drive, not per-company — see PlacementDrive in drives.ts.
export const COMPANY_INDUSTRIES = [
  "IT Services",
  "Product",
  "Consulting",
  "Core",
  "Semiconductor",
  "BFSI",
  "BPM",
  "Analytics",
] as const;

export interface Company {
  id: number;
  name: string;
  profileInfo?: string;
  createdAt: string;
  industry?: string | null;
  location?: string | null;
  recruiterSpoc?: string | null;
  expectedPackageLpa?: number | null;
}

export type CreateCompanyInput = Omit<Company, "id" | "createdAt">;
export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export interface CompanyListParams {
  q?: string;
  page?: number;
  page_size?: number;
}

export type RecruiterStatus = "new" | "returning" | "no_drives";

// One row per company with real, computed recruitment stats — there is no
// `industry`/`location` column anywhere on `companies`, so those aren't part
// of this shape; the Companies page renders an honest "—" for them.
export interface CompanyReportRow {
  id: number;
  name: string;
  profileInfo?: string;
  industry: string | null;
  location: string | null;
  drivesCount: number;
  openRoles: number;
  hired: number;
  averagePackageLpa: number | null;
  highestPackageLpa: number | null;
  lastDriveDate: string | null;
  recruiterStatus: RecruiterStatus;
}

interface BackendCompany {
  id: number;
  name: string;
  profile_info: string | null;
  created_at: string;
  industry: string | null;
  location: string | null;
  recruiter_spoc: string | null;
  expected_package_lpa: number | null;
}

interface BackendCompanyReportRow {
  id: number;
  name: string;
  profile_info: string | null;
  industry: string | null;
  location: string | null;
  drives_count: number;
  open_roles: number;
  hired: number;
  average_package: number | null;
  highest_package: number | null;
  last_drive_date: string | null;
  recruiter_status: RecruiterStatus;
}

interface BackendPaginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function toCompany(c: BackendCompany): Company {
  return {
    id: c.id,
    name: c.name,
    profileInfo: c.profile_info ?? undefined,
    createdAt: c.created_at,
    industry: c.industry,
    location: c.location,
    recruiterSpoc: c.recruiter_spoc,
    expectedPackageLpa: c.expected_package_lpa,
  };
}

function toReportRow(r: BackendCompanyReportRow): CompanyReportRow {
  return {
    id: r.id,
    name: r.name,
    profileInfo: r.profile_info ?? undefined,
    industry: r.industry,
    location: r.location,
    drivesCount: r.drives_count,
    openRoles: r.open_roles,
    hired: r.hired,
    averagePackageLpa: r.average_package,
    highestPackageLpa: r.highest_package,
    lastDriveDate: r.last_drive_date,
    recruiterStatus: r.recruiter_status,
  };
}

function toBackendCompanyInput(input: CreateCompanyInput | UpdateCompanyInput) {
  return {
    name: input.name,
    profile_info: input.profileInfo,
    industry: input.industry,
    location: input.location,
    recruiter_spoc: input.recruiterSpoc,
    expected_package_lpa: input.expectedPackageLpa,
  };
}

export function useCompanies(params: CompanyListParams) {
  return useQuery({
    queryKey: placementKeys.companies.list(params),
    queryFn: async () => {
      const res = await apiClient.get<BackendPaginated<BackendCompany>>("/companies", {
        search: params.q,
        page: params.page ?? 1,
        limit: params.page_size ?? 4,
      });
      const paginated: Paginated<Company> = {
        page: res.meta.page,
        page_size: res.meta.limit,
        total: res.meta.total,
        data: res.data.map(toCompany),
      };
      return paginated;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCompanyReport() {
  return useQuery({
    queryKey: placementKeys.companies.report(),
    queryFn: async () => {
      const rows = await apiClient.get<BackendCompanyReportRow[]>("/companies/report");
      return rows.map(toReportRow);
    },
  });
}

function useInvalidateCompanies() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: placementKeys.companies.all() });
    queryClient.invalidateQueries({ queryKey: placementKeys.dashboard() });
  };
}

export function useCreateCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: async (input: CreateCompanyInput) =>
      toCompany(await apiClient.post<BackendCompany>("/companies", toBackendCompanyInput(input))),
    onSuccess: invalidate,
  });
}

export function useUpdateCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateCompanyInput }) =>
      toCompany(await apiClient.patch<BackendCompany>(`/companies/${id}`, toBackendCompanyInput(input))),
    onSuccess: invalidate,
  });
}

export function useDeleteCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number }>(`/companies/${id}`),
    onSuccess: invalidate,
  });
}
