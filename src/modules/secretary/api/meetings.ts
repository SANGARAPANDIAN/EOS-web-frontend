import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/secretary-portal/meetings/*.
// {controller,service}.ts — new module built this session (real
// `department_meetings` + `meeting_action_items` tables, added via the
// Secretary module completion migration). Institution-wide for
// Secretary/Admin/Principal.

export interface ActionItem {
  id: number;
  label: string;
  done: boolean;
}
export interface MeetingRow {
  id: number;
  title: string;
  meeting_at: string;
  venue: string | null;
  invitee_count: number;
  mom_status: "scheduled" | "recorded" | "circulated";
  mom_text: string | null;
  created_at: string;
  department: { id: number; name: string; code: string };
  chair: { id: number; email: string } | null;
  action_items: ActionItem[];
}

export function useMeetings(departmentId: number | undefined) {
  const qs = departmentId !== undefined ? `?department_id=${departmentId}` : "";
  return useQuery({
    queryKey: ["secretary", "meetings", departmentId],
    queryFn: () => apiClient.get<MeetingRow[]>(`/me/department-meetings${qs}`),
  });
}

export interface CreateMeetingInput {
  department_id: number;
  title: string;
  meeting_at: string;
  venue?: string;
  invitee_count?: number;
}
export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeetingInput) => apiClient.post("/me/department-meetings", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "meetings"] }),
  });
}

export function useUpdateMom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mom_text }: { id: number; mom_text: string }) => apiClient.patch(`/me/department-meetings/${id}/mom`, { mom_text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "meetings"] }),
  });
}

export function useCirculateMom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/me/department-meetings/${id}/circulate`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "meetings"] }),
  });
}

export function useToggleActionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, itemId }: { meetingId: number; itemId: number }) => apiClient.patch(`/me/department-meetings/${meetingId}/action-items/${itemId}/toggle`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "meetings"] }),
  });
}
