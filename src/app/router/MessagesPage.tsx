import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import {
  getConversationMessages,
  listMyConversations,
} from "@/lib/chat/conversationService";
import { sendTextMessage } from "@/lib/chat/messageService";
import { AddContactByEmail } from "@/components/chat/AddContactByEmail";
import { ConversationListPanel } from "@/components/chat/ConversationListPanel";
import { ChatThreadPanel } from "@/components/chat/ChatThreadPanel";
// Call system: CallProvider is the single authoritative engine
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { useConversationsRealtime } from "@/hooks/useConversationsRealtime";
import { getConversationPeer } from "@/lib/chat/conversationUi";
import { Plus, X } from "lucide-react";
import type { ConversationRow, ChatMessageRow } from "@/lib/types/comms";

type OrbitProfile = {
  orbitId: string;
  email: string | null;
  displayName: string | null;
};

type PeerInfo = {
  orbit_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url?: string | null;
};

export default function MessagesPage() {
  const [myOrbit, setMyOrbit] = useState<OrbitProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);

  // useCallRealtime removed — handled globally by CallOverlayV2

  const reloadConversations = useCallback(async () => {
    try {
      const rows = await listMyConversations();
      setConversations(rows);
    } catch (err) {
      console.error("reloadConversations error", err);
    }
  }, []);

  useConversationsRealtime(useCallback(() => {
    void reloadConversations();
  }, [reloadConversations]));

  useEffect(() => {
    void (async () => {
      const profile = await ensureOrbitProfile();
      if (profile) {
        setMyOrbit({
          orbitId: (profile as any).orbit_id,
          email: (profile as any).email ?? null,
          displayName: (profile as any).display_name ?? null,
        });
      }
      await reloadConversations();
    })();
  }, [reloadConversations]);

  // When conversation changes, load messages and resolve peer
  useEffect(() => {
    if (!conversation?.id || !myOrbit?.orbitId) return;
    void (async () => {
      const rows = await getConversationMessages(conversation.id);
      setMessages(rows);
      const p = getConversationPeer(conversation, myOrbit.orbitId);
      setPeer(
        p
          ? { orbit_id: p.orbitId, email: p.email ?? null, display_name: p.displayName ?? null }
          : null
      );
    })();
  }, [conversation?.id, myOrbit?.orbitId]);

  const handleRealtimeMessage = useCallback((row: any) => {
    setMessages((prev) => {
      if (prev.some((x: any) => x.id === row.id)) return prev;
      return [...prev, row];
    });
  }, []);

  useConversationRealtime({
    conversationId: conversation?.id ?? null,
    onMessage: handleRealtimeMessage,
  });

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [messages]
  );

  const handleOpenConversation = async (conv: any) => {
    setConversation(conv);
    setShowAddContact(false);
    const rows = await getConversationMessages(conv.id);
    setMessages(rows);
    if (myOrbit?.orbitId) {
      const p = getConversationPeer(conv, myOrbit.orbitId);
      setPeer(
        p
          ? { orbit_id: p.orbitId, email: p.email ?? null, display_name: p.displayName ?? null }
          : null
      );
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!conversation || !peer || !myOrbit) return;
    const msg = await sendTextMessage({
      conversationId: conversation.id,
      senderOrbitId: myOrbit.orbitId,
      receiverOrbitId: peer.orbit_id,
      body: text,
    });
    setMessages((prev) => {
      if (prev.some((x: any) => x.id === msg.id)) return prev;
      return [...prev, msg];
    });
    await reloadConversations();
  };

  const handleBack = useCallback(() => {
    setConversation(null);
    setPeer(null);
    setMessages([]);
  }, []);

  const showThread = !!conversation;

  return (
    <div className="flex flex-col h-[100dvh] bg-background">

      {!showThread ? (
        <>
          {/* List header */}
          <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
            <button
              onClick={() => setShowAddContact((v) => !v)}
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent/10 active:scale-[0.95] transition-all text-foreground/60"
            >
              {showAddContact ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>

          {showAddContact && (
            <div className="px-4 pb-3">
              <AddContactByEmail
                onConversationReady={(conv, foundPeer) => {
                  setConversation(conv);
                  setPeer(foundPeer);
                  setMessages([]);
                  setShowAddContact(false);
                  void reloadConversations();
                }}
              />
            </div>
          )}

          {/* Conversation list */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ConversationListPanel
              conversations={conversations}
              activeConversationId={conversation?.id}
              myOrbitId={myOrbit?.orbitId ?? ""}
              onOpen={(conv) => void handleOpenConversation(conv)}
            />
          </div>
        </>
      ) : (
        <ChatThreadPanel
          conversation={conversation}
          peer={peer}
          messages={sortedMessages}
          myOrbitId={myOrbit?.orbitId ?? ""}
          onSendMessage={handleSendMessage}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
