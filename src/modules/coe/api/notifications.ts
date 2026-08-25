import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Paginated } from "@/modules/coe/api/shared";

// src/modules/notifications/notifications-rest/ — new REST surface over the
// existing `notifications` table, separate from the pre-existing
// WebSocket-only gateway (which this does not touch or replace). Any
// authenticated role, always scoped server-side to the caller's own rows.

export type NotificationType = string;

export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: NotificationType | null;
  related_entity_type: string | null;
  related_entity_id: number | null;
  is_pinned: boolean;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["coe", "notifications"],
    queryFn: () => apiClient.get<Paginated<AppNotification>>("/notifications", { limit: 100 }),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<AppNotification>(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch<{ updated: number }>("/notifications/mark-all-read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "notifications"] }),
  });
}
