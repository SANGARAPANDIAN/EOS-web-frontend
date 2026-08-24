import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Paginated } from "@/modules/coe/api/shared";

// src/modules/exams/seating-arrangements/seating-arrangements.controller.ts —
// coe only, paginated. No draft/publish version concept — allocate() writes
// final seat rows directly (seating_plan_versions exists in the schema but
// is never referenced by this service).

export interface SeatingArrangement {
  id: number;
  hall_plan_id: number;
  student_id: number;
  seat_number: string;
  hall_plans: { id: number; exam_id: number; exam_date: string; venues: { id: number; name: string; location: string | null } };
  students: { id: number; student_id_no: string; roll_no: string | null; register_no: string | null };
}

export function useSeatingArrangements(hallPlanId?: number | null) {
  return useQuery({
    queryKey: ["coe", "seating-arrangements", hallPlanId],
    queryFn: () =>
      apiClient.get<Paginated<SeatingArrangement>>("/seating-arrangements", {
        hall_plan_id: hallPlanId ?? undefined,
        limit: 100,
      }),
    enabled: hallPlanId != null,
  });
}

/** POST /seating-arrangements/allocate — auto-allocates every eligible student across the hall plans already created for this exam/date; 409 if already allocated. */
export function useAllocateSeating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exam_id: number; exam_date: string }) =>
      apiClient.post("/seating-arrangements/allocate", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "seating-arrangements"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "hall-plans"] });
    },
  });
}

export function useClearSeating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exam_id: number; exam_date: string }) =>
      apiClient.delete(`/seating-arrangements/clear?exam_id=${input.exam_id}&exam_date=${input.exam_date}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "seating-arrangements"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "hall-plans"] });
    },
  });
}
