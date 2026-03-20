import { useState } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { ConversationList } from "@/components/chat/ConversationList";
import { ConversationThread } from "@/components/chat/ConversationThread";
import { ChatAttachmentPanel } from "@/components/chat/ChatAttachmentPanel";
import { useMessagesRealtime } from "@/hooks/useMessagesRealtime";

export default function MessagesPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  useMessagesRealtime(conversationId);

  return (
    <AppPageShell title="Messages">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ConversationList onOpen={setConversationId} />
        <ConversationThread conversationId={conversationId} />
        <ChatAttachmentPanel conversationId={conversationId} />
      </div>
    </AppPageShell>
  );
}
