import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type UniversityRelation = "mou_active" | "regular" | "national" | "affiliating" | "new";

export interface UniversityRow {
  id: number;
  name: string;
  country: string;
  programmes: string | null;
  applied: number;
  admits: number;
  funded: number;
  relation: UniversityRelation;
}

export interface HigherEducationUniversities {
  summary: {
    universitiesInPlay: number;
    countriesInPlay: number;
    totalApplied: number;
    totalAdmits: number;
  };
  universities: UniversityRow[];
}

/** GET /me/higher-education-universities */
export function useHigherEducationUniversities() {
  return useQuery({
    queryKey: ["me", "higher-education-universities"],
    queryFn: () => apiClient.get<HigherEducationUniversities>("/me/higher-education-universities"),
  });
}

export interface CreateUniversityInput {
  name: string;
  country: string;
  programmes?: string;
  applied_count?: number;
  admits_count?: number;
  funded_count?: number;
  relation?: UniversityRelation;
}

/** POST /me/higher-education-universities */
export function useCreateUniversity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUniversityInput) => apiClient.post<{ id: number }>("/me/higher-education-universities", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-universities"] }),
  });
}

export interface UpdateUniversityInput {
  name?: string;
  country?: string;
  programmes?: string;
  applied_count?: number;
  admits_count?: number;
  funded_count?: number;
  relation?: string;
}

/** PATCH /me/higher-education-universities/:id */
export function useUpdateUniversity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUniversityInput & { id: number }) =>
      apiClient.patch(`/me/higher-education-universities/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-universities"] }),
  });
}

/**
 * DELETE /me/higher-education-universities/:id
 * Refused while aspirants still name this university as their preference; the
 * server says how many, so surface its message.
 */
export function useDeleteUniversity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/higher-education-universities/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-universities"] }),
  });
}
