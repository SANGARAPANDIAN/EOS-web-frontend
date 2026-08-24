import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Paginated, ExamSessionCode } from "@/modules/coe/api/shared";

// src/modules/exams/invigilation/invigilation.controller.ts — coe only,
// paginated. Faculty names come from /exam-faculty-directory (see faculty.ts).

export type InvigilationRole = "chief" | "relief";
export type InvigilationDutyType = "regular" | "relief_pool" | "squad";

export interface InvigilationDuty {
  id: number;
  exam_id: number;
  faculty_id: number;
  hall_plan_id: number;
  duty_date: string;
  session: ExamSessionCode;
  role: InvigilationRole;
  duty_type: InvigilationDutyType;
  acknowledged_at: string | null;
  faculty: {
    id: number;
    first_name: string;
    last_name: string;
    designation: string | null;
    departments: { id: number; code: string; name: string } | null;
  };
  hall_plans: { id: number; exam_id: number; exam_date: string; venues: { id: number; name: string; location: string | null } };
}

export function useInvigilationDuties(examId?: number | null) {
  return useQuery({
    queryKey: ["coe", "invigilation", examId],
    queryFn: () =>
      apiClient.get<Paginated<InvigilationDuty>>("/invigilation", { exam_id: examId ?? undefined, limit: 100 }),
  });
}

export function useUpdateInvigilationDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, faculty_id }: { id: number; faculty_id: number }) => apiClient.patch<InvigilationDuty>(`/invigilation/${id}`, { faculty_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation-stats"] });
    },
  });
}

export function useAcknowledgeInvigilationDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<InvigilationDuty>(`/invigilation/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation-stats"] });
    },
  });
}

export function useRemindInvigilationDuty() {
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/invigilation/${id}/remind`),
  });
}

export interface InvigilationStats {
  assigned: number;
  required: number;
  unfilled_slots: number;
  next_unfilled_date: string | null;
  acknowledged: number;
  acknowledged_pct: number;
  relief_invigilators: number;
}

export function useInvigilationStats() {
  return useQuery({
    queryKey: ["coe", "invigilation-stats"],
    queryFn: () => apiClient.get<InvigilationStats>("/invigilation/stats"),
  });
}

export function useUnfilledSlots(params: { academic_year?: string | null; semester?: number | null; exam_type_id?: number | null } = {}) {
  return useQuery({
    queryKey: ["coe", "invigilation-unfilled-slots", params.academic_year ?? null, params.semester ?? null, params.exam_type_id ?? null],
    queryFn: () =>
      apiClient.get<VenueOverviewCard[]>("/invigilation/unfilled-slots", {
        academic_year: params.academic_year ?? undefined,
        semester: params.semester ?? undefined,
        exam_type_id: params.exam_type_id ?? undefined,
      }),
  });
}

export function useAutoAssignInvigilation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exam_id: number; hall_plan_id: number; duty_date: string; session: ExamSessionCode }) =>
      apiClient.post<InvigilationDuty>("/invigilation/auto-assign", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation-unfilled-slots"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation-venues-overview"] });
    },
  });
}

export interface CreateInvigilationInput {
  exam_id: number;
  hall_plan_id: number;
  faculty_id: number;
  duty_date: string;
  session: ExamSessionCode;
  role?: InvigilationRole;
}

export function useCreateInvigilationDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvigilationInput) => apiClient.post<InvigilationDuty>("/invigilation", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation-venues-overview"] });
    },
  });
}

export function useDeleteInvigilationDuty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/invigilation/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation-venues-overview"] });
    },
  });
}

// --- Venue-centric overview (Invigilators page) ------------------------
// GET /invigilation/venues-overview — one card per (venue, exam date,
// session) with a scheduled paper: real chief/relief, real published
// status, real papers/department/semester. New read-only aggregation over
// tables that already existed; no schema change.

export interface VenueOverviewPaper {
  exam_subject_mapping_id: number;
  subject_code: string;
  subject_name: string;
}

export interface VenueOverviewAssignment {
  duty_id: number;
  faculty_id: number;
  name: string;
}

export interface VenueOverviewCard {
  key: string;
  hall_plan_id: number;
  exam_id: number;
  exam_type_id: number;
  exam_type_name: string;
  academic_year: string;
  semester: number;
  exam_date: string;
  session: ExamSessionCode;
  start_time: string | null;
  end_time: string | null;
  venue: { id: number; name: string; location: string | null; capacity: number | null };
  department_code: string | null;
  class_semester: number | null;
  papers_count: number;
  papers: VenueOverviewPaper[];
  is_published: boolean;
  chief: VenueOverviewAssignment | null;
  relief: VenueOverviewAssignment | null;
  release_status: "draft" | "submitted" | "published" | null;
}

export interface VenuesOverviewResponse {
  exam_types: { id: number; name: string; count: number }[];
  venues: VenueOverviewCard[];
  stats: { total_venues: number; published_venues: number; faculty_on_duty: number };
}

export function useVenuesOverview(params: { academic_year?: string | null; semester?: number | null; exam_type_id?: number | null }) {
  return useQuery({
    queryKey: ["coe", "invigilation-venues-overview", params.academic_year ?? null, params.semester ?? null, params.exam_type_id ?? null],
    queryFn: () =>
      apiClient.get<VenuesOverviewResponse>("/invigilation/venues-overview", {
        academic_year: params.academic_year ?? undefined,
        semester: params.semester ?? undefined,
        exam_type_id: params.exam_type_id ?? undefined,
      }),
  });
}

/**
 * Sets (or clears) the chief/relief invigilator for one venue card — decides
 * create vs. update vs. delete against the existing duty id from the card,
 * since the backend has no dedicated upsert route for this.
 */
export function useSetInvigilationRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      card: VenueOverviewCard;
      role: InvigilationRole;
      facultyId: number | null;
    }) => {
      const existing = input.role === "chief" ? input.card.chief : input.card.relief;
      if (input.facultyId === null) {
        if (existing) await apiClient.delete(`/invigilation/${existing.duty_id}`);
        return;
      }
      if (existing) {
        if (existing.faculty_id === input.facultyId) return;
        await apiClient.patch(`/invigilation/${existing.duty_id}`, { faculty_id: input.facultyId });
        return;
      }
      await apiClient.post("/invigilation", {
        exam_id: input.card.exam_id,
        hall_plan_id: input.card.hall_plan_id,
        faculty_id: input.facultyId,
        duty_date: input.card.exam_date,
        session: input.card.session,
        role: input.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation-venues-overview"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "invigilation"] });
    },
  });
}
