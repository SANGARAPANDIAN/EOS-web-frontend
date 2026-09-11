"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { ConversationList } from "@/modules/messaging/components/ConversationList";
import { ConversationPane } from "@/modules/messaging/components/ConversationPane";

function MessagesPageContent() {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get("c") ? Number(searchParams.get("c")) : null;

  if (!session) return null;

  function selectConversation(conversationId: number) {
    router.replace(`/messages?c=${conversationId}`);
  }
  function clearConversation() {
    router.replace("/messages");
  }

  return (
    <div className="grid h-full grid-cols-1 gap-0 overflow-hidden rounded-[14px] border border-border-default bg-surface lg:grid-cols-[360px_1fr]">
      <div className={activeConversationId ? "hidden min-h-0 border-border-default lg:block lg:border-r" : "block min-h-0 border-border-default lg:border-r"}>
        <ConversationList currentUserId={session.user.id} activeConversationId={activeConversationId} onSelectConversation={selectConversation} />
      </div>
      <div className={activeConversationId ? "block min-h-0" : "hidden min-h-0 lg:flex"}>
        {activeConversationId ? (
          <ConversationPane conversationId={activeConversationId} currentUserId={session.user.id} onBack={clearConversation} />
        ) : (
          <div className="hidden h-full w-full flex-col items-center justify-center gap-2 lg:flex">
            <Icon name="chat" size={40} className="text-subtle" />
            <div className="text-[13.5px] text-subtle">Select a conversation to start messaging</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesPageContent />
    </Suspense>
  );
}
