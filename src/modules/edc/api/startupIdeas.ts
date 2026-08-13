import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/startup-ideas/{startup-ideas.controller,
// startup-ideas.service}.ts — a brand-new module + table (`startup_ideas`)
// added specifically for this screen, since no backend concept of a
// pre-venture "idea" existed before (only a single `idea_developed`
// boolean on student_entrepreneurship). GET/POST/PATCH/DELETE
// /me/startup-ideas, EDC_COORDINATOR-only, institution-wide, real-time.

export type ReviewStatus = "Under Review" | "Selected" | "Approved" | "Rejected";

export interface StartupIdeaRow {
  id: number;
  title: string;
  category: string | null;
  problem_statement: string | null;
  solution: string | null;
  target_customers: string | null;
  market_size: string | null;
  competitors: string | null;
  team_note: string | null;
  budget_needed: number | null;
  feasibility_score: number | null;
  feasibility_confidence: "Low" | "Medium" | "High" | null;
  attachments_note: string | null;
  mentor_faculty_id: number | null;
  mentor_faculty_name: string | null;
  review_status: ReviewStatus;
  reviewer_user_id: number | null;
  reviewer_email: string | null;
  reviewer_note: string | null;
  conversion_note: string | null;
  converted_venture_id: number | null;
  converted_venture_name: string | null;
  target_milestone: string | null;
  submitted_at: string;
  student: { id: number; student_id_no: string; name: string; section: string | null; department: { code: string; name: string } | null };
}

export function useStartupIdeas() {
  return useQuery({
    queryKey: ["edc", "startup-ideas"],
    queryFn: () => apiClient.get<StartupIdeaRow[]>("/me/startup-ideas"),
  });
}

export function useStartupIdea(id: number | undefined) {
  return useQuery({
    queryKey: ["edc", "startup-ideas", id],
    queryFn: () => apiClient.get<StartupIdeaRow>(`/me/startup-ideas/${id}`),
    enabled: id !== undefined,
  });
}

export interface CreateStartupIdeaInput {
  student_id: number;
  title: string;
  category?: string;
  problem_statement?: string;
  solution?: string;
  target_customers?: string;
  market_size?: string;
  competitors?: string;
  team_note?: string;
  budget_needed?: number;
  feasibility_score?: number;
  feasibility_confidence?: "Low" | "Medium" | "High";
  attachments_note?: string;
  target_milestone?: string;
}

export function useCreateStartupIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStartupIdeaInput) => apiClient.post("/me/startup-ideas", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "startup-ideas"] }),
  });
}

export function useReviewStartupIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, review_status, reviewer_note }: { id: number; review_status: ReviewStatus; reviewer_note?: string }) =>
      apiClient.patch(`/me/startup-ideas/${id}`, { review_status, reviewer_note }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["edc", "startup-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["edc", "startup-ideas", vars.id] });
    },
  });
}

/** DELETE /me/startup-ideas/:id — the backend route already existed, no
 * frontend UI called it until now. */
export function useDeleteStartupIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/startup-ideas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "startup-ideas"] }),
  });
}
