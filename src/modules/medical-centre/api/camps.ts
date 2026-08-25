import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface UpcomingCamp {
  id: number;
  title: string;
  detail: string;
  date: string;
  state: "Running" | "Scheduled" | "Planning";
  done: number;
  target: number;
}

export interface PastCamp {
  id: number;
  title: string;
  date: string;
  detail: string;
  done: number;
  target: number;
  outcome: string;
}

export interface CampsData {
  upcoming: UpcomingCamp[];
  past: PastCamp[];
}

/** GET /me/medical-centre-camps */
export function useCamps() {
  return useQuery({
    queryKey: ["me", "medical-centre-camps"],
    queryFn: () => apiClient.get<CampsData>("/me/medical-centre-camps"),
  });
}

/** POST /me/medical-centre-camps/:id/register-batch */
export function useRegisterBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/me/medical-centre-camps/${id}/register-batch`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-camps"] }),
  });
}

/**
 * Stored state values. There is deliberately no "completed": the table models a
 * finished camp as a past date plus an outcome summary, and whether it is past
 * is derived from the date server-side rather than typed in.
 */
export type CampState = "planning" | "scheduled" | "running";

export const CAMP_STATE_LABEL: Record<CampState, string> = {
  planning: "Planning",
  scheduled: "Scheduled",
  running: "Running",
};

/** Display label -> stored value, for prefilling the edit form. */
export function campStateValueOf(label: string): CampState {
  const v = label.toLowerCase();
  return v === "running" || v === "scheduled" ? (v as CampState) : "planning";
}

export interface CampInput {
  title: string;
  camp_date: string;
  detail?: string;
  state?: CampState;
  target_count?: number;
  registered_count?: number;
  outcome_summary?: string;
}

/** POST /me/medical-centre-camps */
export function useCreateCamp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CampInput) => apiClient.post<{ id: number }>("/me/medical-centre-camps", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-camps"] }),
  });
}

/** PATCH /me/medical-centre-camps/:id */
export function useUpdateCamp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CampInput> & { id: number }) =>
      apiClient.patch(`/me/medical-centre-camps/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-camps"] }),
  });
}

/** DELETE /me/medical-centre-camps/:id */
export function useDeleteCamp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/medical-centre-camps/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-camps"] }),
  });
}
