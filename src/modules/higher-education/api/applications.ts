import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ApplicationWindow {
  id: number;
  university: string;
  country: string;
  intake: string | null;
  applicants: number;
  documentsPending: number;
  deadline: string | null;
  window: string | null;
}

export interface HigherEducationApplications {
  kpis: {
    filed: number;
    inEvaluation: number;
    interviewsScheduled: number;
    offersReceived: number;
    offerRatePercent: number | null;
    closingWithin14Days: number;
    urgentCount: number;
  };
  windows: ApplicationWindow[];
}

/** GET /me/higher-education-applications */
export function useHigherEducationApplications() {
  return useQuery({
    queryKey: ["me", "higher-education-applications"],
    queryFn: () => apiClient.get<HigherEducationApplications>("/me/higher-education-applications"),
  });
}

export interface CreateApplicationWindowInput {
  university: string;
  country: string;
  intake?: string;
  applicants_count?: number;
  documents_pending?: number;
  deadline?: string;
}

/** POST /me/higher-education-application-windows */
export function useCreateApplicationWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationWindowInput) => apiClient.post<{ id: number }>("/me/higher-education-application-windows", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-applications"] }),
  });
}
