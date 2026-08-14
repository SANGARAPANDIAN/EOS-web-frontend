import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type FacilityType = "ground" | "court" | "hall" | "gym" | "pool" | "other";
export type FacilityStatus = "available" | "under_repair" | "closed";

export interface Facility {
  id: number;
  name: string;
  location: string | null;
  facility_type: FacilityType;
  capacity: number | null;
  status: FacilityStatus;
  usage_pct: number;
}

export interface CreateFacilityInput {
  name: string;
  location?: string;
  facility_type?: FacilityType;
  capacity?: number;
  status?: FacilityStatus;
}

export function useFacilities(params?: { status?: FacilityStatus; facility_type?: FacilityType }) {
  return useQuery({
    queryKey: ["sports-admin", "facilities", params],
    queryFn: () => apiClient.get<Facility[]>("/sports-admin/facilities", params),
  });
}

export function useCreateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFacilityInput) => apiClient.post<Facility>("/sports-admin/facilities", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "facilities"] }),
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateFacilityInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/facilities/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "facilities"] }),
  });
}

export function useDeleteFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/facilities/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "facilities"] }),
  });
}
