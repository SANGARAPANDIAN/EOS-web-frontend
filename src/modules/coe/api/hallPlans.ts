import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Paginated } from "@/modules/coe/api/shared";

// src/modules/exams/hall-plans/hall-plans.controller.ts — coe only, paginated.

export interface HallPlan {
  id: number;
  exam_id: number;
  venue_id: number;
  exam_date: string;
  capacity: number;
  venues: { id: number; name: string; location: string | null; capacity: number };
  _count: { seating_arrangements: number; invigilation_duties: number };
}

/** Passes a generous limit since there's no way to fetch "all" otherwise — findAll is paginated with no aggregate/summary escape hatch. */
export function useHallPlans(examId?: number | null, examDate?: string | null) {
  return useQuery({
    queryKey: ["coe", "hall-plans", examId, examDate],
    queryFn: () =>
      apiClient.get<Paginated<HallPlan>>("/hall-plans", {
        exam_id: examId ?? undefined,
        exam_date: examDate ?? undefined,
        limit: 100,
      }),
  });
}

export interface CreateHallPlanInput {
  exam_id: number;
  venue_id: number;
  exam_date: string;
  capacity?: number;
}

export function useCreateHallPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHallPlanInput) => apiClient.post<HallPlan>("/hall-plans", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "hall-plans"] }),
  });
}
