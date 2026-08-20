import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Ref } from "./types";

export type FitnessStatus = "fit" | "rest" | "injured";

export interface FitnessTest {
  id: number;
  student: Ref;
  test_name: string;
  score: string | null;
  test_date: string;
  status: FitnessStatus;
  notes: string | null;
}

export interface CreateFitnessTestInput {
  student_id: number;
  test_name: string;
  score?: string;
  test_date: string;
  status?: FitnessStatus;
  notes?: string;
  recorded_by_staff_id?: number;
}

export function useFitnessTests(params?: { status?: FitnessStatus; q?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "fitness-tests", params],
    queryFn: () => apiClient.get<FitnessTest[]>("/sports-admin/fitness-tests", params),
  });
}

export function useCreateFitnessTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFitnessTestInput) => apiClient.post<FitnessTest>("/sports-admin/fitness-tests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "fitness-tests"] }),
  });
}

export function useUpdateFitnessTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateFitnessTestInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/fitness-tests/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "fitness-tests"] }),
  });
}

export function useDeleteFitnessTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/fitness-tests/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "fitness-tests"] }),
  });
}
