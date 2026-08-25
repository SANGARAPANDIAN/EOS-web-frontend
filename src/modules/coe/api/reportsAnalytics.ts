import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/reports-analytics/ — a single `exams` row already
// spans every department/class mapped to it, so one exam_id is one whole
// examination cycle; nothing here needed a new "cycle" concept. Every
// figure is a real aggregate over exam_marks/grade_bands/script_bundles/
// exam_registrations — see reports-analytics.service.ts.

export interface DepartmentComparison {
  code: string;
  candidates: number;
  currentPassPercentage: number;
  previousPassPercentage: number | null;
}

export interface PassPercentageTrendPoint {
  examId: number;
  label: string;
  passPercentage: number | null;
}

export interface SubjectPerformanceRow {
  subjectId: number;
  code: string;
  name: string;
  appeared: number;
  passPercentage: number;
  avgGpa: number | null;
  trendDelta: number | null;
}

export interface ArrearBucket {
  label: string;
  count: number;
}

export interface ReportsAnalyticsSummary {
  exam: { id: number; label: string };
  overallPassPercentage: number | null;
  overallPassPercentageDelta: number | null;
  studentsWithDistinction: number;
  studentsWithDistinctionPercentage: number | null;
  averageCgpa: number | null;
  arrearRate: number | null;
  arrearRateDelta: number | null;
  departmentComparison: DepartmentComparison[];
  passPercentageTrend: PassPercentageTrendPoint[];
  subjectPerformance: SubjectPerformanceRow[];
  arrearAnalysis: {
    buckets: ArrearBucket[];
    finalYearArrears: number;
    valuationCompletedPercentage: number;
    feeCollectionPercentage: number;
    resultComparisonDelta: number | null;
  };
}

export function useReportsAnalyticsSummary(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "reports-analytics", examId],
    queryFn: () => apiClient.get<ReportsAnalyticsSummary>("/reports-analytics/summary", { exam_id: examId ?? undefined }),
    enabled: examId != null,
  });
}
