import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/notifications/notifications/{me-notifications.controller,notifications.service}.ts
// Notifications are per-user, not per-role — shared across every module
// (student, faculty, ...). Row shape matches the `notifications` Prisma
// model exactly (this is a real, already-built backend feature — the bell
// icon was the only piece missing, not the data model).

export interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  is_pinned: boolean;
  created_at: string;
  type: string | null;
  related_entity_type: string | null;
  related_entity_id: number | null;
}

/** GET /me/notifications/unread-count */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["me", "notifications", "unread-count"],
    queryFn: () => apiClient.get<{ count: number }>("/me/notifications/unread-count"),
    refetchInterval: 60_000,
  });
}

/**
 * GET /me/notifications/panel — the bell dropdown's contents: everything
 * unread, plus anything pinned (pinned rows stay even after being marked
 * read elsewhere, per the "pin so it doesn't disappear" requirement).
 * Polled tighter than the unread-count query since this is what's actually
 * displayed live in the open dropdown.
 */
export function useNotificationsPanel() {
  return useQuery({
    queryKey: ["me", "notifications", "panel"],
    queryFn: () => apiClient.get<NotificationRow[]>("/me/notifications/panel"),
    refetchInterval: 30_000,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["me", "notifications", "panel"] });
    queryClient.invalidateQueries({ queryKey: ["me", "notifications", "unread-count"] });
  };
}

/** PATCH /me/notifications/:id/read */
export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/me/notifications/${id}/read`, {}),
    onSuccess: invalidate,
  });
}

/** PATCH /me/notifications/read-all */
export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => apiClient.patch("/me/notifications/read-all", {}),
    onSuccess: invalidate,
  });
}

/** PATCH /me/notifications/:id/pin */
export function usePinNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/me/notifications/${id}/pin`, {}),
    onSuccess: invalidate,
  });
}

/** PATCH /me/notifications/:id/unpin */
export function useUnpinNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/me/notifications/${id}/unpin`, {}),
    onSuccess: invalidate,
  });
}
