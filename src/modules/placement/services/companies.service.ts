import { apiClient } from "@/lib/api/client";
import type {
  Company,
  CompanyListParams,
  CompanyReportRow,
  CreateCompanyInput,
  Paginated,
  UpdateCompanyInput,
} from "../types";

// Shape returned by the real `companies` table/DTOs — snake_case, no `id`
// omission helpers. Mapped to/from the frontend's camelCase Company below.
// industry/location/recruiter_spoc/expected_package_lpa are real once
// query.md #13 runs — null until then.
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
  recruiter_status: CompanyReportRow["recruiterStatus"];
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

export const companiesService = {
  async list(params: CompanyListParams = {}): Promise<Paginated<Company>> {
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? 4;

    const res = await apiClient.get<BackendPaginated<BackendCompany>>("/companies", {
      search: params.q,
      page,
      limit: pageSize,
    });

    return {
      page: res.meta.page,
      page_size: res.meta.limit,
      total: res.meta.total,
      data: res.data.map(toCompany),
    };
  },

  async create(input: CreateCompanyInput): Promise<Company> {
    const company = await apiClient.post<BackendCompany>("/companies", {
      name: input.name,
      profile_info: input.profileInfo,
      industry: input.industry,
      location: input.location,
      recruiter_spoc: input.recruiterSpoc,
      expected_package_lpa: input.expectedPackageLpa,
    });
    return toCompany(company);
  },

  async update(id: number, input: UpdateCompanyInput): Promise<Company> {
    const company = await apiClient.patch<BackendCompany>(`/companies/${id}`, {
      name: input.name,
      profile_info: input.profileInfo,
      industry: input.industry,
      location: input.location,
      recruiter_spoc: input.recruiterSpoc,
      expected_package_lpa: input.expectedPackageLpa,
    });
    return toCompany(company);
  },

  remove(id: number): Promise<{ id: number }> {
    return apiClient.delete<{ id: number }>(`/companies/${id}`);
  },

  async report(): Promise<CompanyReportRow[]> {
    const rows = await apiClient.get<BackendCompanyReportRow[]>("/companies/report");
    return rows.map(toReportRow);
  },
};
