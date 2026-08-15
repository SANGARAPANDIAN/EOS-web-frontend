import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";
import type { Paginated } from "@/modules/library/api/books";

export interface Rack {
  id: number;
  rack_code: string;
  shelves: number | null;
  subject_range: string | null;
}

export interface RackInput {
  rack_code: string;
  shelves?: number;
  subject_range?: string;
}

export interface RackListParams {
  [key: string]: string | number | undefined;
  q?: string;
  page?: number;
  page_size?: number;
}

const BASE = "/library/racks";

export function useRacks(params: RackListParams = {}) {
  return useQuery({
    queryKey: libraryKeys.racks.list(params),
    queryFn: () => apiClient.get<Paginated<Rack>>(BASE, params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RackInput) => apiClient.post<Rack>(BASE, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.racks.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useUpdateRack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<RackInput> }) => apiClient.patch<Rack>(`${BASE}/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.racks.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useDeleteRack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`${BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.racks.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}
