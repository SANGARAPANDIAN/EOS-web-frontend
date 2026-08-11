import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/** Notifications are per-user, not per-role — shared across every module (student, faculty, ...). */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["me", "notifications", "unread-count"],
    queryFn: () => apiClient.get<{ count: number }>("/me/notifications/unread-count"),
    refetchInterval: 60_000,
  });
}
