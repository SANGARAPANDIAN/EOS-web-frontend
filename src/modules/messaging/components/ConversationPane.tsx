"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, Icon, IconButton, MessageLoading, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { getSocket } from "@/lib/realtime/socket";
import { messagingKeys, upsertMessage, useConversations, useMessages, type MessageRow } from "@/modules/messaging/api/conversations";
import { formatBubbleTime, formatDateDivider } from "@/modules/messaging/utils/formatting";

const TYPING_STOP_DELAY_MS = 3000;

function DateDivider({ iso }: { iso: string }) {
  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full border border-border-default bg-surface px-3 py-1 text-[11px] font-bold text-subtle">{formatDateDivider(iso)}</span>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: MessageRow; isOwn: boolean }) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[72%] rounded-[14px] px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
          isOwn ? "rounded-br-[4px] bg-primary text-white" : "rounded-bl-[4px] border border-border-default bg-surface text-ink",
        )}
      >
        {message.isDeleted ? (
          <span className={cn("italic", isOwn ? "text-white/70" : "text-subtle")}>This message was deleted</span>
        ) : (
          message.body
        )}
        <div className={cn("mt-1 text-[10.5px]", isOwn ? "text-right text-white/70" : "text-subtle")}>{formatBubbleTime(message.createdAt)}</div>
      </div>
    </div>
  );
}

