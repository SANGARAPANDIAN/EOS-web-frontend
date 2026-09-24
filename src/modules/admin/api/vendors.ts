import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Vendor {
  id: number;
  name: string;
  contact_info: string | null;
  gst_no: string | null;
}

export interface CreateVendorInput {
  name: string;
  contact_info?: string;
  gst_no?: string;
}

export type UpdateVendorInput = Partial<CreateVendorInput>;

const BASE = "/vendors";

export const vendorsKeys = {
  all: ["vendors"] as const,
  list: () => [...vendorsKeys.all, "list"] as const,
};

/** GET /vendors — Admin only, flat unpaginated list (master data, expected to stay small). */
export function useVendors() {
  return useQuery({
    queryKey: vendorsKeys.list(),
    queryFn: () => apiClient.get<Vendor[]>(BASE),
    staleTime: 60_000,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendorInput) => apiClient.post<Vendor>(BASE, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorsKeys.all }),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateVendorInput }) =>
      apiClient.patch<Vendor>(`${BASE}/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorsKeys.all }),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`${BASE}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorsKeys.all }),
  });
}
