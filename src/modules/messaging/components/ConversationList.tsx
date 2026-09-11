"use client";

import { useMemo, useState } from "react";
import { Avatar, EmptyState, SearchBar } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useConversations, useCreateConversation, type ConversationSummary } from "@/modules/messaging/api/conversations";
import { useMessagingUserSearch } from "@/modules/messaging/api/search";
import { formatChatTimestamp } from "@/modules/messaging/utils/formatting";

/**
 * Last-message preview line. While unread, this deliberately does NOT reveal
 * the message body — only that new messages exist and how many — so the
 * content is never visible from the list itself; opening the conversation
 * (which is also what clears unreadCount) is the only way to actually read
 * it. Once read, it falls back to a normal last-message preview.
 */
function previewText(conversation: ConversationSummary, currentUserId: number): { text: string; unread: boolean; muted: boolean } {
  if (conversation.unreadCount > 0) {
    const text = conversation.unreadCount === 1 ? "New message" : `${conversation.unreadCount} new messages`;
    return { text, unread: true, muted: false };
  }
  const last = conversation.lastMessage;
  if (!last) return { text: "No messages yet", unread: false, muted: true };
  if (last.isDeleted) return { text: "This message was deleted", unread: false, muted: true };
  const prefix = last.senderUserId === currentUserId ? "You: " : "";
  return { text: `${prefix}${last.body ?? ""}`, unread: false, muted: false };
}

function ConversationRow({
  conversation,
  currentUserId,
  active,
  onSelect,
}: {
  conversation: ConversationSummary;
  currentUserId: number;
  active: boolean;
  onSelect: () => void;
}) {
  const preview = previewText(conversation, currentUserId);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex w-full items-center gap-3 border-b border-divider py-3 pr-3.5 pl-3 text-left transition-colors",
        active ? "bg-accent-50" : "hover:bg-surface-tint",
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden />}
      <Avatar name={conversation.otherUser.name} size={44} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-[14px]", conversation.unreadCount > 0 ? "font-bold text-ink" : "font-semibold text-ink-soft")}>
            {conversation.otherUser.name}
          </span>
          {conversation.lastMessageAt && (
            <span className={cn("shrink-0 text-[11px]", conversation.unreadCount > 0 ? "font-semibold text-primary" : "text-subtle")}>
              {formatChatTimestamp(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-[12.5px]",
              preview.unread ? "font-semibold text-primary" : preview.muted ? "italic text-subtle" : "text-muted",
            )}
          >
            {preview.text}
          </span>
          {conversation.unreadCount > 0 && (
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-white">
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ConversationList({
  currentUserId,
  activeConversationId,
  onSelectConversation,
}: {
  currentUserId: number;
  activeConversationId: number | null;
  onSelectConversation: (conversationId: number) => void;
}) {
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebouncedValue(term, 300);
  const conversations = useConversations();
  const createConversation = useCreateConversation();

  const filteredConversations = useMemo(() => {
    const rows = conversations.data ?? [];
    if (!term.trim()) return rows;
    const needle = term.trim().toLowerCase();
    return rows.filter((c) => c.otherUser.name.toLowerCase().includes(needle));
  }, [conversations.data, term]);

  // Only searches for *new* people once the term looks like a real search,
  // matching this app's existing search-trigger-length convention.
  const peopleSearch = useMessagingUserSearch(term.trim().length >= 2 ? debouncedTerm : null);
  const existingUserIds = new Set((conversations.data ?? []).map((c) => c.otherUser.userId));
  const newPeople = (peopleSearch.data ?? []).filter((p) => !existingUserIds.has(p.userId));

  async function handleStartChat(otherUserId: number) {
    const conversation = await createConversation.mutateAsync(otherUserId);
    setTerm("");
    onSelectConversation(conversation.id);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-default px-3.5 pt-3.5 pb-3">
        <h1 className="mb-2.5 text-[16px] font-extrabold text-ink">Messages</h1>
        <SearchBar className="max-w-none" placeholder="Search people to message" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.isLoading ? (
          <EmptyState loading size={26} className="py-14" />
        ) : filteredConversations.length === 0 && newPeople.length === 0 ? (
          <EmptyState message={term.trim() ? "No matches." : "No conversations yet. Search above to start one."} className="py-14 text-center" />
        ) : (
          <>
            {filteredConversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                currentUserId={currentUserId}
                active={c.id === activeConversationId}
                onSelect={() => onSelectConversation(c.id)}
              />
            ))}
            {newPeople.length > 0 && (
              <div className="border-t border-divider">
                <div className="px-3.5 pt-3 pb-1 text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Start new chat</div>
                {newPeople.map((p) => (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => void handleStartChat(p.userId)}
                    disabled={createConversation.isPending}
                    className="flex w-full items-center gap-3 border-b border-divider px-3.5 py-2.5 text-left transition-colors hover:bg-surface-tint disabled:opacity-60"
                  >
                    <Avatar name={p.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-ink">{p.name}</div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted">{p.roleLabel}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
