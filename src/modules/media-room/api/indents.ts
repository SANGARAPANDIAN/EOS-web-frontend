import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type IndentStatus = "pending" | "approved" | "rejected" | "fulfilled";
export type IndentType = "capital_equipment" | "consumables" | "repair_service" | "rental_hire";
export type BudgetHead = "media_branding" | "institution_events" | "admissions_outreach";

export interface Indent {
  id: number;
  requested_by_user_id: number;
  title: string;
  indent_type: IndentType;
  quantity: number;
  estimated_cost: string | null;
  needed_by: string | null;
  budget_head: BudgetHead;
  justification: string | null;
  status: IndentStatus;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /me/media-indents — ready:false until the media_indents table exists. */
export function useIndents() {
  return useQuery({
    queryKey: ["media-room", "indents"],
    queryFn: () => apiClient.get<ReadyResponse<Indent>>("/me/media-indents"),
  });
}

export interface CreateIndentInput {
  title: string;
  indent_type?: IndentType;
  quantity?: number;
  estimated_cost?: number;
  needed_by?: string;
  budget_head?: BudgetHead;
  justification?: string;
}

export function useCreateIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIndentInput) => apiClient.post<Indent>("/me/media-indents", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "indents"] }),
  });
}

export function useUpdateIndentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, resolution_notes }: { id: number; status: IndentStatus; resolution_notes?: string }) =>
      apiClient.patch<Indent>(`/me/media-indents/${id}`, { status, resolution_notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "indents"] }),
  });
}

export function useDeleteIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/media-indents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "indents"] }),
  });
}
