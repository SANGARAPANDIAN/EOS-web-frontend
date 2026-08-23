import { useQuery } from "@tanstack/react-query";
import { companiesService } from "../services/companies.service";
import { placementKeys } from "../query-keys";

export function useCompanyReport() {
  return useQuery({
    queryKey: placementKeys.companies.report(),
    queryFn: () => companiesService.report(),
  });
}
