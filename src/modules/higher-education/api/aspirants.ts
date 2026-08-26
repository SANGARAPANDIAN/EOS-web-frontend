import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AspirantStatus = "interested" | "applied" | "admitted" | "enrolled";

export interface AspirantListItem {
  aspirant_id: number;
  student_name: string;
  student_id_no: string;
  dept_batch: string;
  programme: string;
  university: string;
  country: string;
  scholarship: string;
  status: AspirantStatus;
}

export interface AspirantsListResponse {
  extended: boolean;
  meta: { total: number; filtered: number };
  summary: {
    total: number;
    withinIndia: number;
    abroad: number;
    countriesAbroad: number;
    admittedCount: number;
    scholarshipCount: number;
    scholarshipNames: string[];
  };
  filters: { departments: string[]; batches: string[] };
  rows: AspirantListItem[];
}

export interface AspirantListQuery {
  search?: string;
  batch?: string;
  department?: string;
  status?: string;
}

/** GET /me/higher-education-aspirants?search=&batch=&department=&status= */
export function useAspirants(query: AspirantListQuery) {
  return useQuery({
    queryKey: ["me", "higher-education-aspirants", query],
    queryFn: () => apiClient.get<AspirantsListResponse>("/me/higher-education-aspirants", { ...query }),
  });
}

export interface AspirantDetail {
  aspirant_id: number;
  student_name: string;
  student_id_no: string;
  register_no: string | null;
  dept_code: string | null;
  dept_name: string | null;
  batch: string | null;
  mode: string;
  status: AspirantStatus;
  intake: string | null;
  programme: {
    course: string;
    university: string;
    country: string;
    intake: string;
    sop_status: string;
    recommendation_status: string;
  };
  readiness: { research_output: string; internship_details: string; visa_status: string };
  academics: { cgpa: number | null; percentage: number | null; test_scores_summary: string };
  testScores: { test_name: string; score: number; test_date: string | null }[];
  timeline: { application_submitted_date: string | null; interview_date: string | null; offer_status: string };
  funding: {
    is_scholarship: boolean;
    scholarship_name: string;
    scholarship_value: number | null;
    funding_source: string;
    student_contact: string;
    email: string;
    guardian: string;
  };
  remarks: string;
}

/** GET /me/higher-education-aspirants/:id */
export function useAspirantDetail(id: number | null) {
  return useQuery({
    queryKey: ["me", "higher-education-aspirants", "detail", id],
    queryFn: () => apiClient.get<AspirantDetail>(`/me/higher-education-aspirants/${id}`),
    enabled: id != null,
  });
}

export interface CreateAspirantInput {
  register_no: string;
  programme: string;
  country: string;
  university?: string;
  intake?: string;
  cgpa?: number;
  percentage?: number;
  test_scores_summary?: string;
  scholarship_name?: string;
  scholarship_value?: number;
  stage?: AspirantStatus;
}

/** POST /me/higher-education-aspirants — identifies the student by register number. */
export function useCreateAspirant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAspirantInput) => apiClient.post<{ aspirant_id: number }>("/me/higher-education-aspirants", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-aspirants"] }),
  });
}

export interface UpdateAspirantInput {
  programme?: string;
  country?: string;
  university?: string;
  intake?: string;
  cgpa?: number;
  percentage?: number;
  test_scores_summary?: string;
  scholarship_name?: string;
  scholarship_value?: number;
  stage?: "interested" | "applied" | "admitted" | "enrolled";
  remarks?: string;
}

/**
 * PATCH /me/higher-education-aspirants/:id
 *
 * `register_no` is deliberately not editable: it identifies which student the
 * record belongs to, so a wrong one is deleted and re-added rather than
 * silently re-pointed at somebody else.
 */
export function useUpdateAspirant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateAspirantInput & { id: number }) =>
      apiClient.patch(`/me/higher-education-aspirants/${id}`, input),
    onSuccess: (_r, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-aspirants"] });
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-aspirants", id] });
    },
  });
}

/** DELETE /me/higher-education-aspirants/:id — removes the record, not the student. */
export function useDeleteAspirant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/higher-education-aspirants/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-aspirants"] }),
  });
}
