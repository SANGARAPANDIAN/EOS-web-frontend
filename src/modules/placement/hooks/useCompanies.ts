import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { companiesService } from "../services/companies.service";
import { placementKeys } from "../query-keys";
import type { CompanyListParams } from "../types";

export function useCompanies(params: CompanyListParams) {
  return useQuery({
    queryKey: placementKeys.companies.list(params),
    queryFn: () => companiesService.list(params),
    placeholderData: keepPreviousData,
  });
}
