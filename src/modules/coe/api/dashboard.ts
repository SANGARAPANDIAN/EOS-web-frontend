import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface DashboardSummary {
  exams: {
    total: number;
    scheduledInCycle: number;
    completed: number;
    inDraft: number;
  };
  upcomingExams: {
    total: number;
    daysToFirstSitting: number;
    coursesCount: number;
    programmesCount: number;
  };
  registeredStudents: {
    total: number;
    confirmed: number;
    awaitingFee: number;
  };
  eligibleStudents: {
    total: number;
    percentage: number;
    detained: number;
    condonation: number;
  };
  pendingRegistrations: {
    total: number;
    closeIn3Days: number;
    heldForFee: number;
    forApproval: number;
  };
  hallAllocation: {
    allocated: number;
    total: number;
    seatsAllotted: number;
    seatsTotal: number;
    pendingPlans: number;
  };
  invigilation: {
    total: number;
    acknowledged: number;
    slotsOpen: number;
    conflicts: number;
  };
  pendingValuation: {
    total: number;
    valued: number;
    percentageRemaining: number;
    activeValuators: number;
  };
  pendingResults: {
    total: number;
    computedCourses: number;
    totalCourses: number;
    sheetsAtPassBoard: number;
  };
  revaluation: {
    total: number;
    feePaid: number;
    unpaid: number;
    revised: number;
  };
  arrearStudents: {
    total: number;
    registered: number;
    notRegistered: number;
    closesOn: string;
  };
  examFeeCollected: {
    total: number;
    percentage: number;
    outstanding: number;
    outstandingStudents: number;
  };
  examCycle: {
    stages: { key: string; label: string; status: "complete" | "current" | "pending"; sublabel: string }[];
    currentStage: number;
    totalStages: number;
  };
  departmentsCount: number;
  totalCourses: number;
  upcomingExamsTable: {
    date: string;
    subjectCode: string;
    subjectName: string;
    candidates: number;
    halls: number;
    status: "published" | "scheduled" | "draft";
  }[];
  needsYourAction: { key: string; title: string; description: string; href: string }[];
  valuationByDepartment: { departmentCode: string; total: number; valued: number; percentage: number }[];
  feeCollectionTrend: { month: string; total: number }[];
  recentActivity: { timestamp: string; type: string; description: string }[];
}

export type DashboardPeriod = "today" | "cycle" | "year";

export function useCoeDashboardSummary(period: DashboardPeriod = "cycle") {
  return useQuery({
    queryKey: ["coe", "dashboard", "summary", period],
    queryFn: () => apiClient.get<DashboardSummary>("/coe/dashboard/summary", { period }),
  });
}
