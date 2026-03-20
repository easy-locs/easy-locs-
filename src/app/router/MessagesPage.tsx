import { useState, useCallback } from "react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ConversationThread } from "@/components/chat/ConversationThread";
import { ConversationCallHistory } from "@/components/chat/ConversationCallHistory";
import { WhatsAppStyleConversationLayout } from "@/components/chat/WhatsAppStyleConversationLayout";
import { useMessagesRealtime } from "@/hooks/useMessagesRealtime";
import { useChatStore } from "@/stores/chatStore";
import { useCallStore } from "@/stores/callStore";
import { ArrowLeft, MessageCircle, Phone as PhoneIcon } from "lucide-react";

type Tab = "chats" | "calls";

export default function MessagesPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chats");
  useMessagesRealtime(conversationId);

  const conversation = useChatStore((s) =>
    conversationId ? s.getConversationById(conversationId) : null
  );

  const handleBack = useCallback(() => setConversationId(null), []);

  // Mobile: show thread when conversation selected, list otherwise
  const showThread = !!conversationId;

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Top bar */}
      {!showThread && (
        <div className="shrink-0">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h1 className="text-xl font-bold text-foreground">Chats</h1>
          </div>

          {/* Tabs */}
          <div className="flex px-4 gap-1 pb-2">
            {(["chats", "calls"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
                  tab === t
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {t === "chats" ? (
                    <MessageCircle className="h-3.5 w-3.5" />
                  ) : (
                    <PhoneIcon className="h-3.5 w-3.5" />
                  )}
                  {t === "chats" ? "Chats" : "Calls"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0">
        {!showThread ? (
          tab === "chats" ? (
            <ConversationList onOpen={setConversationId} activeId={conversationId} />
          ) : (
            <ConversationCallHistory conversationId={null} />
          )
        ) : (
          <WhatsAppStyleConversationLayout
            title={conversation?.title ?? "Chat"}
            subtitle="online"
            onCall={() => {}}
          >
            {/* Back button for mobile */}
            <div className="absolute top-0 left-0 z-10">
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent/10 active:scale-[0.95] transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground/70" />
              </button>
            </div>
            <ConversationThread conversationId={conversationId} />
          </WhatsAppStyleConversationLayout>
        )}
      </div>
    </div>
  );
}
