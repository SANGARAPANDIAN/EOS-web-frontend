import { useMutation, useQueryClient } from "@tanstack/react-query";
import { companiesService } from "../services/companies.service";
import { placementKeys } from "../query-keys";
import type { CreateCompanyInput, UpdateCompanyInput } from "../types";

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
    mutationFn: (input: CreateCompanyInput) => companiesService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateCompanyInput }) =>
      companiesService.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (id: number) => companiesService.remove(id),
    onSuccess: invalidate,
  });
}
