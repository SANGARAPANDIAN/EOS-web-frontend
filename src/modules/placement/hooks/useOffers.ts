import { useQuery } from "@tanstack/react-query";
import { offersService } from "../services/offers.service";
import { placementKeys } from "../query-keys";

export function useOffers() {
  return useQuery({
    queryKey: placementKeys.offers(),
    queryFn: offersService.list,
  });
}
