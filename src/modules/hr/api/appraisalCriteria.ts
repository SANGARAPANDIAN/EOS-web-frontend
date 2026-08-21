import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";
import type { ApiPaginated } from "./requests";

export interface AppraisalDivision {
  id: number;
  name: string;
}

export interface AppraisalCriterion {
  id: number;
  division_id: number;
  criteria_name: string;
  max_score: number;
  academic_year: string;
  appraisal_divisions: AppraisalDivision;
}

export interface AppraisalCriteriaListParams {
  [key: string]: string | number | undefined;
  division_id?: number;
  academic_year?: string;
  page?: number;
  limit?: number;
}

export interface CreateAppraisalCriterionInput {
  division_id: number;
  criteria_name: string;
  max_score: number;
  academic_year: string;
}

/** GET /appraisal-divisions — read-only catalog, shared with Faculty/HoD. */
export function useAppraisalDivisions() {
  return useQuery({
    queryKey: hrKeys.appraisalDivisions(),
    queryFn: () => apiClient.get<AppraisalDivision[]>("/appraisal-divisions"),
  });
}

/** POST /appraisal-divisions — Admin/HR Payroll only. */
export function useCreateAppraisalDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<AppraisalDivision>("/appraisal-divisions", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.appraisalDivisions() }),
  });
}

/** GET /appraisal-criteria — paginated, filterable catalog. */
export function useAppraisalCriteria(params: AppraisalCriteriaListParams = {}) {
  return useQuery({
    queryKey: hrKeys.appraisalCriteria.list(params),
    queryFn: () => apiClient.get<ApiPaginated<AppraisalCriterion>>("/appraisal-criteria", params),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateAppraisalCriteria() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [...hrKeys.all, "appraisal-criteria"] });
}

/** POST /appraisal-criteria — Admin/HR Payroll only. */
export function useCreateAppraisalCriterion() {
  const invalidate = useInvalidateAppraisalCriteria();
  return useMutation({
    mutationFn: (input: CreateAppraisalCriterionInput) => apiClient.post<AppraisalCriterion>("/appraisal-criteria", input),
    onSuccess: invalidate,
  });
}

/** PATCH /appraisal-criteria/:id — Admin/HR Payroll only. */
export function useUpdateAppraisalCriterion() {
  const invalidate = useInvalidateAppraisalCriteria();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateAppraisalCriterionInput> }) =>
      apiClient.patch<AppraisalCriterion>(`/appraisal-criteria/${id}`, input),
    onSuccess: invalidate,
  });
}

/** DELETE /appraisal-criteria/:id — Admin/HR Payroll only. Blocked server-side if entries reference it. */
export function useDeleteAppraisalCriterion() {
  const invalidate = useInvalidateAppraisalCriteria();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number; deleted: boolean }>(`/appraisal-criteria/${id}`),
    onSuccess: invalidate,
  });
}
