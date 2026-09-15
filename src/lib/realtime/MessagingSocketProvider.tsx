"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSocket, disconnectSocket } from "@/lib/realtime/socket";
import { messagingKeys, upsertMessage, type ConversationSummary, type MessageRow } from "@/modules/messaging/api/conversations";

interface MessagingSocketContextValue {
  isConnected: boolean;
}

const MessagingSocketContext = createContext<MessagingSocketContextValue>({ isConnected: false });

/** Consumers that need to emit/listen call `getSocket()` (`@/lib/realtime/socket`) directly — it's already a stable, module-level singleton, so it doesn't need to be threaded through context/state. This hook only exposes the connection status. */
export function useMessagingSocket(): MessagingSocketContextValue {
  return useContext(MessagingSocketContext);
}

interface MessageNewPayload {
  message: MessageRow;
}
interface MessageReadPayload {
  conversationId: number;
  upToMessageId: number;
  readByUserId: number;
  readAt: string;
}
interface MessageEditedPayload {
  conversationId: number;
  messageId: number;
  body: string;
  editedAt: string;
}
interface MessageDeletedPayload {
  conversationId: number;
  messageId: number;
  deletedAt: string;
}

/**
 * Connected app-wide (mounted once, alongside AuthProvider/QueryProvider),
 * not scoped to the /messages page — the sidebar's unread-messages badge
 * must update in real time no matter which page the user is actually on,
 * the same "always on" property the notification bell's polling already
 * has. Owns every socket->cache wiring in one place so no page/component
 * needs to duplicate event-handler registration.
 */
export function MessagingSocketProvider({ children }: { children: React.ReactNode }) {
  const { status, session } = useAuth();
  const currentUserId = session?.user.id;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    const socket = getSocket();

    function onConnect() {
      setIsConnected(true);
      // An unknown number of events may have been missed while disconnected
      // — a full refetch is the only safe way to reconcile, unlike the
      // targeted setQueryData patches below used for events known to have
      // arrived live.
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations });
      queryClient.invalidateQueries({ queryKey: messagingKeys.unreadCount });
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    // A message the current tab just sent can arrive back over TWO
    // channels — the direct message:ack (fastest, doesn't depend on room
    // membership) and the conversation-room broadcast of message:new
    // (reaches every other participant too) — both funnel through here.
    // upsertMessage() reconciles either against the instant local echo
    // ConversationPane already rendered (matched by clientGeneratedId), so
    // whichever arrives first wins and the second is a no-op replace.
    function applyIncomingMessage(message: MessageRow) {
      const isOwnMessage = message.senderUserId === currentUserId;

      queryClient.setQueryData<MessageRow[]>(messagingKeys.messages(message.conversationId), (existing) =>
        upsertMessage(existing, message),
      );

      let isKnownConversation = true;
      queryClient.setQueryData<ConversationSummary[]>(messagingKeys.conversations, (existing) => {
        if (!existing) return existing;
        if (!existing.some((c) => c.id === message.conversationId)) {
          // Our own first-ever send into a brand-new conversation — it was
          // never inserted into this list (conversations with no messages
          // stay hidden), so there's nothing to patch; a refetch below picks
          // up the real, now-visible entry instead.
          isKnownConversation = false;
          return existing;
        }
        const updated = existing.map((c) => {
          if (c.id !== message.conversationId) return c;
          // A brand-new conversation's first message is already reflected
          // (lastMessage + a freshly-computed unreadCount) by the
          // conversation:new push that always arrives just before this one
          // for that case — skip re-applying so it isn't double-counted.
          if (c.lastMessage?.id === message.id) return c;
          return {
            ...c,
            lastMessage: { id: message.id, body: message.body, isDeleted: false, senderUserId: message.senderUserId, createdAt: message.createdAt },
            lastMessageAt: message.createdAt,
            unreadCount: isOwnMessage ? c.unreadCount : c.unreadCount + 1,
          };
        });
        // Bump the just-updated conversation to the top, matching the server's own most-recent-activity sort.
        const [match] = updated.filter((c) => c.id === message.conversationId);
        return match ? [match, ...updated.filter((c) => c.id !== message.conversationId)] : updated;
      });
      if (!isKnownConversation) queryClient.invalidateQueries({ queryKey: messagingKeys.conversations });
      if (!isOwnMessage) queryClient.invalidateQueries({ queryKey: messagingKeys.unreadCount });
    }

    function onMessageNew({ message }: MessageNewPayload) {
      applyIncomingMessage(message);
    }

    function onMessageAck({ message }: { clientGeneratedId?: string; message: MessageRow }) {
      applyIncomingMessage(message);
    }

    function onMessageRead({ conversationId, upToMessageId, readByUserId }: MessageReadPayload) {
      queryClient.setQueryData<MessageRow[]>(messagingKeys.messages(conversationId), (existing) =>
        existing?.map((m) => (m.id <= upToMessageId ? { ...m, status: "read" as const } : m)),
      );
      // The current user is the one who just read up through here — clear
      // the recents-list badge for this conversation. (When it's the PEER
      // who read up to here instead, this event only advances the sender's
      // own tick icons via the messages-cache update above; the recents
      // list's unread count is about what's unread for *me*, unaffected.)
      if (readByUserId === currentUserId) {
        queryClient.setQueryData<ConversationSummary[]>(messagingKeys.conversations, (existing) =>
          existing?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
        queryClient.invalidateQueries({ queryKey: messagingKeys.unreadCount });
      }
    }

    function onMessageEdited({ conversationId, messageId, body }: MessageEditedPayload) {
      queryClient.setQueryData<MessageRow[]>(messagingKeys.messages(conversationId), (existing) =>
        existing?.map((m) => (m.id === messageId ? { ...m, body, isEdited: true } : m)),
      );
    }

    function onMessageDeleted({ conversationId, messageId }: MessageDeletedPayload) {
      queryClient.setQueryData<MessageRow[]>(messagingKeys.messages(conversationId), (existing) =>
        existing?.map((m) => (m.id === messageId ? { ...m, body: null, isDeleted: true } : m)),
      );
    }

    function onConversationNew({ conversation }: { conversation: ConversationSummary }) {
      queryClient.setQueryData<ConversationSummary[]>(messagingKeys.conversations, (existing) => {
        if (!existing) return [conversation];
        if (existing.some((c) => c.id === conversation.id)) return existing;
        return [conversation, ...existing];
      });
      queryClient.invalidateQueries({ queryKey: messagingKeys.unreadCount });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onMessageNew);
    socket.on("message:ack", onMessageAck);
    socket.on("message:read", onMessageRead);
    socket.on("message:edited", onMessageEdited);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("conversation:new", onConversationNew);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onMessageNew);
      socket.off("message:ack", onMessageAck);
      socket.off("message:read", onMessageRead);
      socket.off("message:edited", onMessageEdited);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("conversation:new", onConversationNew);
      disconnectSocket();
      setIsConnected(false);
    };
  }, [status, queryClient, currentUserId]);

  return <MessagingSocketContext.Provider value={{ isConnected }}>{children}</MessagingSocketContext.Provider>;
}
