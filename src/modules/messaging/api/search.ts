import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MessagingSearchResult {
  userId: number;
  name: string;
  roleLabel: string;
}

export interface SuggestedContact extends MessagingSearchResult {
  suggestionLabel: string;
}

/**
 * GET /me/messaging/search — person search to start a new chat. The backend
 * already excludes ineligible results server-side (a student never sees
 * other students here) — this hook passes the query straight through and
 * trusts the response verbatim, no client-side role filtering is added.
 */
export function useMessagingUserSearch(term: string | null) {
  const trimmed = term?.trim() ?? "";
  return useQuery({
    queryKey: ["messaging", "search", trimmed],
    queryFn: () => apiClient.get<MessagingSearchResult[]>("/me/messaging/search", { q: trimmed }),
    enabled: term !== null && trimmed.length >= 2,
  });
}

/** GET /me/messaging/contacts/suggested — a student's class advisor + personal mentor, if set. Empty for every other role. */
export function useSuggestedContacts() {
  return useQuery({
    queryKey: ["messaging", "contacts", "suggested"],
    queryFn: () => apiClient.get<SuggestedContact[]>("/me/messaging/contacts/suggested"),
  });
}
