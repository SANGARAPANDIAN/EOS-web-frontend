import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/secretary-portal/settings/*.
// {controller,service}.ts — new module built this session (real
// `user_preferences` table, added via the Secretary module completion
// migration). Self-scoped by the caller's own JWT user id — any
// authenticated role, not institution-wide.

export interface UserPreferences {
  user_id: number;
  daily_attendance_digest: boolean;
  sop_escalation_alerts: boolean;
  auto_circulate_mom: boolean;
  compact_tables: boolean;
  updated_at: string | null;
}

export function useMyPreferences() {
  return useQuery({
    queryKey: ["secretary", "preferences"],
    queryFn: () => apiClient.get<UserPreferences>("/me/preferences"),
  });
}

export function useUpdateMyPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<UserPreferences, "daily_attendance_digest" | "sop_escalation_alerts" | "auto_circulate_mom" | "compact_tables">>) => apiClient.patch("/me/preferences", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "preferences"] }),
  });
}
