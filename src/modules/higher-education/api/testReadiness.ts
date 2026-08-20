import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type TestReadinessLevel = "on_track" | "watch" | "behind";

export interface TestSummaryRow {
  testName: string;
  enrolled: number | null;
  attempted: number;
  cleared: number | null;
  meanScore: number | null;
  nextWindow: string | null;
  nextWindowDate: string | null;
  readiness: TestReadinessLevel | null;
}

export interface UpcomingTestDate {
  testName: string;
  window: string;
}

export interface CoachingBatch {
  batch_name: string;
  detail: string;
}

export interface RetakeWatchlistItem {
  label: string;
  count: number;
}

export interface HigherEducationTestReadiness {
  summary: { totalRecords: number; distinctTests: number; aspirantsWithScores: number; totalAspirants: number };
  tests: TestSummaryRow[];
  upcoming: UpcomingTestDate[];
  coachingBatches: CoachingBatch[];
  retakeWatchlist: RetakeWatchlistItem[];
}

/** GET /me/higher-education-test-readiness */
export function useHigherEducationTestReadiness() {
  return useQuery({
    queryKey: ["me", "higher-education-test-readiness"],
    queryFn: () => apiClient.get<HigherEducationTestReadiness>("/me/higher-education-test-readiness"),
  });
}

export interface CreateTestInput {
  test_name: string;
  enrolled_count?: number;
  cleared_count?: number;
  next_window_label?: string;
  next_window_date?: string;
  readiness?: TestReadinessLevel;
}

/** POST /me/higher-education-test-register */
export function useCreateTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTestInput) => apiClient.post<{ testName: string }>("/me/higher-education-test-register", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-test-readiness"] }),
  });
}