export function ConversationPane({ conversationId, currentUserId, onBack }: { conversationId: number; currentUserId: number; onBack?: () => void }) {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const conversations = useConversations();
  const messages = useMessages(conversationId);
  const conversation = conversations.data?.find((c) => c.id === conversationId);

  const [draft, setDraft] = useState("");
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingActiveRef = useRef(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const markedReadForRef = useRef<number | null>(null);
  const lastAttemptedDraftRef = useRef("");
  const lastClientGeneratedIdRef = useRef<string | null>(null);

  // The composer clears optimistically on send — without this, a rejected
  // send (blocked, rate-limited, or a transient failure) fails completely
  // silently from the user's point of view. Also drops the instant local
  // echo handleSend rendered, since it was never actually persisted.
  useEffect(() => {
    function onError(payload: { code: string; message: string; clientGeneratedId?: string }) {
      setSendError(payload.message);
      setDraft((current) => current || lastAttemptedDraftRef.current);
      if (payload.clientGeneratedId && payload.clientGeneratedId === lastClientGeneratedIdRef.current) {
        queryClient.setQueryData<MessageRow[]>(messagingKeys.messages(conversationId), (existing) =>
          existing?.filter((m) => m.clientGeneratedId !== payload.clientGeneratedId),
        );
      }
    }
    socket.on("error", onError);
    return () => {
      socket.off("error", onError);
    };
  }, [socket, conversationId, queryClient]);

  // Join the room explicitly (covers a conversation created mid-session,
  // after the socket's connect-time room enumeration already ran) and
  // listen for this specific conversation's typing updates only.
  useEffect(() => {
    socket.emit("conversation:join", { conversationId });

    function onTypingUpdate(payload: { conversationId: number; userId: number; isTyping: boolean }) {
      if (payload.conversationId !== conversationId || payload.userId === currentUserId) return;
      setIsPeerTyping(payload.isTyping);
    }
    socket.on("typing:update", onTypingUpdate);
    return () => {
      socket.off("typing:update", onTypingUpdate);
    };
  }, [socket, conversationId, currentUserId]);

  // Mark read once, when the newest message changes and it isn't our own.
  useEffect(() => {
    if (!messages.data?.length) return;
    const last = messages.data[messages.data.length - 1];
    if (last.senderUserId === currentUserId) return;
    if (markedReadForRef.current === last.id) return;
    markedReadForRef.current = last.id;
    socket.emit("message:read", { conversationId, upToMessageId: last.id });
  }, [socket, messages.data, conversationId, currentUserId]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  function handleDraftChange(value: string) {
    setDraft(value);
    // One typing:start per active burst, not one per keystroke — the peer
    // is already showing "typing…" from the first one, so re-emitting on
    // every subsequent character just adds socket traffic for no visible
    // change on their end.
    if (!isTypingActiveRef.current) {
      isTypingActiveRef.current = true;
      socket.emit("typing:start", { conversationId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingActiveRef.current = false;
      socket.emit("typing:stop", { conversationId });
    }, TYPING_STOP_DELAY_MS);
  }

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setSendError(null);
    lastAttemptedDraftRef.current = body;
    const clientGeneratedId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    lastClientGeneratedIdRef.current = clientGeneratedId;

    // Instant local echo — renders the bubble before any network round trip,
    // then gets reconciled in place (same clientGeneratedId) once message:ack
    // or the room's message:new broadcast confirms it, whichever lands first.
    queryClient.setQueryData<MessageRow[]>(messagingKeys.messages(conversationId), (existing) =>
      upsertMessage(existing, {
        id: -Date.now(),
        conversationId,
        senderUserId: currentUserId,
        body,
        isDeleted: false,
        isEdited: false,
        status: "sent",
        createdAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
        clientGeneratedId,
      }),
    );

    socket.emit("message:send", { conversationId, body, clientGeneratedId });
    setDraft("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingActiveRef.current = false;
    socket.emit("typing:stop", { conversationId });
  }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const messageRows = useMemo(
    () =>
      (messages.data ?? []).reduce<{ message: MessageRow; showDivider: boolean }[]>((rows, message) => {
        const dateKey = new Date(message.createdAt).toDateString();
        const previousDateKey = rows.length > 0 ? new Date(rows[rows.length - 1].message.createdAt).toDateString() : "";
        return [...rows, { message, showDivider: dateKey !== previousDateKey }];
      }, []),
    [messages.data],
  );

  // Instagram-style: no per-message ticks — a single "Seen" line appears
  // once, under the very last message, only once the peer has read it.
  const lastMessage = messages.data?.[messages.data.length - 1];
  const showSeen = lastMessage != null && lastMessage.senderUserId === currentUserId && lastMessage.status === "read" && !lastMessage.isDeleted;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
        {onBack && (
          <IconButton icon="arrow_back" size={34} iconSize={18} className="lg:hidden" onClick={onBack} />
        )}
        {conversation && (
          <>
            <Avatar name={conversation.otherUser.name} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold text-ink">{conversation.otherUser.name}</div>
              {isPeerTyping ? (
                <div className="truncate text-[11.5px] font-semibold text-primary">typing…</div>
              ) : (
                <div className="truncate text-[11.5px] text-muted">{conversation.otherUser.roleLabel}</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-muted px-4 py-3">
        {messages.isLoading ? (
          <div className="py-10 text-center text-[13px] text-subtle">Loading…</div>
        ) : (
          <div className="flex flex-col gap-2">
            {messageRows.map(({ message, showDivider }) => (
              <div key={message.id}>
                {showDivider && <DateDivider iso={message.createdAt} />}
                <MessageBubble message={message} isOwn={message.senderUserId === currentUserId} />
              </div>
            ))}
            {isPeerTyping && (
              <div className="flex justify-start">
                <div className="rounded-[14px] rounded-bl-[4px] border border-border-default bg-surface px-3.5 py-2.5 text-muted">
                  <MessageLoading size={20} />
                </div>
              </div>
            )}
            {showSeen && <div className="pr-1 text-right text-[11px] text-subtle">Seen</div>}
            <div ref={scrollAnchorRef} />
          </div>
        )}
      </div>

      {sendError && (
        <div className="flex items-center justify-between gap-2 border-t border-danger-border bg-danger-bg px-4 py-2 text-[12.5px] font-semibold text-danger-fg">
          <span>{sendError}</span>
          <button type="button" onClick={() => setSendError(null)} className="shrink-0 underline">
            Dismiss
          </button>
        </div>
      )}
      <div className="flex items-end gap-2.5 border-t border-border-default p-3">
        <Textarea
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          aria-label="Send"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors enabled:hover:bg-primary-dark disabled:bg-disabled disabled:cursor-not-allowed"
        >
          <Icon name="send" size={18} />
        </button>
      </div>
    </div>
  );
}
