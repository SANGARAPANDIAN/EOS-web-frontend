import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/messaging/*.controller.ts (see
// messaging.query.md for the schema this is built against). Sending a
// message, typing, and read-receipts go over the socket directly (see
// src/lib/realtime/) — these hooks cover everything a socket shouldn't own:
// initial page load, pagination, and low-frequency edit/delete mutations.
// No refetchInterval anywhere here — the socket is the live-update path;
// polling would be redundant once it's connected.

export const messagingKeys = {
  unreadCount: ["messaging", "unread-count"] as const,
  conversations: ["messaging", "conversations"] as const,
  /** Cache-only (never fetched on its own) — seeded by useCreateConversation so a brand-new conversation's header data is available instantly, without waiting on a recents-list refetch that won't include it until a first message exists (see useConversations' doc comment). */
  conversation: (conversationId: number) => ["messaging", "conversation", conversationId] as const,
  messages: (conversationId: number) => ["messaging", "conversations", conversationId, "messages"] as const,
};

export interface ConversationParticipant {
  userId: number;
  name: string;
  roleLabel: string;
}

export interface ConversationLastMessage {
  id: number;
  body: string | null;
  isDeleted: boolean;
  senderUserId: number;
  createdAt: string;
}

export interface ConversationSummary {
  id: number;
  otherUser: ConversationParticipant;
  lastMessage: ConversationLastMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageRow {
  id: number;
  conversationId: number;
  senderUserId: number;
  body: string | null;
  isDeleted: boolean;
  isEdited: boolean;
  status: "sent" | "delivered" | "read";
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  /** Only ever set on a row this exact tab just sent — lets an instant local echo be reconciled with the server-confirmed row once it comes back (over message:ack or the message:new room broadcast, whichever arrives first). */
  clientGeneratedId?: string | null;
}

/**
 * Inserts or replaces a message by identity — same clientGeneratedId (an
 * optimistic local echo meeting its server-confirmed counterpart) or same
 * id (e.g. a duplicate broadcast). Used everywhere a message can arrive
 * from more than one source for the same logical send, so the list never
 * shows a row twice.
 */
export function upsertMessage(existing: MessageRow[] | undefined, message: MessageRow): MessageRow[] {
  if (!existing) return [message];
  const index = existing.findIndex(
    (m) => m.id === message.id || (message.clientGeneratedId != null && m.clientGeneratedId === message.clientGeneratedId),
  );
  if (index === -1) return [...existing, message];
  const copy = existing.slice();
  copy[index] = message;
  return copy;
}

/** GET /me/messaging/unread-count */
export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: messagingKeys.unreadCount,
    queryFn: () => apiClient.get<{ count: number }>("/me/messaging/unread-count"),
  });
}

/** GET /me/messaging/conversations — recents list, server-sorted by most-recent-activity. */
export function useConversations() {
  return useQuery({
    queryKey: messagingKeys.conversations,
    queryFn: () => apiClient.get<ConversationSummary[]>("/me/messaging/conversations"),
  });
}

/**
 * POST /me/messaging/conversations — get-or-create a 1:1 conversation; the
 * backend enforces the student-to-student rule here. Deliberately does not
 * touch the conversations-LIST cache — a conversation with no messages yet
 * stays out of that list entirely (both here and server-side), only
 * appearing once the first message is actually sent. It does seed the
 * per-conversation cache-only entry above, though: the response already
 * carries the full otherUser name/roleLabel, so ConversationPane can render
 * the header instantly on the very first render instead of coming up blank
 * until a message is sent and the list happens to include this row.
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: number) => apiClient.post<ConversationSummary>("/me/messaging/conversations", { otherUserId }),
    onSuccess: (conversation) => {
      queryClient.setQueryData(messagingKeys.conversation(conversation.id), conversation);
    },
  });
}

/** GET /me/messaging/conversations/:id/messages — history, cursor-paginated by message id (oldest-first once returned). */
export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: messagingKeys.messages(conversationId ?? -1),
    queryFn: () => apiClient.get<MessageRow[]>(`/me/messaging/conversations/${conversationId}/messages`),
    enabled: conversationId !== null,
  });
}

/** PATCH /me/messaging/messages/:id */
export function useEditMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) =>
      apiClient.patch<{ id: number; conversationId: number; body: string; editedAt: string }>(`/me/messaging/messages/${id}`, { body }),
    onSuccess: (updated) => queryClient.invalidateQueries({ queryKey: messagingKeys.messages(updated.conversationId) }),
  });
}

/** DELETE /me/messaging/messages/:id — soft delete-for-everyone. */
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number; conversationId: number; deletedAt: string }>(`/me/messaging/messages/${id}`),
    onSuccess: (deleted) => queryClient.invalidateQueries({ queryKey: messagingKeys.messages(deleted.conversationId) }),
  });
}
