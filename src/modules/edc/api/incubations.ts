import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/incubations/ (IncubationsController/Service,
// EDC_COORDINATOR-only), added this session on real `incubations` +
// `incubation_milestones` tables — the design's INCUBATION_FILE object was
// pure sample data; there is no fake fallback here. Empty means no venture
// has been admitted into the centre yet.

export interface IncubationMilestone {
  id: number;
  label: string;
  due_date: string | null;
  status: string;
  progress_percent: number;
  sort_order: number;
}

export interface IncubationRow {
  id: number;
  student_entrepreneurship_id: number;
  intake_label: string | null;
  seat: string | null;
  incubated_since: string | null;
  mentor_faculty_id: number | null;
  mentor_faculty_name: string | null;
  review_attendance_note: string | null;
  last_review_note: string | null;
  next_review_date: string | null;
  grant_note: string | null;
  services_note: string | null;
  status: string;
  progress_percent: number;
  created_at: string;
  business_name: string | null;
  business_category: string | null;
  student: {
    id: number;
    student_id_no: string;
    name: string;
    section: string | null;
    department: { code: string; name: string } | null;
  } | null;
  milestones: IncubationMilestone[];
}

export function useIncubations() {
  return useQuery({
    queryKey: ["edc", "incubations"],
    queryFn: () => apiClient.get<IncubationRow[]>("/me/incubations"),
  });
}

export function useIncubation(id: number) {
  return useQuery({
    queryKey: ["edc", "incubations", id],
    queryFn: () => apiClient.get<IncubationRow>(`/me/incubations/${id}`),
    enabled: Number.isFinite(id),
  });
}

export interface CreateIncubationInput {
  student_entrepreneurship_id: number;
  intake_label?: string;
  seat?: string;
  incubated_since?: string;
  mentor_faculty_id?: number;
  review_attendance_note?: string;
  last_review_note?: string;
  next_review_date?: string;
  grant_note?: string;
  services_note?: string;
}

/** Admits a venture into the incubation centre. Real time: EDC Students /
 * Startups both re-derive their "incubated" badge from the same
 * student_entrepreneurship.is_incubated flag this keeps in sync server-side. */
export function useCreateIncubation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncubationInput) => apiClient.post<IncubationRow>("/me/incubations", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations"] });
      queryClient.invalidateQueries({ queryKey: ["edc", "entrepreneurship"] });
    },
  });
}

export interface UpdateIncubationInput {
  intake_label?: string;
  seat?: string;
  mentor_faculty_id?: number;
  review_attendance_note?: string;
  last_review_note?: string;
  next_review_date?: string;
  grant_note?: string;
  services_note?: string;
  status?: "Active" | "Graduated" | "Exited";
  progress_percent?: number;
}

/** DELETE /me/incubations/:id — removes the venture from the incubation
 * centre (added by mistake, etc.) without deleting the venture itself. */
export function useDeleteIncubation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/incubations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations"] });
      queryClient.invalidateQueries({ queryKey: ["edc", "entrepreneurship"] });
    },
  });
}

export function useUpdateIncubation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateIncubationInput) => apiClient.patch<IncubationRow>(`/me/incubations/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations"] });
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations", id] });
      queryClient.invalidateQueries({ queryKey: ["edc", "entrepreneurship"] });
    },
  });
}

export interface CreateMilestoneInput {
  label: string;
  due_date?: string;
  status?: "Upcoming" | "In Progress" | "Completed";
  progress_percent?: number;
  sort_order?: number;
}

export function useAddMilestone(incubationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) =>
      apiClient.post<IncubationRow>(`/me/incubations/${incubationId}/milestones`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations"] });
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations", incubationId] });
    },
  });
}

export interface UpdateMilestoneInput {
  label?: string;
  due_date?: string;
  status?: "Upcoming" | "In Progress" | "Completed";
  progress_percent?: number;
  sort_order?: number;
}

export function useUpdateMilestone(incubationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, input }: { milestoneId: number; input: UpdateMilestoneInput }) =>
      apiClient.patch<IncubationRow>(`/me/incubations/milestones/${milestoneId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations"] });
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations", incubationId] });
    },
  });
}
