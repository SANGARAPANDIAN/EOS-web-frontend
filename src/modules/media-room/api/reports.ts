import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ReportStatus = "draft" | "final";

export interface SavedReport {
  id: number;
  name: string;
  period: string;
  note: string | null;
  status: ReportStatus;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /me/media-reports — ready:false until the media_reports table exists. */
export function useSavedReports() {
  return useQuery({
    queryKey: ["media-room", "reports"],
    queryFn: () => apiClient.get<ReadyResponse<SavedReport>>("/me/media-reports"),
  });
}

export interface CreateReportInput {
  name: string;
  period: string;
  note?: string;
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportInput) => apiClient.post<SavedReport>("/me/media-reports", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "reports"] }),
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReportStatus }) => apiClient.patch<SavedReport>(`/me/media-reports/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "reports"] }),
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/media-reports/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "reports"] }),
  });
}

export interface DepartmentBreakdown {
  name: string;
  count: number;
  pct: number;
}

export interface TurnaroundBucket {
  name: string;
  count: number;
  pct: number;
}

export interface ReportAnalytics {
  byDepartment: DepartmentBreakdown[];
  turnaround: { ready: boolean; data: TurnaroundBucket[] };
}

/** GET /me/media-reports/analytics — real "Requests by department" + "Turnaround time" panels. */
export function useReportAnalytics() {
  return useQuery({
    queryKey: ["media-room", "reports", "analytics"],
    queryFn: () => apiClient.get<ReportAnalytics>("/me/media-reports/analytics"),
  });
}

export interface ScorecardMetric {
  key: string;
  name: string;
  is_percent: boolean;
  now: number | null;
  prev: number | null;
  target: number | null;
  attainment_pct: number | null;
}

export interface Scorecard {
  this_year_label: string;
  last_year_label: string;
  targets_ready: boolean;
  metrics: ScorecardMetric[];
}

/** GET /me/media-reports/scorecard — real "Media scorecard" (this year / last year, real; target is whatever Media Room has set). */
export function useScorecard() {
  return useQuery({
    queryKey: ["media-room", "reports", "scorecard"],
    queryFn: () => apiClient.get<Scorecard>("/me/media-reports/scorecard"),
  });
}

/** PUT /me/media-reports/scorecard/targets/:metricKey */
export function useSetScorecardTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ metricKey, targetValue }: { metricKey: string; targetValue: number }) =>
      apiClient.put(`/me/media-reports/scorecard/targets/${metricKey}`, { target_value: targetValue }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "reports", "scorecard"] }),
  });
}

export interface AppPerformanceChannel {
  key: string;
  name: string;
  posts: number | null;
  reach: number | null;
  growth_pct: number | null;
}

export interface AppPerformance {
  channels: AppPerformanceChannel[];
}

/** GET /me/media-reports/app-performance — Dashboard's real "App performance" panel. */
export function useAppPerformance() {
  return useQuery({
    queryKey: ["media-room", "reports", "app-performance"],
    queryFn: () => apiClient.get<AppPerformance>("/me/media-reports/app-performance"),
  });
}
