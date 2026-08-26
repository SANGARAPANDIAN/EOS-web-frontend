import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/notifications/coe-broadcasts/ — "Portal" delivery is real:
// publishing fans out into the same `notifications` table the whole app's
// in-app inbox already reads from. send_email/send_sms are stored as what
// the COE asked for and disclosed as such here — no email/SMS-sending
// integration exists anywhere in this backend, so neither is ever actually
// dispatched.

export type BroadcastCategory =
  | "announcement_new"
  | "exam_timetable_updated"
  | "hall_ticket_issued"
  | "revaluation_status_updated"
  | "exam_result_published"
  | "invigilation_duty_assigned"
  | "fee_due_reminder";

export const BROADCAST_CATEGORY_OPTIONS: { value: BroadcastCategory; label: string }[] = [
  { value: "announcement_new", label: "Exam announcement" },
  { value: "exam_timetable_updated", label: "Timetable" },
  { value: "hall_ticket_issued", label: "Hall tickets" },
  { value: "revaluation_status_updated", label: "Revaluation" },
  { value: "exam_result_published", label: "Results" },
  { value: "invigilation_duty_assigned", label: "Invigilation" },
  { value: "fee_due_reminder", label: "Exam fee" },
];

export type BroadcastAudience = "all_students" | "final_year_students" | "faculty" | "hods";

export const BROADCAST_AUDIENCE_OPTIONS: { value: BroadcastAudience; label: string }[] = [
  { value: "all_students", label: "All students" },
  { value: "final_year_students", label: "Final year students" },
  { value: "faculty", label: "Faculty" },
  { value: "hods", label: "HoDs" },
];

export type BroadcastStatus = "draft" | "scheduled" | "published";

export interface CoeBroadcast {
  id: number;
  title: string;
  category: BroadcastCategory;
  audience: BroadcastAudience;
  send_portal: boolean;
  send_email: boolean;
  send_sms: boolean;
  message: string;
  status: BroadcastStatus;
  scheduled_at: string | null;
  published_at: string | null;
  recipient_count: number;
  created_at: string;
}

export interface CreateBroadcastInput {
  title: string;
  category: BroadcastCategory;
  audience: BroadcastAudience;
  send_portal: boolean;
  send_email: boolean;
  send_sms: boolean;
  message: string;
  /** Omit to publish immediately; provide a future ISO timestamp to schedule. */
  scheduled_at?: string;
}

export function useCoeBroadcasts(filters: { category?: BroadcastCategory | null }) {
  return useQuery({
    queryKey: ["coe", "broadcasts", filters.category ?? "all"],
    queryFn: () => apiClient.get<CoeBroadcast[]>("/coe-broadcasts", { category: filters.category ?? undefined }),
  });
}

export function useCreateCoeBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBroadcastInput) => apiClient.post<CoeBroadcast>("/coe-broadcasts", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "broadcasts"] }),
  });
}
